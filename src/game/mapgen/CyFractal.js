/**
 * CyFractal - Civ4-compatible fractal generator
 *
 * Generates 2D heightmaps using diamond-square algorithm with configurable
 * grain (feature size), flags (wrapping, polar attenuation, rift), and
 * optional rift/hint modulation.
 *
 * Grid is always at full resolution (2^fracXExp+1 × 2^fracYExp+1).
 * Grain controls the initial seed spacing within that grid:
 *   seed spacing = 2^(fracExp - grain)
 * Lower grain → larger spacing → bigger features (continents).
 * Higher grain → smaller spacing → finer features (terrain detail).
 *
 * This matches Civ4's CyFractal behavior where the fractal grid size
 * never changes — only the initial seed pattern varies with grain.
 *
 * References:
 * - Civ4 SDK: CyFractal class
 * - CvMapGeneratorUtil.py: FractalWorld, HintedWorld
 */

import { clamp, lerp } from './utils.js';

// ============================================================================
// FRACTAL FLAGS
// ============================================================================

/** Attenuate heights at poles using sin(PI * y / height) */
export const FRAC_POLAR = 0x01;

/** Create vertical rift channel at map center (12% width) */
export const FRAC_CENTER_RIFT = 0x02;

/** Invert heights: maxHeight - height (used by Lakes map) */
export const FRAC_INVERT_HEIGHTS = 0x04;

/** Wrap X coordinates during diamond-square generation */
export const FRAC_WRAP_X = 0x08;

/** Wrap Y coordinates during diamond-square generation */
export const FRAC_WRAP_Y = 0x10;

// ============================================================================
// CYFRACTAL CLASS
// ============================================================================

/**
 * CyFractal - Civ4-compatible fractal heightmap generator
 */
export class CyFractal {
  /**
   * Create a new CyFractal instance
   * @param {number} fracXExp - X-axis resolution exponent (default 7 = 2^7 = 128)
   * @param {number} fracYExp - Y-axis resolution exponent (default 6 = 2^6 = 64)
   */
  constructor(fracXExp = 7, fracYExp = 6) {
    this.fracXExp = fracXExp;
    this.fracYExp = fracYExp;

    // These are set during fracInit
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.gridWidth = 0;
    this.gridHeight = 0;
    this.grid = null;

    // Cached sorted heights for percentile lookups (lazy-initialized)
    this.sortedHeights = null;
  }

  /**
   * Initialize fractal with diamond-square algorithm
   *
   * Grid is always at full resolution (2^fracXExp+1 × 2^fracYExp+1).
   * Grain controls the initial seed point spacing within the grid.
   *
   * @param {number} mapWidth - Target map width in tiles
   * @param {number} mapHeight - Target map height in tiles
   * @param {number} grain - Feature size control (1=huge features, 6=fine features)
   * @param {SeededRandom} rng - Seeded random number generator
   * @param {number} flags - Bitmask of FRAC_* flags
   */
  fracInit(mapWidth, mapHeight, grain, rng, flags = 0) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    // Grid always at full resolution (matching Civ4 behavior)
    this.gridWidth = Math.pow(2, this.fracXExp) + 1;
    this.gridHeight = Math.pow(2, this.fracYExp) + 1;

    // Grain controls initial seed spacing, not grid resolution.
    // seedStep = 2^(fracExp - grain), clamped so we always have at least 2 seeds.
    const seedExpX = clamp(this.fracXExp - grain, 0, this.fracXExp - 1);
    const seedExpY = clamp(this.fracYExp - grain, 0, this.fracYExp - 1);
    const seedStepX = Math.pow(2, seedExpX);
    const seedStepY = Math.pow(2, seedExpY);

    // Allocate grid
    this.grid = new Float64Array(this.gridWidth * this.gridHeight);

    // Generate diamond-square fractal
    const wrapX = (flags & FRAC_WRAP_X) !== 0;
    const wrapY = (flags & FRAC_WRAP_Y) !== 0;
    this._generateDiamondSquare(rng, wrapX, wrapY, seedStepX, seedStepY);

