/**
 * StartingPlots - Civ4-compatible starting plot assignment and normalization
 *
 * Assigns starting locations for all players based on city-site scoring, then
 * runs 9 normalization passes to ensure balanced starts (fresh water, food,
 * production, no bad terrain/features).
 *
 * Called in the Civ4 pipeline LAST:
 *   addBonuses() → assignStartingPlots() → normalization passes
 *
 * Subclasses can override:
 * - normalizeAddExtras() for balanced strategic resource placement
 *
 * References:
 * - Civ4 SDK: CvMapGenerator::assignStartingPlots(), normalizeStartingPlotLocations(),
 *   normalizeAddRiver(), normalizeRemovePeaks(), normalizeAddLakes(),
 *   normalizeRemoveBadFeatures(), normalizeRemoveBadTerrain(),
 *   normalizeAddFoodBonuses(), normalizeAddGoodTerrain(), normalizeAddExtras()
 * - docs/Milestone-9-StartingPlots-Spec.md
 * - docs/MapGen-Rewrite-Plan.md §Milestone 9
 */

import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';
import { BONUS_DEFS } from './BonusGenerator.js';

// ============================================================================
// STARTINGPLOTS CLASS
// ============================================================================

/**
 * Assigns starting locations and normalizes the map for balanced gameplay.
 *
 * Features:
 * - BFC (big fat cross) scoring for city sites
 * - Multi-pass distance relaxation for start placement
 * - 9 normalization passes (river, peaks, lakes, jungle, terrain, food, etc.)
 * - Per-script distance modifiers and normalization disable flags
 *
 * @example
 * const sp = new StartingPlots(width, height, { minStartingDistanceModifier: -20 });
 * const starts = sp.assignStartingPlots(numPlayers, rng, plotTypes, terrain, features, bonuses, rivers, lakes);
 * sp.normalize(starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng);
 */
