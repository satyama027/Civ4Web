/**
 * RiverGenerator - Civ4-compatible river placement and lake detection
 *
 * Direct port of CvMapGenerator::addRivers() and doRiver() from Civ4 BTS SDK.
 * Uses Civ4's exact 4-pass system, getRiverValueAtPlot() altitude formula,
 * and findWater() distance checks.
 *
 * Pipeline order:
 *   generatePlotTypes() → generateTerrain() → addRivers() → addLakes() → addFeatures()
 *
 * References:
 * - Civ4 SDK: CvMapGenerator.cpp addRivers(), doRiver(), getRiverValueAtPlot()
 * - Civ4 SDK: CvMap.cpp findWater()
 * - Civ4 SDK: CvPlot.cpp getInlandCorner(), hasCoastAtSECorner()
 * - Civ4 BTS GlobalDefines.xml: PLOTS_PER_RIVER_EDGE, RIVER_SOURCE_MIN_*
 */

import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';

// ============================================================================
// DIRECTION ENUMS
// ============================================================================

/**
 * Cardinal directions for river start/flow determination.
 * Matches Civ4's CardinalDirectionTypes.
 */
export const CARDINAL = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3
};

/**
 * Cardinal direction offsets (dx, dy) for each direction.
 * In our coordinate system: y=0 is top (north pole), y increases southward.
 */
export const CARDINAL_OFFSETS = {
  [CARDINAL.NORTH]: [0, -1],
  [CARDINAL.EAST]:  [1, 0],
  [CARDINAL.SOUTH]: [0, 1],
  [CARDINAL.WEST]:  [-1, 0]
};

/**
 * Flow directions for river edges.
 * Used by the rendering pipeline.
 */
export const FLOW = {
  EAST: 'E',
  WEST: 'W',
  NORTH: 'N',
  SOUTH: 'S'
};

// ============================================================================
// CIV4 CONSTANTS (from GlobalDefines.xml)
// ============================================================================

/** Max ratio: 1 river edge per this many land tiles */
const PLOTS_PER_RIVER_EDGE = 12;

/** Min distance from existing fresh water (river) to start a new river */
const RIVER_SOURCE_MIN_RIVER_RANGE = 4;

/** Min distance from sea water to start a new river */
const RIVER_SOURCE_MIN_SEAWATER_RANGE = 2;

// ============================================================================
// RIVER GENERATOR CLASS
// ============================================================================

/**
 * Places rivers and detects lakes using Civ4's exact 4-pass algorithm.
 *
 * Pass 0: Hills/peaks only, strict distance checks
 * Pass 1: Non-coastal land with 1/8 random chance, strict distance checks
 * Pass 2: Hills/peaks, relaxed distances, area density cap
 * Pass 3: Any land, relaxed distances, area density cap
 *
 * @example
 * const rg = new RiverGenerator(width, height);
 * const rivers = rg.addRivers(rng, plotTypes, terrain, null);
 * const lakes = rg.addLakes(plotTypes, terrain);
 * const rivers2D = rg.toRivers2D(rivers);
 */
