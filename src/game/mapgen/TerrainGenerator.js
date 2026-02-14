/**
 * TerrainGenerator - Civ4-compatible terrain type assignment
 *
 * Assigns terrain types (grassland, plains, desert, tundra, snow) to land tiles
 * based on latitude bands + fractal noise thresholds, with a mountain terrain
 * override for peaks/hills at high latitudes.
 *
 * This is a direct port of CvMapGeneratorUtil.TerrainGenerator from Civ4 BTS.
 * Subclasses can override getLatitudeAtPlot() for latitude compression and
 * generateTerrainAtPlot() for completely custom terrain logic.
 *
 * References:
 * - Civ4 SDK: CvMapGeneratorUtil.py TerrainGenerator class
 * - docs/Civ4-Map-Generation-Complete.md §TerrainGenerator
 * - docs/MapGen-Rewrite-Plan.md §Milestone 5
 */

import { CyFractal, FRAC_WRAP_X, FRAC_WRAP_Y, FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS } from './CyFractal.js';
import { PLOT } from './FractalWorld.js';
// clamp no longer needed — getLatitudeAtPlot now uses inline min/max matching Civ4

// ============================================================================
// TERRAIN TYPES
// ============================================================================

/**
 * Terrain type constants matching Civ4's TerrainTypes enum.
 * String values for readability and compatibility with the rendering pipeline.
 */
export const TERRAIN = {
  OCEAN: 'ocean',
  COAST: 'coast',
  GRASSLAND: 'grassland',
  PLAINS: 'plains',
  DESERT: 'desert',
  TUNDRA: 'tundra',
  SNOW: 'snow'
};

// ============================================================================
// TERRAIN GENERATOR CLASS
// ============================================================================

/**
 * Assigns terrain types to a plot array using Civ4's latitude-band model.
 *
 * Four CyFractal instances control terrain distribution:
 * - desert fractal: determines which tiles in the desert latitude band are desert
 * - plains fractal: determines which remaining tiles become plains (vs grass)
 * - variation fractal: adds ±0.1 jitter to latitude for organic boundaries
 * - mountain fractal: overrides some hills/peaks at high latitudes to snow
 *
 * @example
 * const tg = new TerrainGenerator(width, height);
 * const terrain = tg.generateTerrain(rng, plotTypes);
 * const terrain2D = tg.toTerrain2D(terrain);
 */