    // Normalize to [0, 255]
    this._normalizeGrid();

    // Apply flags as post-processing
    this._applyFlags(flags);

    // Invalidate cached sorted heights
    this.sortedHeights = null;
  }

  /**
   * Initialize fractal modulated by a rift fractal
   *
   * The rift fractal creates vertical ocean channels by pulling down
   * continent heights wherever rift heights are low.
   *
   * @param {CyFractal} riftsFrac - Pre-initialized rift fractal
   * @param {boolean} hasCenterRift - If true, rift has FRAC_CENTER_RIFT applied
   * @param {number} mapWidth - Target map width
   * @param {number} mapHeight - Target map height
   * @param {number} grain - Continent fractal grain
   * @param {SeededRandom} rng - Seeded RNG
   * @param {number} flags - Bitmask of FRAC_* flags
   */
  fracInitRifts(riftsFrac, hasCenterRift, mapWidth, mapHeight, grain, rng, flags = 0) {
    // Generate base fractal with only wrap flags — polar, invert, and center rift
    // are applied once after rift modulation to avoid double attenuation
    const baseFlags = flags & (FRAC_WRAP_X | FRAC_WRAP_Y);
    this.fracInit(mapWidth, mapHeight, grain, rng, baseFlags);

    // Modulate by rift fractal
    // Where rift is low, continent heights are pulled down
    const w = this.gridWidth;
    const h = this.gridHeight;

    for (let gy = 0; gy < h; gy++) {
      for (let gx = 0; gx < w; gx++) {
        // Map grid coords to map coords for rift lookup
        const mapX = (gx / Math.max(1, w - 1)) * (mapWidth - 1);
        const mapY = (gy / Math.max(1, h - 1)) * (mapHeight - 1);

        // Get rift value (0-255)
        const riftVal = riftsFrac.getHeight(mapX, mapY);

        // Modulation: low rift = low continent
        // Multiply height by (riftVal / 255) to pull down where rift is low
        const modulation = riftVal / 255;
        this.grid[gy * w + gx] *= modulation;
      }
    }

    // Re-normalize after modulation
    this._normalizeGrid();

    // Apply remaining flags (polar, invert)
    if (flags & FRAC_POLAR) {
      this._applyPolar();
    }
    if (flags & FRAC_INVERT_HEIGHTS) {
      this._applyInvert();
    }

    // Invalidate cache
    this.sortedHeights = null;
  }

  /**
   * Initialize fractal seeded by block hint data
   *
   * Used by HintedWorld for controlled continent placement.
   * Hint values >= 192 indicate land, < 192 indicate water.
   *
   * @param {number[]} hintData - Flat array of hint values [0-255]
   * @param {number} hintWidth - Hint grid width (e.g., 16)
   * @param {number} hintHeight - Hint grid height (e.g., 8)
   * @param {number} mapWidth - Target map width
   * @param {number} mapHeight - Target map height
   * @param {number} grain - Fractal grain
   * @param {SeededRandom} rng - Seeded RNG
   * @param {number} flags - Bitmask of FRAC_* flags
   */
  fracInitHints(hintData, hintWidth, hintHeight, mapWidth, mapHeight, grain, rng, flags = 0) {
    // Validate hint data
    if (!hintData || hintData.length !== hintWidth * hintHeight) {
      throw new Error(`Invalid hint data: expected ${hintWidth * hintHeight} values, got ${hintData ? hintData.length : 0}`);
    }

    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    // Grid always at full resolution
    this.gridWidth = Math.pow(2, this.fracXExp) + 1;
    this.gridHeight = Math.pow(2, this.fracYExp) + 1;

    const w = this.gridWidth;
    const h = this.gridHeight;

    // Allocate grid
    this.grid = new Float64Array(w * h);

    // Upscale hint data to grid resolution with bilinear interpolation
    const hintGrid = new Float64Array(w * h);
    for (let gy = 0; gy < h; gy++) {
      for (let gx = 0; gx < w; gx++) {
        // Map grid coords to hint coords
        const hintX = (gx / Math.max(1, w - 1)) * (hintWidth - 1);
        const hintY = (gy / Math.max(1, h - 1)) * (hintHeight - 1);

        // Bilinear interpolation from hint grid
        const x0 = Math.floor(hintX);
        const y0 = Math.floor(hintY);
        const x1 = Math.min(x0 + 1, hintWidth - 1);
        const y1 = Math.min(y0 + 1, hintHeight - 1);
        const xf = hintX - x0;
        const yf = hintY - y0;

        const tl = hintData[y0 * hintWidth + x0] || 0;
        const tr = hintData[y0 * hintWidth + x1] || 0;
        const bl = hintData[y1 * hintWidth + x0] || 0;
        const br = hintData[y1 * hintWidth + x1] || 0;

        hintGrid[gy * w + gx] = lerp(
          lerp(tl, tr, xf),
          lerp(bl, br, xf),
          yf
        );
      }
    }

    // Grain controls seed spacing for the diamond-square
    const seedExpX = clamp(this.fracXExp - grain, 0, this.fracXExp - 1);
    const seedExpY = clamp(this.fracYExp - grain, 0, this.fracYExp - 1);
    const seedStepX = Math.pow(2, seedExpX);
    const seedStepY = Math.pow(2, seedExpY);

    // Generate base diamond-square fractal
    const wrapX = (flags & FRAC_WRAP_X) !== 0;
    const wrapY = (flags & FRAC_WRAP_Y) !== 0;
    this._generateDiamondSquare(rng, wrapX, wrapY, seedStepX, seedStepY);

    // Normalize base fractal
    this._normalizeGrid();

    // Blend hint data with fractal
    // Hints bias the fractal: high hints raise heights, low hints lower them
    const LAND_THRESHOLD = 192;
    const HINT_STRENGTH = 0.7;

    for (let i = 0; i < this.grid.length; i++) {
      const hint = hintGrid[i];
      const fractal = this.grid[i];

      // Normalize hint to [-1, ~0.33] range centered on land threshold
      const hintBias = (hint - LAND_THRESHOLD) / LAND_THRESHOLD;

      // Blend: fractal + hint bias * strength * 255
      this.grid[i] = fractal + hintBias * HINT_STRENGTH * 255;
    }

    // Re-normalize after blending
    this._normalizeGrid();

    // Apply flags
    this._applyFlags(flags);

    // Invalidate cache
    this.sortedHeights = null;
  }

  /**
   * Get height at map coordinates using bilinear interpolation
   *
   * @param {number} mapX - Map X coordinate
   * @param {number} mapY - Map Y coordinate
   * @returns {number} Height value [0-255]
   */
  getHeight(mapX, mapY) {
    // Handle world wrap (X wraps, Y clamps)
    while (mapX < 0) mapX += this.mapWidth;
    while (mapX >= this.mapWidth) mapX -= this.mapWidth;
    mapY = clamp(mapY, 0, this.mapHeight - 1);

    // Map coordinates to grid coordinates
    const gridX = (mapX / Math.max(1, this.mapWidth - 1)) * (this.gridWidth - 1);
    const gridY = (mapY / Math.max(1, this.mapHeight - 1)) * (this.gridHeight - 1);

    // Bilinear interpolation
    const x0 = Math.floor(gridX);
    const y0 = Math.floor(gridY);
    const x1 = Math.min(x0 + 1, this.gridWidth - 1);
    const y1 = Math.min(y0 + 1, this.gridHeight - 1);
    const xf = gridX - x0;
    const yf = gridY - y0;

    const w = this.gridWidth;
    const tl = this.grid[y0 * w + x0];
    const tr = this.grid[y0 * w + x1];
    const bl = this.grid[y1 * w + x0];
    const br = this.grid[y1 * w + x1];

    return lerp(
      lerp(tl, tr, xf),
      lerp(bl, br, xf),
      yf
    );
  }

  /**
   * Get height value at a given percentile
   *
   * @param {number} percent - Percentile [0-100]
   * @returns {number} Height value below which `percent`% of values fall
   */
  getHeightFromPercent(percent) {
    // Lazy-build sorted heights cache
    if (!this.sortedHeights) {
      this.sortedHeights = Array.from(this.grid).sort((a, b) => a - b);
    }

    // Calculate index
    const index = Math.floor((percent / 100) * (this.sortedHeights.length - 1));
    const clampedIndex = clamp(index, 0, this.sortedHeights.length - 1);

    return this.sortedHeights[clampedIndex];
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Generate fractal using diamond-square algorithm.
   *
   * Seed points are placed at the given spacing, then diamond-square
   * fills in all intermediate grid points down to 1-cell resolution.
   *
   * @param {SeededRandom} rng
   * @param {boolean} wrapX
   * @param {boolean} wrapY
   * @param {number} seedStepX - Initial seed spacing in X
   * @param {number} seedStepY - Initial seed spacing in Y
   * @private
   */
  _generateDiamondSquare(rng, wrapX, wrapY, seedStepX, seedStepY) {
    const w = this.gridWidth;
    const h = this.gridHeight;
    const grid = this.grid;

    // 1. Place seed points at the grain-determined spacing
    for (let y = 0; y < h; y += seedStepY) {
      for (let x = 0; x < w; x += seedStepX) {
        grid[y * w + x] = rng.next();
      }
    }

    // Ensure the last column/row are seeded (they should be, since
    // seedStep always divides gridSize-1 evenly as both are powers of 2)
    // Handle wrapping: matching edges
    if (wrapX) {
      for (let y = 0; y < h; y += seedStepY) {
        grid[y * w + (w - 1)] = grid[y * w];
      }
    }
    if (wrapY) {
      for (let x = 0; x < w; x += seedStepX) {
        grid[(h - 1) * w + x] = grid[x];
      }
    }
    if (wrapX && wrapY) {
      grid[(h - 1) * w + (w - 1)] = grid[0];
    }

    // 2. Diamond-square iterations from seed spacing down to 1
    let stepX = seedStepX;
    let stepY = seedStepY;
    let scale = 1.0;
    const roughness = 0.55;

    while (stepX > 1 || stepY > 1) {
      const halfX = Math.max(1, Math.floor(stepX / 2));
      const halfY = Math.max(1, Math.floor(stepY / 2));

      // Diamond step: compute center of each cell
      for (let y = halfY; y < h - 1; y += Math.max(1, stepY)) {
        for (let x = halfX; x < w - 1; x += Math.max(1, stepX)) {
          const tl = grid[(y - halfY) * w + (x - halfX)];
          const tr = grid[(y - halfY) * w + (x + halfX)];
          const bl = grid[(y + halfY) * w + (x - halfX)];
          const br = grid[(y + halfY) * w + (x + halfX)];
          const avg = (tl + tr + bl + br) / 4;
          grid[y * w + x] = avg + (rng.next() - 0.5) * scale;
        }
      }

      // Square step: compute edge midpoints
      for (let y = 0; y < h; y += Math.max(1, halfY)) {
        // Offset X based on row to create diamond pattern
        const xStart = ((y / halfY) % 2 === 0) ? halfX : 0;
        for (let x = xStart; x < w; x += Math.max(1, stepX)) {
          let sum = 0;
          let count = 0;

          // Sample from 4 cardinal neighbors (with optional wrapping)
          // North
          if (y >= halfY) {
            sum += grid[(y - halfY) * w + x];
            count++;
          } else if (wrapY) {
            sum += grid[(h - 1 - halfY) * w + x];
            count++;
          }

          // South
          if (y + halfY < h) {
            sum += grid[(y + halfY) * w + x];
            count++;
          } else if (wrapY) {
            sum += grid[halfY * w + x];
            count++;
          }

          // West
          if (x >= halfX) {
            sum += grid[y * w + (x - halfX)];
            count++;
          } else if (wrapX) {
            sum += grid[y * w + (w - 1 - halfX)];
            count++;
          }

          // East
          if (x + halfX < w) {
            sum += grid[y * w + (x + halfX)];
            count++;
          } else if (wrapX) {
            sum += grid[y * w + halfX];
            count++;
          }

          if (count > 0) {
            grid[y * w + x] = sum / count + (rng.next() - 0.5) * scale;
          }
        }
      }

      // Halve step sizes and reduce scale
      stepX = halfX;
      stepY = halfY;
      scale *= roughness;
    }
  }

  /**
   * Normalize grid values to [0, 255] range
   * @private
   */
  _normalizeGrid() {
    const grid = this.grid;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] < min) min = grid[i];
      if (grid[i] > max) max = grid[i];
    }

    const range = max - min || 1;

    for (let i = 0; i < grid.length; i++) {
      grid[i] = ((grid[i] - min) / range) * 255;
    }
  }

  /**
   * Apply flag-based post-processing
   * @private
   */
  _applyFlags(flags) {
    if (flags & FRAC_POLAR) {
      this._applyPolar();
    }
    if (flags & FRAC_CENTER_RIFT) {
      this._applyCenterRift();
    }
    if (flags & FRAC_INVERT_HEIGHTS) {
      this._applyInvert();
    }
  }

  /**
   * Apply polar attenuation using sinusoidal falloff
   * Heights are multiplied by sin(PI * y / height)
   * @private
   */
  _applyPolar() {
    const w = this.gridWidth;
    const h = this.gridHeight;

    for (let y = 0; y < h; y++) {
      // Sinusoidal falloff: 0 at poles (y=0, y=h-1), 1 at equator
      const factor = Math.sin(Math.PI * y / (h - 1));
      for (let x = 0; x < w; x++) {
        this.grid[y * w + x] *= factor;
      }
    }

    // Re-normalize after attenuation
    this._normalizeGrid();
  }

  /**
   * Apply center rift attenuation
   * Creates ~12% width rift zone at horizontal center with quadratic falloff
   * @private
   */
  _applyCenterRift() {
    const w = this.gridWidth;
    const h = this.gridHeight;
    const centerX = w / 2;
    const riftWidth = w * 0.25; // 25% of width — wide enough to guarantee ocean channel

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Distance from center (with world wrap consideration)
        let dist = Math.abs(x - centerX);
        dist = Math.min(dist, w - dist); // Handle wrap

        if (dist < riftWidth) {
          // Cubic falloff: 0 at center, 1 at rift edge.
          // Cubic keeps strong suppression over most of the rift zone,
          // recovering only near the edge for organic coastlines.
          const t = dist / riftWidth;
          const factor = t * t * t;
          this.grid[y * w + x] *= factor;
        }
      }
    }

    // Re-normalize after attenuation
    this._normalizeGrid();
  }

  /**
   * Invert all heights (for Lakes map type)
   * @private
   */
  _applyInvert() {
    const grid = this.grid;

    for (let i = 0; i < grid.length; i++) {
      grid[i] = 255 - grid[i];
    }

    // Invalidate sorted heights cache
    this.sortedHeights = null;
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY WRAPPER
// ============================================================================

/**
 * Backward-compatible factory function
 * Matches signature of old createFractal() in mapGenerator.js
 *
 * @param {number} width - Target map width
 * @param {number} height - Target map height
 * @param {number} grain - Feature size control (1=huge, 6=fine)
 * @param {SeededRandom} rng - Seeded RNG
 * @param {number} flags - Bitmask of FRAC_* flags
 * @returns {Object} Fractal object with getHeight() and getHeightFromPercent()
 */
export function createFractal(width, height, grain, rng, flags = 0) {
  const frac = new CyFractal();
  frac.fracInit(width, height, grain, rng, flags);

  return {
    data: null, // Not exposed in new implementation (internal grid is Float64Array)
    width,
    height,
    getHeight: (x, y) => frac.getHeight(x, y),
    getHeightFromPercent: (percent) => frac.getHeightFromPercent(percent)
  };
}
