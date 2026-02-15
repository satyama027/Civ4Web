/**
 * Shared helpers for Civ4 BTS map scripts.
 *
 * Provides utility functions used by all four core scripts:
 * continents, fractal, archipelago, pangaea.
 */

import { PLOT } from '../FractalWorld.js';
import { TERRAIN } from '../TerrainGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import { getMapSizeConfig } from '../../../data/gameOptions.js';

// ============================================================================
// Grid Size & Settings Resolution
// ============================================================================

/**
 * Convert grid cell dimensions to plot dimensions (each grid cell = 4×4 plots).
 * @param {string} worldSize - e.g. 'standard'
 * @param {Object} gridTable - { worldSize: [gridW, gridH] }
 * @returns {{ width: number, height: number }}
 */
export function resolveGridSize(worldSize, gridTable) {
  const grid = gridTable[worldSize];
  return {
    width: grid[0] * 4,
    height: grid[1] * 4
  };
}

/**
 * Get default map dimensions from gameOptions.js.
 * @param {string} worldSize - e.g. 'standard'
 * @returns {{ width: number, height: number }}
 */
export function getDefaultDimensions(worldSize) {
  const cfg = getMapSizeConfig(worldSize);
  if (!cfg) {
    const fallback = getMapSizeConfig('standard');
    return { width: fallback.tilesWidth, height: fallback.tilesHeight };
  }
  return { width: cfg.tilesWidth, height: cfg.tilesHeight };
}

/**
 * Map sea level setting to Civ4 seaLevelChange integer.
 * @param {string} seaLevel - 'low', 'medium', or 'high'
 * @returns {number}
 */
export function resolveSeaLevelChange(seaLevel) {
  switch (seaLevel) {
    case 'low':    return -5;
    case 'medium': return 0;
    case 'high':   return 5;
    default:       return 0;
  }
}

/**
 * Return climate-dependent parameters matching CIV4ClimateInfo.xml exactly.
 *
 * Field names mirror the XML element names:
 * - iHillRange, iPeakPercent: FractalWorld hill/peak thresholds
 * - iJungleLatitude: FeatureGenerator jungle falloff (integer, used in formula)
 * - fRandIceLatitude, fIceLatitude: FeatureGenerator ice thresholds
 * - iDesertPercentChange: additive change to TerrainGenerator's base 32% desert
 * - f*LatitudeChange: additive changes to TerrainGenerator base latitude thresholds
 *
 * @param {string} climate
 * @returns {Object} Climate configuration matching CIV4ClimateInfo.xml
 */
export function resolveClimateSettings(climate) {
  const configs = {
    temperate: {
      iHillRange: 5, iPeakPercent: 25, iJungleLatitude: 5,
      fRandIceLatitude: 0.25, fIceLatitude: 0.95,
      iDesertPercentChange: 0,
      fSnowLatitudeChange: 0.0, fTundraLatitudeChange: 0.0,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0, fDesertTopLatitudeChange: 0.0
    },
    tropical: {
      iHillRange: 5, iPeakPercent: 25, iJungleLatitude: 2,
      fRandIceLatitude: 0.20, fIceLatitude: 0.95,
      iDesertPercentChange: -10,
      fSnowLatitudeChange: 0.1, fTundraLatitudeChange: 0.1,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0, fDesertTopLatitudeChange: 0.0
    },
    arid: {
      iHillRange: 5, iPeakPercent: 25, iJungleLatitude: 6,
      fRandIceLatitude: 0.20, fIceLatitude: 0.95,
      iDesertPercentChange: 20,
      fSnowLatitudeChange: 0.0, fTundraLatitudeChange: 0.0,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: -0.1, fDesertTopLatitudeChange: 0.1
    },
    rocky: {
      iHillRange: 7, iPeakPercent: 35, iJungleLatitude: 5,
      fRandIceLatitude: 0.25, fIceLatitude: 0.95,
      iDesertPercentChange: 0,
      fSnowLatitudeChange: -0.025, fTundraLatitudeChange: -0.05,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0, fDesertTopLatitudeChange: -0.05
    },
    cold: {
      iHillRange: 5, iPeakPercent: 25, iJungleLatitude: 6,
      fRandIceLatitude: 0.50, fIceLatitude: 0.90,
      iDesertPercentChange: -10,
      fSnowLatitudeChange: -0.1, fTundraLatitudeChange: -0.15,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0, fDesertTopLatitudeChange: -0.1
    }
  };
  return configs[climate] || configs.temperate;
}

/**
 * World-size-dependent grain offset for generators.
 * @param {string} worldSize
 * @returns {number}
 */
export function getWorldSizeGrainAdjust(worldSize) {
  // Exact values from CIV4WorldInfo.xml TerrainGrainChange / FeatureGrainChange
  switch (worldSize) {
    case 'duel':
    case 'tiny':     return 0;
    case 'small':    return 0;
    case 'standard': return 1;
    case 'large':    return 1;
    case 'huge':     return 1;
    default:         return 0;
  }
}