export class TerrainGenerator {

  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} [settings={}] - Configuration overrides
   * @param {number} [settings.iDesertPercent=32] - % of fractal range allocated to desert
   * @param {number} [settings.iPlainsPercent=18] - % of fractal range allocated to plains
   * @param {number} [settings.fSnowLatitude=0.7] - Latitude >= this → snow
   * @param {number} [settings.fTundraLatitude=0.6] - Latitude >= this → tundra
   * @param {number} [settings.fGrassLatitude=0.1] - Latitude < this → forced grass
   * @param {number} [settings.fDesertBottomLatitude=0.2] - Desert only above this latitude
   * @param {number} [settings.fDesertTopLatitude=0.5] - Desert only below this latitude
   * @param {number} [settings.grain_amount=4] - Base grain for terrain fractals
   * @param {number} [settings.fracXExp=7] - Fractal X-axis resolution exponent
   * @param {number} [settings.fracYExp=6] - Fractal Y-axis resolution exponent
   * @param {boolean} [settings.wrapX=true] - Whether map wraps horizontally
   * @param {boolean} [settings.wrapY=false] - Whether map wraps vertically
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    // Map dimensions
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;

    // Terrain distribution parameters (Civ4 defaults)
    this.iDesertPercent = settings.iDesertPercent || 32;
    this.iPlainsPercent = settings.iPlainsPercent || 18;

    // Latitude thresholds
    this.fSnowLatitude = settings.fSnowLatitude || 0.7;
    this.fTundraLatitude = settings.fTundraLatitude || 0.6;
    this.fGrassLatitude = settings.fGrassLatitude || 0.1;
    this.fDesertBottomLatitude = settings.fDesertBottomLatitude || 0.2;
    this.fDesertTopLatitude = settings.fDesertTopLatitude || 0.5;

    // Fractal configuration
    this.grain_amount = settings.grain_amount || 4;
    // CyFractal now uses full grid resolution (2^fracXExp+1) regardless of
    // grain, matching Civ4 behavior. Grain controls seed spacing, not grid size.
    const fracXExp = settings.fracXExp || 7;
    const fracYExp = settings.fracYExp || 6;

    // Map size key for exact XML grain lookup
    this.mapSize = settings.mapSize || 'standard';

    // Map wrapping
    this.wrapX = settings.wrapX !== false;
    this.wrapY = settings.wrapY || false;

    // Computed percentile thresholds (Civ4 formula)
    // Desert occupies top iDesertPercent% of desert fractal
    this.iDesertBottomPercent = Math.max(0, 100 - this.iDesertPercent);          // 68
    // Plains occupies top (iDesertPercent + iPlainsPercent)% minus desert range
    this.iPlainsBottomPercent = Math.max(0, 100 - this.iDesertPercent - this.iPlainsPercent);  // 50

    // Create fractal instances (initialized later in initFractals)
    // Civ4 has 3 fractals: deserts, plains, variation (no mountain fractal)
    this.desertFrac = new CyFractal(fracXExp, fracYExp);
    this.plainsFrac = new CyFractal(fracXExp, fracYExp);
    this.variationFrac = new CyFractal(fracXExp, fracYExp);

    // Cached height thresholds (set during generateTerrain)
    this._iDesertBottom = 0;
    this._iDesertTop = 0;
    this._iPlainsBottom = 0;
    this._iPlainsTop = 0;
  }

  // ==========================================================================
  // FRACTAL INITIALIZATION
  // ==========================================================================

  /**
   * Get grain adjustment based on map size.
   * Exact values from CIV4WorldInfo.xml TerrainGrainChange.
   * @returns {number} Grain adjustment
   */
  getWorldSizeGrainAdjust() {
    const grainBySize = {
      duel: 0, tiny: 0, small: 0,
      standard: 1, large: 1, huge: 1
    };
    return grainBySize[this.mapSize] ?? 1;
  }

  /**
   * Initialize all four terrain fractals with appropriate grains and flags.
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  initFractals(rng) {
    let flags = 0;
    if (this.wrapX) flags |= FRAC_WRAP_X;
    if (this.wrapY) flags |= FRAC_WRAP_Y;

    const grainAdjust = this.getWorldSizeGrainAdjust();
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // Desert fractal: base grain
    this.desertFrac.fracInit(
      W, H, this.grain_amount + grainAdjust, rng, flags
    );

    // Plains fractal: one grain finer than desert
    this.plainsFrac.fracInit(
      W, H, this.grain_amount + 1 + grainAdjust, rng, flags
    );

    // Variation fractal: same grain as desert (Civ4: self.grain_amount, not +1)
    this.variationFrac.fracInit(
      W, H, this.grain_amount + grainAdjust, rng, flags
    );
  }

  // ==========================================================================
  // LATITUDE CALCULATION
  // ==========================================================================

  /**
   * Compute latitude at a map tile. 0.0 at equator, 1.0 at poles.
   * Includes fractal variation for organic terrain boundaries.
   *
   * Subclasses override this for latitude compression/remapping:
   * - Inland Sea: lat = 0.07 + 0.56 * lat
   * - Ice Age: lat *= 0.6
   * - Balanced: lat = 0.05 + 0.75 * lat
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {number} Latitude in [0.0, 1.0]
   */
  getLatitudeAtPlot(x, y) {
    // Civ4: lat = abs((H/2) - y) / (H/2)
    // 0.0 = equator (center of map), 1.0 = pole (top/bottom)
    const halfH = this.iNumPlotsY / 2;
    let lat = Math.abs(halfH - y) / halfH;

    // Adjust latitude using variation fractal, to mix things up:
    // Civ4: lat += (128 - self.variation.getHeight(iX, iY))/(255.0 * 5.0)
    lat += (128 - this.variationFrac.getHeight(x, y)) / (255.0 * 5.0);

    // Limit to the range [0, 1]
    if (lat < 0) lat = 0.0;
    if (lat > 1) lat = 1.0;

    return lat;
  }

  // ==========================================================================
  // TERRAIN ASSIGNMENT
  // ==========================================================================

  /**
   * Determine terrain type for a single tile. Exact Civ4 algorithm.
   *
   * Order of operations:
   * 1. Water tiles → ocean/coast (unchanged)
   * 2. Latitude bands: snow → tundra → forced grass
   * 3. Desert/Plains fractal zone (between grass and tundra latitudes)
   * 4. Mountain terrain override (hills/peaks at tundra+ lat may become snow)
   *
   * Subclasses override this for completely custom terrain logic
   * (e.g., Oasis 4-zone bands, Hub 2-zone system, Fantasy fractal bands).
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number} plotType - Plot type from PLOT enum
   * @returns {string} Terrain type from TERRAIN enum
   */
  generateTerrainAtPlot(x, y, plotType, existingTerrain) {
    // 1. Water tiles: return existing terrain (ocean or coast, already set)
    if (plotType === PLOT.OCEAN) {
      return existingTerrain;
    }

    // 2. Default terrain
    let terrain = TERRAIN.GRASSLAND;

    // 3. Latitude-based assignment
    const lat = this.getLatitudeAtPlot(x, y);

    if (lat >= this.fSnowLatitude) {
      terrain = TERRAIN.SNOW;
    } else if (lat >= this.fTundraLatitude) {
      terrain = TERRAIN.TUNDRA;
    } else if (lat < this.fGrassLatitude) {
      terrain = TERRAIN.GRASSLAND;  // forced grass near equator
    } else {
      // 4. Desert/Plains fractal zone (check both bottom AND top thresholds)
      const desertVal = this.desertFrac.getHeight(x, y);
      const plainsVal = this.plainsFrac.getHeight(x, y);

      if (desertVal >= this._iDesertBottom && desertVal <= this._iDesertTop &&
          lat >= this.fDesertBottomLatitude &&
          lat < this.fDesertTopLatitude) {
        terrain = TERRAIN.DESERT;
      } else if (plainsVal >= this._iPlainsBottom && plainsVal <= this._iPlainsTop) {
        terrain = TERRAIN.PLAINS;
      }
      // else: stays GRASSLAND
    }

    return terrain;
  }

  /**
   * Generate terrain types for the entire map.
   *
   * Takes a 1D plot type array (from FractalWorld/HintedWorld/MultilayeredFractal)
   * and returns a 1D terrain array of the same size.
   *
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   * @param {number[]} plotTypes - 1D array of PLOT enum values (y * width + x)
   * @returns {string[]} 1D array of TERRAIN enum values (y * width + x)
   */
  generateTerrain(rng, plotTypes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // Initialize all four fractals
    this.initFractals(rng);

    // Compute height thresholds from fractal percentiles (both bottom AND top)
    this._iDesertBottom = this.desertFrac.getHeightFromPercent(this.iDesertBottomPercent);
    this._iDesertTop = this.desertFrac.getHeightFromPercent(100);
    this._iPlainsBottom = this.plainsFrac.getHeightFromPercent(this.iPlainsBottomPercent);
    this._iPlainsTop = this.plainsFrac.getHeightFromPercent(100);

    // Pre-populate water terrain: ocean tiles within 2 tiles of land → coast, else ocean.
    // Civ4's C++ engine assigns coast to water tiles within 2-tile radius of land.
    const terrain = new Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (plotTypes[i] === PLOT.OCEAN) {
        const x = i % W;
        const y = Math.floor(i / W);
        let nearLand = false;
        for (let dy = -2; dy <= 2 && !nearLand; dy++) {
          for (let dx = -2; dx <= 2 && !nearLand; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx, ny = y + dy;
            if (this.wrapX) nx = ((nx % W) + W) % W;
            else if (nx < 0 || nx >= W) continue;
            if (this.wrapY) ny = ((ny % H) + H) % H;
            else if (ny < 0 || ny >= H) continue;
            const nPlot = plotTypes[ny * W + nx];
            if (nPlot === PLOT.LAND || nPlot === PLOT.HILLS || nPlot === PLOT.PEAK) {
              nearLand = true;
            }
          }
        }
        terrain[i] = nearLand ? TERRAIN.COAST : TERRAIN.OCEAN;
      } else {
        terrain[i] = null;
      }
    }

    // Assign terrain to each tile
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        terrain[idx] = this.generateTerrainAtPlot(x, y, plotTypes[idx], terrain[idx]);
      }
    }

    return terrain;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Convert a 1D terrain array to 2D for backward compatibility.
   * @param {string[]} terrainArray - 1D terrain array (y * width + x)
   * @returns {string[][]} 2D terrain array [y][x]
   */
  toTerrain2D(terrainArray) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    return Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) =>
        terrainArray[y * W + x]
      )
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export for convenience (consumers can import from this module)
export { PLOT } from './FractalWorld.js';
export {
  FRAC_POLAR,
  FRAC_CENTER_RIFT,
  FRAC_INVERT_HEIGHTS,
  FRAC_WRAP_X,
  FRAC_WRAP_Y
} from './CyFractal.js';