export class RiverGenerator {

  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} [settings={}] - Configuration overrides
   * @param {boolean} [settings.wrapX=true] - Whether map wraps horizontally
   * @param {boolean} [settings.wrapY=false] - Whether map wraps vertically
   * @param {Function|null} [settings.getRiverStartCardinalDirection=null] - Script override: (x, y, plotTypes) => cardinalDirection|null
   * @param {Function|null} [settings.getRiverAltitude=null] - Script override: (x, y, plotTypes) => altitudeValue (number)
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.wrapX = settings.wrapX !== false;
    this.wrapY = settings.wrapY || false;
    this._scriptGetRiverStartCardinalDirection = settings.getRiverStartCardinalDirection ?? null;
    this._scriptGetRiverAltitude = settings.getRiverAltitude ?? null;
  }

  // ==========================================================================
  // MAIN ENTRY POINTS
  // ==========================================================================

  /**
   * Place rivers on the map using Civ4's exact 4-pass system.
   *
   * From CvMapGenerator::addRivers() in CvMapGenerator.cpp:
   * - Pass 0: Hills/peaks, riverSourceRange=4, seaWaterRange=2
   * - Pass 1: Non-coastal land + 1/8 chance, same ranges
   * - Pass 2: Hills/peaks + area density cap, halved ranges
   * - Pass 3: Any land + area density cap, halved ranges
   *
   * Each eligible tile must NOT have fresh water within riverSourceRange
   * and must NOT have sea water within seaWaterRange.
   *
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   * @param {number[]} plotTypes - 1D array of PLOT enum values (y * width + x)
   * @param {string[]} terrain - 1D array of TERRAIN enum values (y * width + x)
   * @param {string[]|null} [features=null] - 1D array of FEATURE enum values, or null
   * @returns {Object[]} 1D array of river objects (y * width + x)
   */
  addRivers(rng, plotTypes, terrain, features = null) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // 1. Allocate river data array
    const rivers = new Array(W * H);
    for (let i = 0; i < W * H; i++) {
      rivers[i] = {
        isNOfRiver: false,
        isWOfRiver: false,
        riverNSDirection: null,
        riverWEDirection: null
      };
    }

    // 2. Pre-compute river values (Civ4's getRiverValueAtPlot)
    //    If script provides getRiverAltitude, use it per-plot instead of default formula
    const riverValues = this._scriptGetRiverAltitude
      ? this._buildRiverValuesFromCallback(plotTypes)
      : this._buildRiverValues(plotTypes);

    // 3. Count land tiles for density cap (passes 2-3)
    let totalLandTiles = 0;
    for (let i = 0; i < W * H; i++) {
      if (plotTypes[i] >= PLOT.LAND) totalLandTiles++;
    }

    // Track total river edges placed
    let totalRiverEdges = 0;

    // 4. Four-pass system (exact Civ4 algorithm from CvMapGenerator::addRivers)
    for (let pass = 0; pass < 4; pass++) {
      const riverSourceRange = pass <= 1
        ? RIVER_SOURCE_MIN_RIVER_RANGE
        : Math.floor(RIVER_SOURCE_MIN_RIVER_RANGE / 2);
      const seaWaterRange = pass <= 1
        ? RIVER_SOURCE_MIN_SEAWATER_RANGE
        : Math.floor(RIVER_SOURCE_MIN_SEAWATER_RANGE / 2);

      for (let i = 0; i < W * H; i++) {
        const plot = plotTypes[i];
        if (plot === PLOT.OCEAN || plot === PLOT.COAST) continue;

        const x = i % W;
        const y = Math.floor(i / W);

        // Pass-specific filters (exact Civ4 conditions from lines 347-350)
        if (pass === 0) {
          // Hills and peaks only
          if (plot !== PLOT.HILLS && plot !== PLOT.PEAK) continue;
        } else if (pass === 1) {
          // Non-coastal land, 1/8 random chance
          if (this._isCoastalLand(plotTypes, x, y)) continue;
          if (rng.nextInt(0, 7) !== 0) continue;
        } else if (pass === 2) {
          // Hills/peaks + area density cap
          if (plot !== PLOT.HILLS && plot !== PLOT.PEAK) continue;
          if (totalRiverEdges >= Math.floor(totalLandTiles / PLOTS_PER_RIVER_EDGE) + 1) continue;
        } else {
          // Pass 3: any land + area density cap
          if (totalRiverEdges >= Math.floor(totalLandTiles / PLOTS_PER_RIVER_EDGE) + 1) continue;
        }

        // Check: no fresh water (river) within riverSourceRange
        // (Civ4: !GC.getMapINLINE().findWater(pLoopPlot, iRiverSourceRange, true))
        if (this._findFreshWater(rivers, x, y, riverSourceRange)) continue;

        // Check: no sea water within seaWaterRange
        // (Civ4: !GC.getMapINLINE().findWater(pLoopPlot, iSeaWaterRange, false))
        if (this._findSeaWater(plotTypes, x, y, seaWaterRange)) continue;

        // Find start direction (lowest-value cardinal neighbor)
        const direction = this._scriptGetRiverStartCardinalDirection
          ? this._scriptGetRiverStartCardinalDirection(x, y, plotTypes)
          : this.getRiverStartCardinalDirection(x, y, plotTypes, riverValues);
        if (direction === null) continue;

        // Trace river and count edges placed
        const edgesBefore = totalRiverEdges;
        totalRiverEdges += this._doRiver(x, y, direction, direction, plotTypes, riverValues, rivers);
      }
    }

    return rivers;
  }

  /**
   * Detect lakes — enclosed single-tile ocean bodies surrounded by land.
   *
   * @param {number[]} plotTypes - 1D array of PLOT enum values (y * width + x)
   * @returns {boolean[]} 1D boolean array indicating lake tiles
   */
  addLakes(plotTypes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const lakes = new Array(W * H).fill(false);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (plotTypes[idx] !== PLOT.OCEAN) continue;

        let allLand = true;
        for (let dy = -1; dy <= 1 && allLand; dy++) {
          for (let dx = -1; dx <= 1 && allLand; dx++) {
            if (dx === 0 && dy === 0) continue;

            let nx = x + dx;
            let ny = y + dy;

            if (this.wrapX) {
              nx = ((nx % W) + W) % W;
            } else if (nx < 0 || nx >= W) {
              continue;
            }

            if (this.wrapY) {
              ny = ((ny % H) + H) % H;
            } else if (ny < 0 || ny >= H) {
              continue;
            }

            const nPlot = plotTypes[ny * W + nx];
            if (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST) {
              allLand = false;
            }
          }
        }

        if (allLand) {
          lakes[idx] = true;
        }
      }
    }

    return lakes;
  }

  // ==========================================================================
  // RIVER VALUE SYSTEM (CvMapGenerator::getRiverValueAtPlot)
  // ==========================================================================

  /**
   * Pre-compute river values for all tiles.
   *
   * Exact port of CvMapGenerator::getRiverValueAtPlot():
   *   value = (NUM_PLOT_TYPES - plotType) * 20
   *         + sum over 8 directions: (NUM_PLOT_TYPES - adjPlotType)
   *         + deterministicRandom(x, y, 10)
   *
   * Civ4 PlotTypes: PEAK=0, HILLS=1, LAND=2, OCEAN=3, NUM=4
   * Lower values = closer to water = rivers flow toward them.
   *
   * @param {number[]} plotTypes - 1D plot type array
   * @returns {number[]} 1D river value array
   */
  _buildRiverValues(plotTypes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const values = new Array(W * H);

    // Map our plot types to Civ4's (NUM_PLOT_TYPES - civ4Type) values:
    // Our PEAK(4)→4, HILLS(3)→3, LAND(2)→2, COAST(1)→1, OCEAN(0)→1
    const selfWeight = [1, 1, 2, 3, 4]; // indexed by our PLOT enum
    const neighborWeight = [1, 1, 2, 3, 4]; // same mapping

    // 8-direction offsets (N, NE, E, SE, S, SW, W, NW)
    const dirs8 = [
      [0, -1], [1, -1], [1, 0], [1, 1],
      [0, 1], [-1, 1], [-1, 0], [-1, -1]
    ];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const plot = plotTypes[idx];

        // Self contribution: (NUM_PLOT_TYPES - plotType) * 20
        let iSum = selfWeight[plot] * 20;

        // 8-neighbor contribution
        for (const [dx, dy] of dirs8) {
          let nx = x + dx;
          let ny = y + dy;

          if (this.wrapX) {
            nx = ((nx % W) + W) % W;
          } else if (nx < 0 || nx >= W) {
            // Off-map: NUM_PLOT_TYPES * 10 = 40 (from Civ4 line 1155)
            iSum += 40;
            continue;
          }

          if (this.wrapY) {
            ny = ((ny % H) + H) % H;
          } else if (ny < 0 || ny >= H) {
            iSum += 40;
            continue;
          }

          iSum += neighborWeight[plotTypes[ny * W + nx]];
        }

        // Deterministic random seeded by coordinates (Civ4 line 1159-1161)
        // riverRand.init(x * 43251267 + y * 8273903); iSum += riverRand.get(10)
        iSum += Math.abs((x * 43251267 + y * 8273903) | 0) % 10;

        values[idx] = iSum;
      }
    }

    return values;
  }

  /**
   * Build river values using the script's getRiverAltitude callback.
   * Called when a script provides a custom altitude function per-plot.
   *
   * @param {number[]} plotTypes - 1D plot type array
   * @returns {number[]} 1D river value array
   */
  _buildRiverValuesFromCallback(plotTypes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const values = new Array(W * H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        values[y * W + x] = this._scriptGetRiverAltitude(x, y, plotTypes);
      }
    }

    return values;
  }

  // ==========================================================================
  // RIVER START DIRECTION
  // ==========================================================================

  /**
   * Determine the best direction to start a river from this tile.
   * Picks the cardinal neighbor with the lowest river value.
   * Only starts if a neighbor is strictly lower than current value.
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number[]} riverValues - 1D river value array
   * @returns {number|null} CARDINAL direction or null
   */
  getRiverStartCardinalDirection(x, y, plotTypes, riverValues) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const thisVal = riverValues[y * W + x];

    let bestDir = null;
    let lowestVal = thisVal; // only start if neighbor is lower

    for (const dir of [CARDINAL.NORTH, CARDINAL.EAST, CARDINAL.SOUTH, CARDINAL.WEST]) {
      const [dx, dy] = CARDINAL_OFFSETS[dir];
      let nx = x + dx;
      let ny = y + dy;

      if (this.wrapX) {
        nx = ((nx % W) + W) % W;
      } else if (nx < 0 || nx >= W) {
        continue;
      }
      if (this.wrapY) {
        ny = ((ny % H) + H) % H;
      } else if (ny < 0 || ny >= H) {
        continue;
      }

      const nVal = riverValues[ny * W + nx];
      if (nVal < lowestVal) {
        lowestVal = nVal;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  // ==========================================================================
  // RIVER TRACING (CvMapGenerator::doRiver)
  // ==========================================================================

  /**
   * Trace a river from a starting tile, placing edge segments until reaching
   * water or a dead end.
   *
   * Matches CvMapGenerator::doRiver() logic:
   * - iBestValue = MAX_INT (always find lowest neighbor)
   * - Excludes opposite-to-original AND opposite-to-last directions
   * - Stops at water tiles, existing river edges, or loops
   *
   * @param {number} startX - Starting tile X
   * @param {number} startY - Starting tile Y
   * @param {number} startDir - Initial CARDINAL direction
   * @param {number} originalDir - Original direction (never reversed)
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number[]} riverValues - 1D river value array
   * @param {Object[]} rivers - 1D river data array (mutated in-place)
   * @returns {number} Number of river edges placed
   */
  _doRiver(startX, startY, startDir, originalDir, plotTypes, riverValues, rivers) {
    let x = startX;
    let y = startY;
    let lastDir = startDir;
    let edgesPlaced = 0;

    const maxSteps = this.iNumPlotsX + this.iNumPlotsY;
    const visited = new Set();

    for (let step = 0; step < maxSteps; step++) {
      const key = `${x},${y},${lastDir}`;
      if (visited.has(key)) break;
      visited.add(key);

      // Compute next position
      const [dx, dy] = CARDINAL_OFFSETS[lastDir];
      let nx = x + dx;
      let ny = y + dy;

      nx = this._wrapX(nx);
      if (ny < 0 || ny >= this.iNumPlotsY) break;
      if (!this.wrapX && (nx < 0 || nx >= this.iNumPlotsX)) break;

      const nIdx = ny * this.iNumPlotsX + nx;

      // Stop if destination is water (river has reached the coast)
      if (plotTypes[nIdx] === PLOT.OCEAN || plotTypes[nIdx] === PLOT.COAST) break;

      // Check if this edge already has a river (avoid crossing)
      if (this._edgeHasRiver(x, y, lastDir, rivers)) break;

      // Determine next direction from (nx, ny)
      // Civ4: iBestValue = MAX_INT, excludes opposite-to-original AND opposite-to-last
      const nextDir = this._getBestRiverDirection(nx, ny, lastDir, originalDir, plotTypes, riverValues, rivers);

      // Compute flow direction for this edge
      const flowDir = this._getFlowDirection(lastDir, nextDir);

      // Place the river edge
      this._placeRiverEdge(x, y, nx, ny, lastDir, flowDir, rivers);
      edgesPlaced++;

      // Stop if no valid continuation
      if (nextDir === null) break;

      x = nx;
      y = ny;
      lastDir = nextDir;
    }

    return edgesPlaced;
  }

  /**
   * Find the best direction to continue the river from (x,y).
   *
   * Exact port of CvMapGenerator::doRiver() direction selection (lines 493-517):
   * - iBestValue = MAX_INT (always find lowest, never stops mid-land)
   * - Excludes opposite-to-original direction (never fully reverses)
   * - Excludes opposite-to-last direction (no immediate U-turn)
   *
   * @param {number} x - Current tile X
   * @param {number} y - Current tile Y
   * @param {number} lastDir - Direction we came from
   * @param {number} originalDir - Original river direction (never reversed)
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number[]} riverValues - 1D river value array
   * @param {Object[]} rivers - 1D river data array
   * @returns {number|null} Best CARDINAL direction or null
   */
  _getBestRiverDirection(x, y, lastDir, originalDir, plotTypes, riverValues, rivers) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const oppositeOfLast = (lastDir + 2) % 4;
    const oppositeOfOriginal = (originalDir + 2) % 4;

    let bestDir = null;
    let lowestVal = Infinity; // Civ4: iBestValue = MAX_INT

    for (const dir of [CARDINAL.NORTH, CARDINAL.EAST, CARDINAL.SOUTH, CARDINAL.WEST]) {
      // Civ4 lines 499-501: skip opposite of original AND opposite of last
      if (dir === oppositeOfOriginal) continue;
      if (dir === oppositeOfLast) continue;

      const [dx, dy] = CARDINAL_OFFSETS[dir];
      let nx = x + dx;
      let ny = y + dy;

      nx = this._wrapX(nx);
      if (ny < 0 || ny >= H) continue;
      if (!this.wrapX && (nx < 0 || nx >= W)) continue;

      const nIdx = ny * W + nx;
      const nVal = riverValues[nIdx];

      if (nVal < lowestVal) {
        lowestVal = nVal;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  // ==========================================================================
  // EDGE PLACEMENT
  // ==========================================================================

  /**
   * Place a river edge between two adjacent tiles.
   *
   * Edge-to-tile mapping (y=0 is north, y increases southward):
   *
   * | Movement  | Edge Type   | Stored On          | Flow Field        |
   * |-----------|-------------|--------------------|-------------------|
   * | NORTH     | isNOfRiver  | (fromX, fromY)     | riverNSDirection  |
   * | SOUTH     | isNOfRiver  | (toX, toY)         | riverNSDirection  |
   * | EAST      | isWOfRiver  | (toX, toY)         | riverWEDirection  |
   * | WEST      | isWOfRiver  | (fromX, fromY)     | riverWEDirection  |
   */
  _placeRiverEdge(fromX, fromY, toX, toY, direction, flowDir, rivers) {
    const W = this.iNumPlotsX;

    switch (direction) {
      case CARDINAL.NORTH: {
        const idx = fromY * W + fromX;
        rivers[idx].isNOfRiver = true;
        rivers[idx].riverNSDirection = flowDir;
        break;
      }
      case CARDINAL.SOUTH: {
        if (toY < this.iNumPlotsY) {
          const idx = toY * W + toX;
          rivers[idx].isNOfRiver = true;
          rivers[idx].riverNSDirection = flowDir;
        }
        break;
      }
      case CARDINAL.EAST: {
        const idx = toY * W + toX;
        rivers[idx].isWOfRiver = true;
        rivers[idx].riverWEDirection = flowDir;
        break;
      }
      case CARDINAL.WEST: {
        const idx = fromY * W + fromX;
        rivers[idx].isWOfRiver = true;
        rivers[idx].riverWEDirection = flowDir;
        break;
      }
    }
  }

  /**
   * Compute flow direction for a river edge based on Civ4's direction tables.
   */
  _getFlowDirection(lastDir, nextDir) {
    switch (lastDir) {
      case CARDINAL.NORTH:
        return (nextDir === CARDINAL.EAST) ? FLOW.EAST : FLOW.WEST;
      case CARDINAL.SOUTH:
        return (nextDir === CARDINAL.WEST) ? FLOW.WEST : FLOW.EAST;
      case CARDINAL.EAST:
        return (nextDir === CARDINAL.SOUTH) ? FLOW.SOUTH : FLOW.NORTH;
      case CARDINAL.WEST:
        return (nextDir === CARDINAL.NORTH) ? FLOW.NORTH : FLOW.SOUTH;
    }
    return null;
  }

  // ==========================================================================
  // WATER / RIVER DETECTION (CvMap::findWater)
  // ==========================================================================

  /**
   * Check if there's fresh water (a river) within range of (x,y).
   * Port of CvMap::findWater(pPlot, iRange, true).
   *
   * A tile has fresh water if any of its 4 edges has a river segment:
   * - isNOfRiver on this tile (north edge)
   * - isWOfRiver on this tile (west edge)
   * - isNOfRiver on south neighbor (south edge)
   * - isWOfRiver on east neighbor (east edge)
   *
   * @param {Object[]} rivers - 1D river data array
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} range - Search radius
   * @returns {boolean} True if fresh water found within range
   */
  _findFreshWater(rivers, x, y, range) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) {
          nx = ((nx % W) + W) % W;
        } else if (nx < 0 || nx >= W) {
          continue;
        }
        if (ny < 0 || ny >= H) continue;

        // Check if this tile is adjacent to a river (isFreshWater)
        const r = rivers[ny * W + nx];
        if (r.isNOfRiver || r.isWOfRiver) return true;

        // Also check south neighbor's north edge and east neighbor's west edge
        if (ny + 1 < H && rivers[(ny + 1) * W + nx].isNOfRiver) return true;

        let ex = nx + 1;
        if (this.wrapX) ex = ((ex % W) + W) % W;
        if (ex < W) {
          if (rivers[ny * W + ex].isWOfRiver) return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if there's sea water (ocean/coast) within range of (x,y).
   * Port of CvMap::findWater(pPlot, iRange, false).
   *
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} range - Search radius
   * @returns {boolean} True if sea water found within range
   */
  _findSeaWater(plotTypes, x, y, range) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) {
          nx = ((nx % W) + W) % W;
        } else if (nx < 0 || nx >= W) {
          continue;
        }
        if (ny < 0 || ny >= H) continue;

        const plot = plotTypes[ny * W + nx];
        if (plot === PLOT.OCEAN || plot === PLOT.COAST) return true;
      }
    }

    return false;
  }

  /**
   * Check if a land tile is coastal (has at least one water cardinal neighbor).
   *
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number} x - Tile X
   * @param {number} y - Tile Y
   * @returns {boolean} True if coastal land
   */
  _isCoastalLand(plotTypes, x, y) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      let nx = x + dx;
      let ny = y + dy;

      if (this.wrapX) {
        nx = ((nx % W) + W) % W;
      } else if (nx < 0 || nx >= W) {
        continue;
      }
      if (ny < 0 || ny >= H) continue;

      const plot = plotTypes[ny * W + nx];
      if (plot === PLOT.OCEAN || plot === PLOT.COAST) return true;
    }

    return false;
  }

  // ==========================================================================
  // EDGE / TILE QUERIES
  // ==========================================================================

  /**
   * Check if a specific edge already has a river segment.
   */
  _edgeHasRiver(x, y, direction, rivers) {
    const W = this.iNumPlotsX;

    switch (direction) {
      case CARDINAL.NORTH:
        return rivers[y * W + x].isNOfRiver;
      case CARDINAL.SOUTH: {
        const sy = y + 1;
        if (sy >= this.iNumPlotsY) return false;
        return rivers[sy * W + x].isNOfRiver;
      }
      case CARDINAL.WEST:
        return rivers[y * W + x].isWOfRiver;
      case CARDINAL.EAST: {
        const ex = this._wrapX(x + 1);
        if (!this.wrapX && ex >= this.iNumPlotsX) return false;
        return rivers[y * W + ex].isWOfRiver;
      }
    }
    return false;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Wrap X coordinate for horizontal map wrapping.
   */
  _wrapX(x) {
    if (!this.wrapX) return x;
    return ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
  }

  /**
   * Convert a 1D river array to 2D for backward compatibility.
   */
  toRivers2D(rivers) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    return Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => rivers[y * W + x])
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
