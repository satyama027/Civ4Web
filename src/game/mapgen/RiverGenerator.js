/**
 * RiverGenerator - Civ4-compatible river placement and lake detection
 *
 * Ports Civ4's C++ CvMapGenerator::addRivers() and addLakes().
 * Rivers flow along tile edges (not through tile centers) using an
 * altitude-based downhill tracing algorithm.
 *
 * Pipeline order:
 *   generatePlotTypes() → generateTerrain() → addRivers() → addLakes() → addFeatures()
 *
 * Subclasses can override:
 * - getRiverStartCardinalDirection() for custom river source selection
 * - getRiverAltitude() for custom altitude formulas (e.g., Inland Sea)
 *
 * References:
 * - Civ4 SDK: CvMapGenerator::addRivers(), doRiver(), getRiverStartCardinalDirection()
 * - Civ4 SDK: CvMapGenerator::addLakes()
 * - docs/Milestone-7-RiverGenerator-Spec.md
 * - docs/MapGen-Rewrite-Plan.md §Milestone 7
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
// RIVER GENERATOR CLASS
// ============================================================================

/**
 * Places rivers and detects lakes on a map using Civ4's altitude-based model.
 *
 * Rivers start at the highest-altitude land tiles and trace downhill toward
 * water, placing edge segments along tile boundaries. Each tile stores river
 * data on its north and west edges.
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
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.wrapX = settings.wrapX !== false;
    this.wrapY = settings.wrapY || false;
  }

  // ==========================================================================
  // MAIN ENTRY POINTS
  // ==========================================================================

  /**
   * Place rivers on the map using Civ4's altitude-based downhill tracing.
   *
   * Algorithm:
   * 1. Build altitude map from plot types, terrain, and features
   * 2. Sort all tiles by altitude (highest first)
   * 3. For each tile: if land, no existing river, and has a downhill neighbor,
   *    trace a river from it to the coast
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

    // 2. Build altitude map
    const altitudes = this._buildAltitudeMap(rng, plotTypes, terrain, features);

    // 3. Build sorted tile list (highest altitude first)
    const tiles = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        tiles.push({ x, y, altitude: altitudes[y * W + x] });
      }
    }
    tiles.sort((a, b) => b.altitude - a.altitude);

    // 4. For each tile (highest to lowest): try to start a river
    for (const tile of tiles) {
      const { x, y } = tile;
      const idx = y * W + x;

      // Skip water tiles
      if (plotTypes[idx] === PLOT.OCEAN || plotTypes[idx] === PLOT.COAST) continue;

      // Skip tiles that already have a river
      if (this._tileHasRiver(rivers, x, y)) continue;

      // Find best start direction
      const direction = this.getRiverStartCardinalDirection(x, y, plotTypes, altitudes);
      if (direction === null) continue;

      // Trace river from this tile
      this._doRiver(x, y, direction, plotTypes, altitudes, rivers);
    }

    return rivers;
  }

  /**
   * Detect lakes — enclosed single-tile ocean bodies surrounded by land.
   *
   * In Civ4, lakes are ocean tiles in a "lake area". Since we don't have
   * Civ4's area system, a boolean array marks which tiles are lakes.
   * Consumers check lakes[idx] for fresh water access.
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

        // Check if ALL 8 neighbors are non-water
        let allLand = true;
        for (let dy = -1; dy <= 1 && allLand; dy++) {
          for (let dx = -1; dx <= 1 && allLand; dx++) {
            if (dx === 0 && dy === 0) continue;

            let nx = x + dx;
            let ny = y + dy;

            if (this.wrapX) {
              nx = ((nx % W) + W) % W;
            } else if (nx < 0 || nx >= W) {
              continue; // off-map edge counts as "land" (not water)
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
  // ALTITUDE SYSTEM
  // ==========================================================================

  /**
   * Build the full altitude array for river flow computation.
   *
   * Altitude formula (per tile):
   *   base = Peak:4, Hills:3, Land:2, Water:1
   *   + 1 if Desert or Snow (rivers flow around these)
   *   + 1 if Jungle or Forest (rivers start in forests, only during normalizeAddRiver)
   *   final = base * 10 + random(0..9)
   *
   * The ×10 + random creates meaningful altitude separation while adding
   * slight randomness so rivers don't all follow the same deterministic path.
   *
   * @param {import('./utils.js').SeededRandom} rng - Seeded RNG
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]|null} features - 1D feature array, or null
   * @returns {number[]} 1D altitude array
   */
  _buildAltitudeMap(rng, plotTypes, terrain, features) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const altitudes = new Array(W * H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const plot = plotTypes[idx];
        const terr = terrain[idx];
        const feat = features ? features[idx] : null;

        // Base from plot type
        let alt;
        if (plot === PLOT.PEAK) alt = 4;
        else if (plot === PLOT.HILLS) alt = 3;
        else if (plot === PLOT.LAND) alt = 2;
        else alt = 1; // OCEAN or COAST

        // Terrain modifier
        if (terr === TERRAIN.DESERT || terr === TERRAIN.SNOW) alt += 1;

        // Feature modifier (only present during normalizeAddRiver, not initial pass)
        if (feat === FEATURE.JUNGLE || feat === FEATURE.FOREST) alt += 1;

        // Scale and randomize
        altitudes[idx] = alt * 10 + rng.nextInt(0, 9);
      }
    }

    return altitudes;
  }

  // ==========================================================================
  // RIVER START DIRECTION
  // ==========================================================================

  /**
   * Determine if a river should start at this tile, and in which direction.
   *
   * Finds the lowest-altitude cardinal neighbor. Prefers water neighbors
   * (river endpoints) over land neighbors. Returns null if no downhill
   * neighbor exists (tile is in a basin).
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number[]} altitudes - 1D altitude array
   * @returns {number|null} CARDINAL direction or null
   */
  getRiverStartCardinalDirection(x, y, plotTypes, altitudes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const thisAlt = altitudes[y * W + x];

    let bestDir = null;
    let lowestAlt = thisAlt; // only flow downhill
    let towardWater = false;

    for (const dir of [CARDINAL.NORTH, CARDINAL.EAST, CARDINAL.SOUTH, CARDINAL.WEST]) {
      const [dx, dy] = CARDINAL_OFFSETS[dir];
      let nx = x + dx;
      let ny = y + dy;

      // Handle wrapping
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

      const nIdx = ny * W + nx;
      const nAlt = altitudes[nIdx];
      const nPlot = plotTypes[nIdx];
      const nIsWater = (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST);

      // Prefer water neighbors (river endpoint)
      if (nIsWater && !towardWater) {
        bestDir = dir;
        lowestAlt = nAlt;
        towardWater = true;
      } else if (nIsWater && towardWater && nAlt < lowestAlt) {
        bestDir = dir;
        lowestAlt = nAlt;
      } else if (!towardWater && nAlt < lowestAlt) {
        bestDir = dir;
        lowestAlt = nAlt;
      }
    }

    return bestDir; // null if no downhill neighbor
  }

  // ==========================================================================
  // RIVER TRACING
  // ==========================================================================

  /**
   * Trace a river from a starting tile, placing edge segments until reaching
   * water or a dead end.
   *
   * At each step:
   * 1. Compute the next tile from current position + direction
   * 2. Determine the best continuation direction from the next tile
   * 3. Compute the flow direction for the edge (from Civ4's direction tables)
   * 4. Place the river edge between current and next tile
   * 5. Stop if we reached water or have no valid continuation
   *
   * @param {number} startX - Starting tile X
   * @param {number} startY - Starting tile Y
   * @param {number} startDir - Initial CARDINAL direction
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number[]} altitudes - 1D altitude array
   * @param {Object[]} rivers - 1D river data array (mutated in-place)
   */
  _doRiver(startX, startY, startDir, plotTypes, altitudes, rivers) {
    let x = startX;
    let y = startY;
    let lastDir = startDir;

    const maxSteps = this.iNumPlotsX + this.iNumPlotsY; // prevent infinite loops
    const visited = new Set();

    for (let step = 0; step < maxSteps; step++) {
      const key = `${x},${y},${lastDir}`;
      if (visited.has(key)) break; // loop detection
      visited.add(key);

      // Compute next position
      const [dx, dy] = CARDINAL_OFFSETS[lastDir];
      let nx = x + dx;
      let ny = y + dy;

      // Handle wrapping and bounds
      nx = this._wrapX(nx);
      if (ny < 0 || ny >= this.iNumPlotsY) break;
      if (!this.wrapX && (nx < 0 || nx >= this.iNumPlotsX)) break;

      const nIdx = ny * this.iNumPlotsX + nx;

      // Check if destination is water (river endpoint)
      const reachedWater = (plotTypes[nIdx] === PLOT.OCEAN || plotTypes[nIdx] === PLOT.COAST);

      // Determine next direction from (nx, ny) — null if water or dead end
      let nextDir = null;
      if (!reachedWater) {
        nextDir = this._getBestRiverDirection(nx, ny, lastDir, plotTypes, altitudes, rivers);
      }

      // Compute flow direction for this edge based on Civ4's direction tables
      const flowDir = this._getFlowDirection(lastDir, nextDir);

      // Place the river edge between (x,y) and (nx,ny)
      this._placeRiverEdge(x, y, nx, ny, lastDir, flowDir, rivers);

      // Stop if we reached water or dead end
      if (reachedWater || nextDir === null) break;

      x = nx;
      y = ny;
      lastDir = nextDir;
    }
  }

  /**
   * Find the best direction to continue the river from (x,y).
   *
   * Avoids reversing direction and crossing existing river edges.
   * Prefers water neighbors (river endpoint), then lowest altitude.
   *
   * @param {number} x - Current tile X
   * @param {number} y - Current tile Y
   * @param {number} lastDir - Direction we entered from (to avoid reversing)
   * @param {number[]} plotTypes - 1D plot type array
   * @param {number[]} altitudes - 1D altitude array
   * @param {Object[]} rivers - 1D river data array
   * @returns {number|null} Best CARDINAL direction or null
   */
  _getBestRiverDirection(x, y, lastDir, plotTypes, altitudes, rivers) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const oppositeDir = (lastDir + 2) % 4; // don't go back

    let bestDir = null;
    let lowestAlt = Infinity;
    let foundWater = false;

    for (const dir of [CARDINAL.NORTH, CARDINAL.EAST, CARDINAL.SOUTH, CARDINAL.WEST]) {
      if (dir === oppositeDir) continue; // no reversing

      const [dx, dy] = CARDINAL_OFFSETS[dir];
      let nx = x + dx;
      let ny = y + dy;

      nx = this._wrapX(nx);
      if (ny < 0 || ny >= H) continue;
      if (!this.wrapX && (nx < 0 || nx >= W)) continue;

      const nIdx = ny * W + nx;
      const nPlot = plotTypes[nIdx];
      const nAlt = altitudes[nIdx];
      const isWater = (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST);

      // Check if this edge already has a river (avoid crossing)
      if (this._edgeHasRiver(x, y, dir, rivers)) continue;

      if (isWater && !foundWater) {
        bestDir = dir;
        lowestAlt = nAlt;
        foundWater = true;
      } else if (isWater && foundWater && nAlt < lowestAlt) {
        bestDir = dir;
        lowestAlt = nAlt;
      } else if (!foundWater && nAlt < lowestAlt) {
        bestDir = dir;
        lowestAlt = nAlt;
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
   *
   * @param {number} fromX - Source tile X
   * @param {number} fromY - Source tile Y
   * @param {number} toX - Destination tile X
   * @param {number} toY - Destination tile Y
   * @param {number} direction - CARDINAL direction of movement
   * @param {string} flowDir - FLOW direction for this edge
   * @param {Object[]} rivers - 1D river data array (mutated in-place)
   */
  _placeRiverEdge(fromX, fromY, toX, toY, direction, flowDir, rivers) {
    const W = this.iNumPlotsX;

    switch (direction) {
      case CARDINAL.NORTH: {
        // Moving north: horizontal edge between (fromX, fromY) and (fromX, fromY-1)
        // isNOfRiver on (fromX, fromY) — this tile's north edge
        const idx = fromY * W + fromX;
        rivers[idx].isNOfRiver = true;
        rivers[idx].riverNSDirection = flowDir;
        break;
      }
      case CARDINAL.SOUTH: {
        // Moving south: horizontal edge between (fromX, fromY) and (fromX, fromY+1)
        // isNOfRiver on (toX, toY) — south tile's north edge
        if (toY < this.iNumPlotsY) {
          const idx = toY * W + toX;
          rivers[idx].isNOfRiver = true;
          rivers[idx].riverNSDirection = flowDir;
        }
        break;
      }
      case CARDINAL.EAST: {
        // Moving east: vertical edge between (fromX, fromY) and (fromX+1, fromY)
        // isWOfRiver on (toX, toY) — east tile's west edge
        const idx = toY * W + toX;
        rivers[idx].isWOfRiver = true;
        rivers[idx].riverWEDirection = flowDir;
        break;
      }
      case CARDINAL.WEST: {
        // Moving west: vertical edge between (fromX, fromY) and (fromX-1, fromY)
        // isWOfRiver on (fromX, fromY) — this tile's west edge
        const idx = fromY * W + fromX;
        rivers[idx].isWOfRiver = true;
        rivers[idx].riverWEDirection = flowDir;
        break;
      }
    }
  }

  /**
   * Compute flow direction for a river edge based on Civ4's direction tables.
   *
   * The flow direction is perpendicular to the movement and depends on where
   * the river turns next:
   *
   * | lastDir | nextDir→EAST | nextDir→other |
   * |---------|-------------|---------------|
   * | NORTH   | FLOW.EAST   | FLOW.WEST     |
   * | SOUTH   | FLOW.EAST   | FLOW.WEST(W)  |
   * | EAST    | FLOW.NORTH  | FLOW.SOUTH(S) |
   * | WEST    | FLOW.SOUTH  | FLOW.NORTH(N) |
   *
   * Matches Civ4's CvMapGenerator::doRiver() switch tables exactly.
   *
   * @param {number} lastDir - CARDINAL direction of current movement
   * @param {number|null} nextDir - CARDINAL direction of next movement, or null
   * @returns {string} FLOW direction for the edge
   */
  _getFlowDirection(lastDir, nextDir) {
    switch (lastDir) {
      case CARDINAL.NORTH:
        // Horizontal edge: flow EAST only if turning east, otherwise WEST
        return (nextDir === CARDINAL.EAST) ? FLOW.EAST : FLOW.WEST;

      case CARDINAL.SOUTH:
        // Horizontal edge: flow WEST only if turning west, otherwise EAST
        return (nextDir === CARDINAL.WEST) ? FLOW.WEST : FLOW.EAST;

      case CARDINAL.EAST:
        // Vertical edge: flow SOUTH only if turning south, otherwise NORTH
        return (nextDir === CARDINAL.SOUTH) ? FLOW.SOUTH : FLOW.NORTH;

      case CARDINAL.WEST:
        // Vertical edge: flow NORTH only if turning north, otherwise SOUTH
        return (nextDir === CARDINAL.NORTH) ? FLOW.NORTH : FLOW.SOUTH;
    }
    return null;
  }

  // ==========================================================================
  // EDGE / TILE QUERIES
  // ==========================================================================

  /**
   * Check if a specific edge already has a river segment.
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number} direction - CARDINAL direction of the edge to check
   * @param {Object[]} rivers - 1D river data array
   * @returns {boolean} True if the edge has a river
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

  /**
   * Check if a tile has any river on any of its 4 edges.
   *
   * A tile has a river if any edge has a river segment:
   * - North edge: isNOfRiver on this tile
   * - West edge: isWOfRiver on this tile
   * - South edge: isNOfRiver on the tile below (y+1)
   * - East edge: isWOfRiver on the tile to the right (x+1)
   *
   * @param {Object[]} rivers - 1D river data array
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {boolean} True if tile has any river edge
   */
  _tileHasRiver(rivers, x, y) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;

    if (rivers[idx].isNOfRiver || rivers[idx].isWOfRiver) return true;

    // South neighbor's north edge
    if (y + 1 < H && rivers[(y + 1) * W + x].isNOfRiver) return true;

    // East neighbor's west edge
    const ex = this._wrapX(x + 1);
    if (this.wrapX || ex < W) {
      if (rivers[y * W + ex].isWOfRiver) return true;
    }

    return false;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Wrap X coordinate for horizontal map wrapping.
   * Returns raw value if wrapping is disabled (caller must check bounds).
   *
   * @param {number} x - X coordinate to wrap
   * @returns {number} Wrapped X coordinate
   */
  _wrapX(x) {
    if (!this.wrapX) return x;
    return ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
  }

  /**
   * Convert a 1D river array to 2D for backward compatibility.
   * @param {Object[]} rivers - 1D river array (y * width + x)
   * @returns {Object[][]} 2D river array [y][x]
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

// Re-export for convenience (consumers can import from this module)
export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