// ============================================================================
// Land Area Analysis
// ============================================================================

/**
 * BFS flood fill to find connected land regions.
 * Returns the area ID of the largest landmass.
 *
 * @param {number[]} plotTypes - 1D array of PLOT values
 * @param {number} W - map width
 * @param {number} H - map height
 * @param {boolean} wrapX - whether map wraps horizontally
 * @returns {{ areaId: number, areas: number[], areaSizes: Object }}
 */
export function findBiggestLandArea(plotTypes, W, H, wrapX) {
  const areas = new Array(W * H).fill(-1);
  let nextId = 0;
  const areaSizes = {};

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (areas[idx] !== -1) continue;
      if (plotTypes[idx] === PLOT.OCEAN) continue;

      const areaId = nextId++;
      let size = 0;
      const queue = [{ x, y }];
      areas[idx] = areaId;

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift();
        size++;
        for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
          let nx = cx + dx;
          let ny = cy + dy;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          const nIdx = ny * W + nx;
          if (areas[nIdx] !== -1) continue;
          if (plotTypes[nIdx] === PLOT.OCEAN) continue;
          areas[nIdx] = areaId;
          queue.push({ x: nx, y: ny });
        }
      }
      areaSizes[areaId] = size;
    }
  }

  let biggestId = 0;
  let biggestSize = 0;
  for (const [id, size] of Object.entries(areaSizes)) {
    if (size > biggestSize) {
      biggestSize = size;
      biggestId = parseInt(id);
    }
  }

  return { areaId: biggestId, areas, areaSizes };
}

// ============================================================================
// Coastal Peak Removal (Archipelago)
// ============================================================================

/**
 * Convert any peak tile adjacent to ocean/coast to hills.
 * Used by Archipelago to counterbalance extra peaks.
 *
 * @param {number[]} plotTypes1D - 1D plot array (mutated in place)
 * @param {number} W - map width
 * @param {number} H - map height
 * @param {boolean} wrapX - whether map wraps horizontally
 */
export function removeCoastalPeaks(plotTypes1D, W, H, wrapX) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (plotTypes1D[idx] !== PLOT.PEAK) continue;

      let isCoastal = false;
      for (let dy = -1; dy <= 1 && !isCoastal; dy++) {
        for (let dx = -1; dx <= 1 && !isCoastal; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          const nPlot = plotTypes1D[ny * W + nx];
          if (nPlot === PLOT.OCEAN) {
            isCoastal = true;
          }
        }
      }

      if (isCoastal) {
        plotTypes1D[idx] = PLOT.HILLS;
      }
    }
  }
}

// ============================================================================
// City Site Scoring (for Archipelago regional starts)
// ============================================================================

/**
 * Score a tile as a potential city site using BFC (big fat cross) analysis.
 * Simplified version of StartingPlots._scoreSingleTile().
 *
 * @param {number} cx - city x
 * @param {number} cy - city y
 * @param {number[]} plotTypes1D
 * @param {string[]} terrain1D
 * @param {(string|null)[]} features1D
 * @param {(string|null)[]} bonuses1D
 * @param {number} W - map width
 * @param {number} H - map height
 * @param {boolean} wrapX
 * @returns {number} score
 */
export function scoreCitySite(cx, cy, plotTypes1D, terrain1D, features1D,
                               bonuses1D, W, H, wrapX) {
  let score = 0;

  // BFC offsets (radius 2, excluding corners-of-corners)
  const BFC_OFFSETS = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue; // skip far corners
      BFC_OFFSETS.push([dx, dy]);
    }
  }

  for (const [dx, dy] of BFC_OFFSETS) {
    let nx = cx + dx;
    let ny = cy + dy;
    if (wrapX) nx = ((nx % W) + W) % W;
    else if (nx < 0 || nx >= W) continue;
    if (ny < 0 || ny >= H) continue;

    const idx = ny * W + nx;
    const plot = plotTypes1D[idx];
    const terr = terrain1D[idx];
    const feat = features1D[idx];
    const bonus = bonuses1D[idx];

    if (plot === PLOT.OCEAN) {
      if (bonus) score += 2;
      score += 1; // coastal access
      continue;
    }

    if (plot === PLOT.PEAK) continue; // unusable

    // Base terrain yields
    if (terr === TERRAIN.GRASSLAND) score += 3;
    else if (terr === TERRAIN.PLAINS) score += 2;
    else if (terr === TERRAIN.DESERT) score += 0;
    else if (terr === TERRAIN.TUNDRA) score += 1;
    else if (terr === TERRAIN.SNOW) score += 0;

    // Hills bonus
    if (plot === PLOT.HILLS) score += 1;

    // Feature bonus
    if (feat === 'forest' || feat === 'jungle') score += 1;

    // Resource bonus
    if (bonus) score += 3;
  }

  return score;
}

// ============================================================================
// River Detection Helper
// ============================================================================