export class StartingPlots {

  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} [settings={}] - Configuration overrides
   * @param {boolean} [settings.wrapX=true] - Whether map wraps horizontally
   * @param {boolean} [settings.wrapY=false] - Whether map wraps vertically
   * @param {number} [settings.minStartingDistanceModifier=0] - Per-script distance modifier (%)
   * @param {boolean} [settings.skipNormalization=false] - Skip ALL normalization passes
   * @param {boolean} [settings.skipRemovePeaks=false] - Skip peak removal (Archipelago)
   * @param {boolean} [settings.skipRemoveBadTerrain=false] - Skip terrain fix (Highlands)
   * @param {boolean} [settings.skipAddGoodTerrain=false] - Skip terrain improvement (Highlands)
   * @param {boolean} [settings.skipRemoveBadFeatures=false] - Skip jungle removal (Fantasy Realm)
   * @param {Function|null} [settings.findStartingPlot=null] - Script override: (playerID, plotTypes, terrain, features, bonuses, rivers, lakes) => {x, y}
   * @param {Function|null} [settings.findStartingArea=null] - Script override: (playerID, plotTypes, terrain) => areaID (number, -1 for any)
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.wrapX = settings.wrapX !== false;
    this.wrapY = settings.wrapY || false;

    // Per-script distance modifier (see spec table for values)
    this.minStartingDistanceModifier = settings.minStartingDistanceModifier || 0;

    // Normalization disable flags
    this.skipNormalization = settings.skipNormalization || false;
    this.skipRemovePeaks = settings.skipRemovePeaks || false;
    this.skipRemoveBadTerrain = settings.skipRemoveBadTerrain || false;
    this.skipAddGoodTerrain = settings.skipAddGoodTerrain || false;
    this.skipRemoveBadFeatures = settings.skipRemoveBadFeatures || false;

    // Per-player script override callbacks (CvMapScriptInterface hooks)
    this._scriptFindStartingPlot = settings.findStartingPlot ?? null;
    this._scriptFindStartingArea = settings.findStartingArea ?? null;
  }

  // ==========================================================================
  // MAIN ENTRY POINT
  // ==========================================================================

  /**
   * Assign starting plots for all players.
   *
   * Algorithm:
   * 1. Score every tile using BFC heuristic
   * 2. Sort candidates by score (highest first)
   * 3. Multi-pass assignment with distance relaxation
   *
   * @param {number} numPlayers - Number of players to place
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of bonus IDs
   * @param {Object[]} rivers - 1D array of river objects
   * @param {boolean[]} lakes - 1D array of lake flags
   * @returns {Object[]} Array of { x, y } starting locations
   */
  assignStartingPlots(numPlayers, rng, plotTypes, terrain, features, bonuses, rivers, lakes) {
    // If script provides per-player findStartingPlot, use it
    if (this._scriptFindStartingPlot) {
      const starts = [];
      for (let playerID = 0; playerID < numPlayers; playerID++) {
        const plot = this._scriptFindStartingPlot(playerID, plotTypes, terrain, features, bonuses, rivers, lakes);
        starts.push(plot);
      }
      return starts;
    }

    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // 1. Score every tile
    const scores = this._scoreAllTiles(plotTypes, terrain, features, bonuses, rivers, lakes);

    // 2. If script provides findStartingArea, compute area IDs and constrain per-player
    let areas = null;
    if (this._scriptFindStartingArea) {
      areas = this._computeAreas(plotTypes);
    }

    // 3. Build sorted candidate list (highest score first)
    const candidates = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (scores[idx] <= -900) continue;  // skip invalid tiles
        candidates.push({ x, y, score: scores[idx] });
      }
    }
    candidates.sort((a, b) => b.score - a.score);

    // 4. Calculate minimum starting distance
    const baseRange = this._startingPlotRange(numPlayers);
    let minDist = baseRange;

    // 5. Multi-pass assignment with relaxing distance
    const starts = [];
    const maxPasses = 50;  // Civ4 uses up to 50 relaxation passes

    for (let pass = 0; pass < maxPasses && starts.length < numPlayers; pass++) {
      for (const candidate of candidates) {
        if (starts.length >= numPlayers) break;

        // Already selected?
        if (starts.some(s => s.x === candidate.x && s.y === candidate.y)) continue;

        // If findStartingArea is provided, check area constraint for this player
        if (this._scriptFindStartingArea && areas) {
          const playerID = starts.length;
          const targetArea = this._scriptFindStartingArea(playerID, plotTypes, terrain);
          if (targetArea >= 0) {
            const candidateArea = areas[candidate.y * W + candidate.x];
            if (candidateArea !== targetArea) continue;
          }
        }

        // Distance check against all existing starts
        let tooClose = false;
        for (const existing of starts) {
          const dist = this._wrappedDistance(candidate.x, candidate.y, existing.x, existing.y);
          if (dist < minDist) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          starts.push({ x: candidate.x, y: candidate.y });
        }
      }

      // Relax distance each pass
      minDist = Math.max(1, minDist - 1);
    }

    return starts;
  }

  // ==========================================================================
  // DISTANCE CALCULATION
  // ==========================================================================

  /**
   * Calculate minimum starting distance based on map area and player count.
   *
   * @param {number} numPlayers - Number of players
   * @returns {number} Minimum distance between starting plots
   */
  _startingPlotRange(numPlayers) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // Civ4 formula: based on map area and player count
    const mapArea = W * H;
    let range = Math.floor(Math.sqrt(mapArea / Math.max(1, numPlayers)) * 0.7);

    // Apply per-script modifier (percentage adjustment)
    range = Math.max(1, Math.floor(range * (100 + this.minStartingDistanceModifier) / 100));

    return range;
  }

  /**
   * Calculate Euclidean distance with world wrapping.
   *
   * @param {number} x1 - First point X
   * @param {number} y1 - First point Y
   * @param {number} x2 - Second point X
   * @param {number} y2 - Second point Y
   * @returns {number} Distance between points
   */
  _wrappedDistance(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2);
    if (this.wrapX) dx = Math.min(dx, this.iNumPlotsX - dx);

    let dy = Math.abs(y1 - y2);
    if (this.wrapY) dy = Math.min(dy, this.iNumPlotsY - dy);

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Compute connected land area IDs via BFS flood fill.
   * Ocean tiles get -1, each connected land region gets a unique ID >= 0.
   *
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @returns {number[]} 1D array of area IDs
   */
  _computeAreas(plotTypes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const areas = new Array(W * H).fill(-1);
    let nextAreaId = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (areas[idx] !== -1) continue;
        if (plotTypes[idx] === PLOT.OCEAN) continue;

        const areaId = nextAreaId++;
        const queue = [{ x, y }];
        areas[idx] = areaId;

        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();
          for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
            let nx = cx + dx;
            let ny = cy + dy;
            if (this.wrapX) nx = ((nx % W) + W) % W;
            else if (nx < 0 || nx >= W) continue;
            if (this.wrapY) ny = ((ny % H) + H) % H;
            else if (ny < 0 || ny >= H) continue;
            const nIdx = ny * W + nx;
            if (areas[nIdx] !== -1) continue;
            if (plotTypes[nIdx] === PLOT.OCEAN) continue;
            areas[nIdx] = areaId;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    return areas;
  }

  // ==========================================================================
  // TILE SCORING
  // ==========================================================================

  /**
   * Score all tiles for starting plot suitability.
   *
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of bonus IDs
   * @param {Object[]} rivers - 1D array of river objects
   * @param {boolean[]} lakes - 1D array of lake flags
   * @returns {number[]} 1D array of scores
   */
  _scoreAllTiles(plotTypes, terrain, features, bonuses, rivers, lakes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const scores = new Array(W * H).fill(0);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        scores[y * W + x] = this._scoreSingleTile(x, y, plotTypes, terrain, features, bonuses, rivers, lakes);
      }
    }

    return scores;
  }

  /**
   * Score a single tile for starting plot suitability using BFC analysis.
   *
   * BFC (big fat cross) is the 21 tiles within radius 2 that a city can work:
   *     X
   *    XXX
   *   XXXXX
   *    XXX
   *     X
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of bonus IDs
   * @param {Object[]} rivers - 1D array of river objects
   * @param {boolean[]} lakes - 1D array of lake flags
   * @returns {number} Score for this tile
   */
  _scoreSingleTile(x, y, plotTypes, terrain, features, bonuses, rivers, lakes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;

    // Must be land (not water, not peak)
    const plot = plotTypes[idx];
    if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) return -999;

    let score = 0;
    let hasFreshWater = false;
    let hasCoast = false;

    // Score all tiles within radius 2 (BFC = big fat cross)
    // Radius-2 cross: all (dx, dy) where |dx| + |dy| <= 2 AND max(|dx|,|dy|) <= 2
    // This gives 21 tiles (the city's workable tiles)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        // BFC shape: exclude corners of the 5x5 square
        if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;

        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;

        if (ny < 0 || ny >= H) continue;

        const nIdx = ny * W + nx;
        const nTerr = terrain[nIdx];
        const nPlot = plotTypes[nIdx];
        const nFeat = features[nIdx];
        const nBonus = bonuses[nIdx];

        // Food scoring
        if (nTerr === TERRAIN.GRASSLAND) score += 3;
        else if (nTerr === TERRAIN.PLAINS) score += 2;
        else if (nTerr === TERRAIN.DESERT) score -= 1;
        else if (nTerr === TERRAIN.TUNDRA) score -= 1;
        else if (nTerr === TERRAIN.SNOW) score -= 3;

        // Production scoring
        if (nPlot === PLOT.HILLS) score += 2;

        // Feature scoring
        if (nFeat === FEATURE.FOREST) score += 1;
        if (nFeat === FEATURE.JUNGLE) score -= 1;  // bad early game

        // Resource scoring
        if (nBonus !== null) {
          score += 4;
          // Extra for strategic resources
          const bonusDef = BONUS_DEFS.find(b => b.id === nBonus);
          if (bonusDef && (bonusDef.bonusClass === 'general' ||
              bonusDef.bonusClass === 'ancient' ||
              bonusDef.bonusClass === 'modern')) {
            score += 2;
          }
        }

        // Fresh water (river)
        if (rivers && this._tileHasRiver(rivers, nx, ny)) {
          score += 3;
          hasFreshWater = true;
        }

        // Fresh water (lake)
        if (lakes && lakes[nIdx]) {
          score += 2;
          hasFreshWater = true;
        }

        // Coast (within 1 tile for coastal access)
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          if (nTerr === TERRAIN.COAST || nPlot === PLOT.COAST) {
            hasCoast = true;
          }
        }
      }
    }

    // Coastal access bonus
    if (hasCoast) score += 3;

    // Fresh water penalty
    if (!hasFreshWater) score -= 5;

    return score;
  }

  // ==========================================================================
  // NORMALIZATION - MAIN
  // ==========================================================================

  /**
   * Run all 9 normalization passes in Civ4 order.
   *
   * Each pass mutates the map data arrays in-place to ensure balanced starts.
   *
   * @param {Object[]} starts - Array of { x, y } starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values (mutated)
   * @param {string[]} terrain - 1D array of TERRAIN values (mutated)
   * @param {string[]} features - 1D array of FEATURE values (mutated)
   * @param {string[]} bonuses - 1D array of bonus IDs (mutated)
   * @param {Object[]} rivers - 1D array of river objects (mutated)
   * @param {boolean[]} lakes - 1D array of lake flags (mutated)
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  normalize(starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng) {
    if (this.skipNormalization) return;

    // Pass 1: Group team starts (skip in single-player)
    this.normalizeStartingPlotLocations(starts);

    // Pass 2: Ensure river near start
    this.normalizeAddRiver(starts, plotTypes, terrain, features, rivers, rng);

    // Pass 3: Remove peaks near start
    if (!this.skipRemovePeaks) {
      this.normalizeRemovePeaks(starts, plotTypes);
    }

    // Pass 4: Ensure fresh water (add lake if needed)
    this.normalizeAddLakes(starts, plotTypes, terrain, rivers, lakes);

    // Pass 5: Remove jungle near start
    if (!this.skipRemoveBadFeatures) {
      this.normalizeRemoveBadFeatures(starts, features);
    }

    // Pass 6: Fix bad terrain near start
    if (!this.skipRemoveBadTerrain) {
      this.normalizeRemoveBadTerrain(starts, plotTypes, terrain);
    }

    // Pass 7: Ensure food resources near start
    this.normalizeAddFoodBonuses(starts, plotTypes, terrain, features, bonuses, rng);

    // Pass 8: Improve terrain quality near start
    if (!this.skipAddGoodTerrain) {
      this.normalizeAddGoodTerrain(starts, plotTypes, terrain);
    }

    // Pass 9: Final extras (subclass hook for Balanced strategic placement)
    this.normalizeAddExtras(starts, plotTypes, terrain, features, bonuses, rivers, rng);
  }

  // ==========================================================================
  // NORMALIZATION PASSES
  // ==========================================================================

  /**
   * Pass 1: Group team members closer together.
   * No-op in single player mode.
   *
   * @param {Object[]} _starts - Starting locations (unused in single player)
   */
  normalizeStartingPlotLocations(_starts) {
    // No-op in single player.
    // In team games: move each player's start toward their team centroid.
    // Implementation deferred until multiplayer support is added.
  }

  /**
   * Pass 2: Add river near starts that lack fresh water.
   *
   * If no river within 2 tiles of start, add one on the best nearby tile.
   *
   * @param {Object[]} starts - Starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {Object[]} rivers - 1D array of river objects (mutated)
   * @param {import('./utils.js').SeededRandom} rng - Seeded RNG
   */
  normalizeAddRiver(starts, plotTypes, terrain, features, rivers, rng) {
    for (const start of starts) {
      // Check if any tile within radius 2 has a river
      if (this._hasRiverInRadius(start.x, start.y, 2, rivers)) continue;

      // Find best tile within radius 2 for a new river
      // Prefer: flat land, non-desert, non-snow, adjacent to start
      const bestTile = this._findBestRiverTile(start.x, start.y, plotTypes, terrain);
      if (!bestTile) continue;

      // Add river edges on that tile
      this._addRiverAtTile(bestTile.x, bestTile.y, rivers, rng);
    }
  }

  /**
   * Pass 3: Remove peaks within 2 tiles of start.
   *
   * Converts peaks to hills to ensure workable tiles near start.
   *
   * @param {Object[]} starts - Starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values (mutated)
   */
  normalizeRemovePeaks(starts, plotTypes) {
    const W = this.iNumPlotsX;

    for (const start of starts) {
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const idx = ny * W + nx;
        if (plotTypes[idx] === PLOT.PEAK) {
          plotTypes[idx] = PLOT.HILLS;
        }
      }
    }
  }

  /**
   * Pass 4: Add lake near starts that lack fresh water.
   *
   * If start has no fresh water, convert a nearby flat land tile to a lake.
   *
   * @param {Object[]} starts - Starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values (mutated)
   * @param {string[]} terrain - 1D array of TERRAIN values (mutated)
   * @param {Object[]} rivers - 1D array of river objects
   * @param {boolean[]} lakes - 1D array of lake flags (mutated)
   */
  normalizeAddLakes(starts, plotTypes, terrain, rivers, lakes) {
    const W = this.iNumPlotsX;

    for (const start of starts) {
      // Check for existing fresh water
      if (this._hasRiverInRadius(start.x, start.y, 2, rivers)) continue;
      if (this._hasLakeInRadius(start.x, start.y, 2, lakes)) continue;

      // Find best tile within 2 to convert to lake
      // Prefer: flat land, non-desert, adjacent to start
      let bestTile = null;
      let bestDist = Infinity;

      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const idx = ny * W + nx;
        if (plotTypes[idx] !== PLOT.LAND) continue;
        if (nx === start.x && ny === start.y) continue;  // don't lake the start tile

        const dist = this._wrappedDistance(start.x, start.y, nx, ny);
        if (dist < bestDist) {
          bestDist = dist;
          bestTile = { x: nx, y: ny };
        }
      }

      if (bestTile) {
        const idx = bestTile.y * W + bestTile.x;
        plotTypes[idx] = PLOT.OCEAN;
        terrain[idx] = TERRAIN.COAST;
        lakes[idx] = true;
      }
    }
  }

  /**
   * Pass 5: Remove jungle within 2 tiles of start.
   *
   * Jungle requires tech to clear and is bad for early game.
   *
   * @param {Object[]} starts - Starting locations
   * @param {string[]} features - 1D array of FEATURE values (mutated)
   */
  normalizeRemoveBadFeatures(starts, features) {
    const W = this.iNumPlotsX;

    for (const start of starts) {
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const idx = ny * W + nx;
        if (features[idx] === FEATURE.JUNGLE) {
          features[idx] = FEATURE.NONE;
        }
      }
    }
  }

  /**
   * Pass 6: Fix bad terrain within 1 tile of start.
   *
   * Converts desert/snow to plains, tundra to grassland.
   *
   * @param {Object[]} starts - Starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values (mutated)
   */
  normalizeRemoveBadTerrain(starts, plotTypes, terrain) {
    const W = this.iNumPlotsX;

    for (const start of starts) {
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 1)) {
        const idx = ny * W + nx;
        const plot = plotTypes[idx];
        if (plot === PLOT.OCEAN || plot === PLOT.COAST) continue;

        const terr = terrain[idx];
        if (terr === TERRAIN.DESERT) {
          terrain[idx] = TERRAIN.PLAINS;
        } else if (terr === TERRAIN.SNOW) {
          terrain[idx] = TERRAIN.PLAINS;
        } else if (terr === TERRAIN.TUNDRA) {
          terrain[idx] = TERRAIN.GRASSLAND;
        }
      }
    }
  }

  /**
   * Pass 7: Ensure food resources near start.
   *
   * If fewer than 1 food resource within radius 2, add one.
   *
   * @param {Object[]} starts - Starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of bonus IDs (mutated)
   * @param {import('./utils.js').SeededRandom} rng - Seeded RNG
   */
  normalizeAddFoodBonuses(starts, plotTypes, terrain, features, bonuses, rng) {
    const W = this.iNumPlotsX;

    // Food bonus IDs that can be placed
    const foodBonuses = ['wheat', 'corn', 'rice', 'cow', 'pig', 'sheep', 'deer'];

    for (const start of starts) {
      // Count existing food resources in BFC
      let foodCount = 0;
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const bonus = bonuses[ny * W + nx];
        if (bonus && foodBonuses.includes(bonus)) foodCount++;
      }

      if (foodCount >= 1) continue;  // already has food

      // Try to place a food resource within radius 2
      const candidates = [];
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const idx = ny * W + nx;
        if (bonuses[idx] !== null) continue;

        const plot = plotTypes[idx];
        const terr = terrain[idx];
        const feat = features[idx];

        // Try each food bonus, pick first that fits
        for (const foodId of foodBonuses) {
          const def = BONUS_DEFS.find(b => b.id === foodId);
          if (!def) continue;

          // Basic terrain/feature check (skip spacing for normalization)
          if (def.terrain && !def.terrain.includes(terr)) continue;
          if (def.requiresHills && plot !== PLOT.HILLS) continue;
          if (def.requiresFlatlands && plot !== PLOT.LAND) continue;
          if (def.noFeature && feat !== FEATURE.NONE) continue;
          if (def.features && !def.features.includes(feat)) continue;
          if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) continue;

          candidates.push({ x: nx, y: ny, bonusId: foodId });
          break;  // first match for this tile
        }
      }

      if (candidates.length > 0) {
        const pick = candidates[rng.nextInt(0, candidates.length - 1)];
        bonuses[pick.y * W + pick.x] = pick.bonusId;
      }
    }
  }

  /**
   * Pass 8: Improve terrain quality near start.
   *
   * Ensures at least 3 grassland tiles and at least 1 hill for production.
   *
   * @param {Object[]} starts - Starting locations
   * @param {number[]} plotTypes - 1D array of PLOT values (mutated)
   * @param {string[]} terrain - 1D array of TERRAIN values (mutated)
   */
  normalizeAddGoodTerrain(starts, plotTypes, terrain) {
    const W = this.iNumPlotsX;

    for (const start of starts) {
      let grassCount = 0;
      let hillsCount = 0;

      // Count existing good terrain in radius 2
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const idx = ny * W + nx;
        if (terrain[idx] === TERRAIN.GRASSLAND) grassCount++;
        if (plotTypes[idx] === PLOT.HILLS) hillsCount++;
      }

      // If too few grassland, convert some plains within radius 1
      if (grassCount < 3) {
        for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 1)) {
          const idx = ny * W + nx;
          if (terrain[idx] === TERRAIN.PLAINS && grassCount < 3) {
            terrain[idx] = TERRAIN.GRASSLAND;
            grassCount++;
          }
        }
      }

      // If no hills, convert one flat land within radius 2 to hills
      if (hillsCount === 0) {
        for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
          const idx = ny * W + nx;
          if (plotTypes[idx] === PLOT.LAND &&
              terrain[idx] !== TERRAIN.DESERT &&
              !(nx === start.x && ny === start.y)) {
            plotTypes[idx] = PLOT.HILLS;
            break;
          }
        }
      }
    }
  }

  /**
   * Pass 9: Ensure strategic resources exist near each starting location.
   *
   * Port of Civ4 Warlords BonusBalancer.normalizeAddExtras().
   * Uses 4 relaxation passes with progressively looser placement constraints:
   *   Pass 0: Strict (respect uniqueRange, oneArea, adjacency)
   *   Pass 1: Ignore uniqueRange
   *   Pass 2: Ignore uniqueRange + oneArea
   *   Pass 3: Ignore all constraints
   *
   * @param {Object[]} starts - Starting locations [{x, y}]
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of bonus IDs (mutated)
   * @param {Object[]} _rivers - 1D array of river objects (unused)
   * @param {import('./utils.js').SeededRandom} _rng - Seeded RNG (unused)
   */
  normalizeAddExtras(starts, plotTypes, terrain, features, bonuses, _rivers, _rng) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const RADIUS = 5;

    const resourcesToBalance = [
      'aluminum', 'coal', 'copper', 'horse', 'iron', 'oil', 'uranium'
    ];

    for (const start of starts) {
      // 1. Build candidate tiles within 11×11 area around start
      const candidates = [];
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
          let nx = start.x + dx;
          let ny = start.y + dy;
          if (this.wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          candidates.push({ x: nx, y: ny, idx: ny * W + nx });
        }
      }

      // 2. Track which resources we've placed for this start
      const placed = new Set();

      // Check which resources already exist near this start
      for (const resId of resourcesToBalance) {
        if (candidates.some(c => bonuses[c.idx] === resId)) {
          placed.add(resId);
        }
      }

      // 3. Four relaxation passes
      for (let pass = 0; pass < 4; pass++) {
        const ignoreUniqueRange = pass >= 1;
        const ignoreAdjacent    = pass >= 3;

        for (const resId of resourcesToBalance) {
          if (placed.has(resId)) continue;

          const bonusDef = BONUS_DEFS.find(b => b.id === resId);
          if (!bonusDef) continue;

          for (const c of candidates) {
            if (bonuses[c.idx]) continue; // already has a resource

            if (!this._canPlaceBalancedBonus(
              c.x, c.y, bonusDef, plotTypes, terrain, features, bonuses,
              ignoreUniqueRange, ignoreAdjacent
            )) continue;

            bonuses[c.idx] = resId;
            placed.add(resId);
            break; // next resource
          }
        }
      }
    }
  }

  /**
   * Check if a strategic resource can be placed at (x, y) for balancing.
   * Port of BonusBalancer.isBonusValid() + canHaveBonus().
   */
  _canPlaceBalancedBonus(x, y, bonusDef, plotTypes, terrain, features, bonuses,
                          ignoreUniqueRange, ignoreAdjacent) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;
    const plot = plotTypes[idx];
    const feat = features[idx];

    // Plot type checks
    if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) return false;
    if (bonusDef.requiresHills && plot !== PLOT.HILLS) return false;
    if (bonusDef.requiresFlatlands && plot !== PLOT.LAND) return false;

    // Feature check: some resources can't go on forest/jungle
    if (bonusDef.features !== null && bonusDef.features !== undefined) {
      if (bonusDef.features.length === 0 && feat) return false;
      if (bonusDef.features.length > 0 && !bonusDef.features.includes(feat)) return false;
    }

    // Adjacency: no different bonus adjacent
    if (!ignoreAdjacent) {
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
        let nx = x + dx;
        let ny = y + dy;
        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;
        const nIdx = ny * W + nx;
        if (bonuses[nIdx] && bonuses[nIdx] !== bonusDef.id) return false;
      }
    }

    // Unique range: no same bonus within iUniqueRange
    if (!ignoreUniqueRange && bonusDef.iUniqueRange) {
      const range = bonusDef.iUniqueRange;
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (this.wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          if (bonuses[ny * W + nx] === bonusDef.id) return false;
        }
      }
    }

    return true;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get all tiles within a given radius (BFC shape for radius 2).
   *
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} radius - Radius (1 or 2)
   * @returns {Array<[number, number]>} Array of [nx, ny] coordinates
   */
  _getTilesInRadius(x, y, radius) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const tiles = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // BFC shape for radius 2: exclude corners
        if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;

        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;

        if (ny < 0 || ny >= H) continue;

        tiles.push([nx, ny]);
      }
    }

    return tiles;
  }

  /**
   * Check if a tile has any river on any of its 4 edges.
   *
   * @param {Object[]} rivers - 1D array of river objects
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {boolean} True if tile has any river edge
   */
  _tileHasRiver(rivers, x, y) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;

    const tile = rivers[idx];
    if (tile && (tile.isNOfRiver || tile.isWOfRiver)) return true;

    // South neighbor's north edge
    if (y + 1 < H && rivers[(y + 1) * W + x].isNOfRiver) return true;

    // East neighbor's west edge
    const ex = this.wrapX ? (x + 1) % W : x + 1;
    if (ex < W && rivers[y * W + ex].isWOfRiver) return true;

    return false;
  }

  /**
   * Check if any tile within radius has a river.
   *
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Search radius
   * @param {Object[]} rivers - 1D array of river objects
   * @returns {boolean} True if river exists within radius
   */
  _hasRiverInRadius(x, y, radius, rivers) {
    if (!rivers) return false;

    for (const [nx, ny] of this._getTilesInRadius(x, y, radius)) {
      if (this._tileHasRiver(rivers, nx, ny)) return true;
    }
    return false;
  }

  /**
   * Check if any tile within radius is a lake.
   *
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Search radius
   * @param {boolean[]} lakes - 1D array of lake flags
   * @returns {boolean} True if lake exists within radius
   */
  _hasLakeInRadius(x, y, radius, lakes) {
    if (!lakes) return false;
    const W = this.iNumPlotsX;

    for (const [nx, ny] of this._getTilesInRadius(x, y, radius)) {
      if (lakes[ny * W + nx]) return true;
    }
    return false;
  }

  /**
   * Find the best tile within radius 2 for adding a new river.
   *
   * Prefers flat land, non-desert, non-snow, closer to start.
   *
   * @param {number} startX - Start X coordinate
   * @param {number} startY - Start Y coordinate
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @returns {Object|null} { x, y } of best tile, or null
   */
  _findBestRiverTile(startX, startY, plotTypes, terrain) {
    const W = this.iNumPlotsX;
    let best = null;
    let bestScore = -Infinity;

    for (const [nx, ny] of this._getTilesInRadius(startX, startY, 2)) {
      const idx = ny * W + nx;
      const plot = plotTypes[idx];
      const terr = terrain[idx];

      if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) continue;

      let score = 0;
      if (plot === PLOT.LAND) score += 2;  // prefer flat
      if (terr === TERRAIN.GRASSLAND) score += 1;
      if (terr === TERRAIN.PLAINS) score += 1;
      // Closer to start is better
      const dist = this._wrappedDistance(startX, startY, nx, ny);
      score -= dist;

      if (score > bestScore) {
        bestScore = score;
        best = { x: nx, y: ny };
      }
    }

    return best;
  }

  /**
   * Add a simple river segment at the given tile.
   *
   * Places a river on the tile's north edge with random flow direction.
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {Object[]} rivers - 1D array of river objects (mutated)
   * @param {import('./utils.js').SeededRandom} rng - Seeded RNG
   */
  _addRiverAtTile(x, y, rivers, rng) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // Add a simple river segment on this tile's north edge
    rivers[idx].isNOfRiver = true;
    rivers[idx].riverNSDirection = rng.next() < 0.5 ? 'E' : 'W';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
export { BONUS_DEFS } from './BonusGenerator.js';
