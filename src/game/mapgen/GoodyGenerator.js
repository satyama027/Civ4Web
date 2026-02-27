/**
 * GoodyGenerator - Civ4-compatible goody hut (tribal village) placement
 *
 * Places goody huts on eligible land tiles with minimum spacing constraints.
 * This is the 7th and final data layer in the Civ4 map generation pipeline,
 * called after bonus placement and starting plot assignment.
 *
 * Port of the C++ default addGoodies() / canPlaceGoodyAt() from Civ4 BTS.
 *
 * References:
 * - Civ4 SDK: CvMapGenerator::addGoodies() / canPlaceGoodyAt()
 * - CvMapScriptInterface.py order of operations
 */

import { PLOT } from './FractalWorld.js';
import { FEATURE } from './FeatureGenerator.js';
import { TERRAIN } from './TerrainGenerator.js';

// ============================================================================
// GOODY GENERATOR CLASS
// ============================================================================

/**
 * Places goody huts (tribal villages) on the map.
 *
 * Goody huts are improvements that give bonuses when a unit enters them.
 * Placement rules:
 * - Only on land tiles (LAND or HILLS, never PEAK/OCEAN/COAST)
 * - Not on tiles with existing bonus resources
 * - Not on ice or flood plains
 * - Minimum spacing between huts (Manhattan distance)
 * - Minimum distance from starting locations
 * - Target density scales with map size
 *
 * @example
 * const gg = new GoodyGenerator(width, height, { wrapX: true, wrapY: false });
 * const goodies = gg.addGoodies(rng, plotTypes, terrain, features, bonuses, starts);
 */
export class GoodyGenerator {

  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} [options={}]
   * @param {boolean} [options.wrapX=true] - Whether map wraps horizontally
   * @param {boolean} [options.wrapY=false] - Whether map wraps vertically
   * @param {number} [options.minSpacing=4] - Min Manhattan distance between huts
   * @param {number} [options.startExclusion=3] - Min distance from starting plots
   * @param {number} [options.tilesPerHut=25] - Avg land tiles per hut placed
   * @param {Function|null} [options.canPlaceGoodyAt=null] - Script override: (x, y, plotType, terrain, feature, bonus) => boolean
   */
  constructor(mapWidth, mapHeight, options = {}) {
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.wrapX = options.wrapX !== false;
    this.wrapY = options.wrapY || false;
    this.minSpacing = options.minSpacing ?? 4;
    this.startExclusion = options.startExclusion ?? 3;
    this.tilesPerHut = options.tilesPerHut ?? 25;
    this._scriptCanPlaceGoodyAt = options.canPlaceGoodyAt ?? null;
  }

  /**
   * Place goody huts on the map.
   *
   * Called after addBonuses() and assignStartingPlots() + normalization.
   *
   * @param {import('./utils.js').SeededRandom} rng - Seeded RNG
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {(string|null)[]} features - 1D array of FEATURE values
   * @param {(string|null)[]} bonuses - 1D array of bonus IDs
   * @param {Array<{x:number, y:number}>} startingLocations
   * @returns {boolean[]} 1D array, true = goody hut present
   */
  addGoodies(rng, plotTypes, terrain, features, bonuses, startingLocations) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const goodies = new Array(W * H).fill(false);

    // 1. Build candidate list of eligible tiles
    const candidates = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const canPlace = this._scriptCanPlaceGoodyAt
          ? this._scriptCanPlaceGoodyAt(x, y, plotTypes[idx], terrain[idx], features[idx], bonuses[idx])
          : this.canPlaceGoodyAt(x, y, plotTypes[idx], terrain[idx], features[idx], bonuses[idx]);
        if (canPlace) {
          candidates.push({ x, y, idx });
        }
      }
    }

    // 2. Compute target count based on land density
    const targetCount = Math.max(1, Math.floor(candidates.length / this.tilesPerHut));

    // 3. Shuffle candidates
    rng.shuffle(candidates);

    // 4. Greedy placement with spacing + start exclusion
    const placed = [];
    for (const c of candidates) {
      if (placed.length >= targetCount) break;

      // Check start exclusion
      let tooCloseToStart = false;
      for (const s of startingLocations) {
        if (this._manhattanDist(c.x, c.y, s.x, s.y) < this.startExclusion) {
          tooCloseToStart = true;
          break;
        }
      }
      if (tooCloseToStart) continue;

      // Check spacing against already-placed huts (Chebyshev, matching Civ4 iGoodyRange square check)
      let tooCloseToHut = false;
      for (const p of placed) {
        if (this._chebyshevDist(c.x, c.y, p.x, p.y) < this.minSpacing) {
          tooCloseToHut = true;
          break;
        }
      }
      if (tooCloseToHut) continue;

      goodies[c.idx] = true;
      placed.push(c);
    }

    return goodies;
  }

  /**
   * Per-tile eligibility check for goody hut placement.
   *
   * @param {number} _x - Tile X coordinate
   * @param {number} _y - Tile Y coordinate
   * @param {number} plotType - PLOT enum value
   * @param {string} _terrain - TERRAIN enum value
   * @param {string|null} feature - FEATURE enum value or null
   * @param {string|null} bonus - Bonus resource ID or null
   * @returns {boolean} True if a goody hut can be placed here
   */
  canPlaceGoodyAt(_x, _y, plotType, terrain, feature, bonus) {
    // Only land or hills (not peaks, ocean, coast)
    if (plotType !== PLOT.LAND && plotType !== PLOT.HILLS) return false;

    // No goody on tiles with existing resources
    if (bonus) return false;

    // No goody on ice or flood plains
    if (feature === FEATURE.ICE || feature === FEATURE.FLOODPLAINS) return false;

    // Terrain/feature must be Civ4-valid for IMPROVEMENT_GOODY_HUT
    // TerrainMakesValids: GRASSLAND, PLAINS, DESERT, TUNDRA
    // FeatureMakesValids: JUNGLE, FOREST
    const validTerrain = terrain === TERRAIN.GRASSLAND || terrain === TERRAIN.PLAINS
                      || terrain === TERRAIN.DESERT   || terrain === TERRAIN.TUNDRA;
    const validFeature = feature === FEATURE.JUNGLE || feature === FEATURE.FOREST;
    if (!validTerrain && !validFeature) return false;

    return true;
  }

  /**
   * Manhattan distance with world wrap support.
   * Used for startExclusion checks (our own addition, not in Civ4).
   */
  _manhattanDist(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2);
    if (this.wrapX) dx = Math.min(dx, this.iNumPlotsX - dx);

    let dy = Math.abs(y1 - y2);
    if (this.wrapY) dy = Math.min(dy, this.iNumPlotsY - dy);

    return dx + dy;
  }

  /**
   * Chebyshev distance with world wrap support.
   * Used for goody-goody spacing, matching Civ4's square iGoodyRange check.
   */
  _chebyshevDist(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2);
    if (this.wrapX) dx = Math.min(dx, this.iNumPlotsX - dx);
    let dy = Math.abs(y1 - y2);
    if (this.wrapY) dy = Math.min(dy, this.iNumPlotsY - dy);
    return Math.max(dx, dy);
  }
}