/**
 * Check whether a tile touches any river edge (own edges + neighbor edges).
 */
function tileHasRiver(rivers, x, y, W, H) {
  const r = rivers[y][x];
  if (r.isNOfRiver || r.isWOfRiver) return true;
  // East neighbor's west edge
  const ex = (x + 1) % W;
  if (rivers[y][ex].isWOfRiver) return true;
  // South neighbor's north edge
  if (y + 1 < H && rivers[y + 1][x].isNOfRiver) return true;
  return false;
}

// ============================================================================
// Map Result Builder
// ============================================================================

/**
 * Convert 1D arrays to the standard 2D map result format.
 *
 * @param {number} W - map width
 * @param {number} H - map height
 * @param {Object} settings - original generation settings
 * @param {number[]} plotTypes1D
 * @param {string[]} terrain1D
 * @param {(string|null)[]} features1D
 * @param {(string|null)[]} bonuses1D
 * @param {Object[]} rivers1D
 * @param {boolean[]} lakes1D
 * @param {Array<{x:number, y:number}>} starts
 * @param {boolean[]} [goodies1D=null] - 1D array of goody hut flags
 * @returns {Object} map result
 */
export function buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                                bonuses1D, rivers1D, lakes1D, starts, goodies1D = null) {
  const to2D = (arr) => Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => arr[y * W + x])
  );

  return {
    width: W,
    height: H,
    seed: settings.seed,
    settings,
    plots: to2D(plotTypes1D),
    terrain: to2D(terrain1D),
    features: to2D(features1D),
    resources: to2D(bonuses1D),
    rivers: to2D(rivers1D),
    lakes: to2D(lakes1D),
    goodies: goodies1D ? to2D(goodies1D) : to2D(new Array(W * H).fill(false)),
    startingLocations: starts,
    getTile(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;
      const plot = this.plots[y][wx];
      const river = this.rivers[y][wx];
      return {
        x: wx, y,
        plot,
        terrain: this.terrain[y][wx],
        feature: this.features[y][wx],
        resource: this.resources[y][wx],
        river,
        isWater: plot === PLOT.OCEAN,
        isLand: plot >= PLOT.LAND,
        isCoast: this.terrain[y][wx] === TERRAIN.COAST,
        isHills: plot === PLOT.HILLS,
        isPeak: plot === PLOT.PEAK,
        hasRiver: tileHasRiver(this.rivers, wx, y, W, H),
        isLake: this.lakes[y][wx],
        hasGoodyHut: this.goodies ? this.goodies[y][wx] : false,
        isNOfRiver: river.isNOfRiver,
        isWOfRiver: river.isWOfRiver,
        riverFlowN: river.riverNSDirection,
        riverFlowW: river.riverWEDirection
      };
    },
    getElevation(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return 'FLAT';
      const p = this.plots[y][wx];
      if (p === PLOT.PEAK) return 'PEAKS';
      if (p === PLOT.HILLS) return 'HILLS';
      return 'FLAT';
    }
  };
}

// ============================================================================
// Shared Starting Plot Assignment: Biggest Land Area
// ============================================================================

/**
 * Assign all players onto the biggest connected landmass.
 * Used by Pangaea, Terra, Lakes, and other single-continent scripts.
 *
 * @param {number} numPlayers
 * @param {number[]} plotTypes1D
 * @param {string[]} terrain1D
 * @param {(string|null)[]} features1D
 * @param {(string|null)[]} bonuses1D
 * @param {Object[]} rivers1D
 * @param {boolean[]} lakes1D
 * @param {number} W - map width
 * @param {number} H - map height
 * @param {number} distModifier - minStartingDistanceModifier
 * @param {boolean} wrapX - whether map wraps horizontally
 * @param {Object} _rng - seeded RNG (unused but kept for API consistency)
 * @returns {Array<{x:number, y:number}>}
 */
export function assignStartsBiggestArea(numPlayers, plotTypes1D, terrain1D, features1D,
                                         bonuses1D, rivers1D, lakes1D,
                                         W, H, distModifier, wrapX, _rng) {
  const { areaId: biggestAreaId, areas } = findBiggestLandArea(plotTypes1D, W, H, wrapX);

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: distModifier,
    wrapX, wrapY: false
  });

  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      if (areas[idx] !== biggestAreaId) continue;
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const baseRange = sp._startingPlotRange(numPlayers);
  let minDist = baseRange;
  const starts = [];

  for (let pass = 0; pass < 50 && starts.length < numPlayers; pass++) {
    for (const c of candidates) {
      if (starts.length >= numPlayers) break;
      if (starts.some(s => s.x === c.x && s.y === c.y)) continue;
      let ok = true;
      for (const s of starts) {
        if (sp._wrappedDistance(c.x, c.y, s.x, s.y) < minDist) { ok = false; break; }
      }
      if (ok) starts.push({ x: c.x, y: c.y });
    }
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}
