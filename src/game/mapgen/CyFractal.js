/**
 * CyFractal - Exact port of CvFractal.cpp from Civ4 BTS SDK
 *
 * Generates 2D heightmaps using diamond-square algorithm with configurable
 * grain (feature size), flags (wrapping, polar attenuation, rift), and
 * optional rift/hint modulation.
 *
 * Grid is always at full resolution (2^fracXExp+1 × 2^fracYExp+1).
 * Grain controls the initial seed spacing within that grid:
 *   seed spacing = 1 << iSmooth, where iSmooth = clamp(minExp - grain, 0, minExp)
 * Lower grain → larger spacing → bigger features (continents).
 * Higher grain → smaller spacing → finer features (terrain detail).
 *
 * Key C++ fidelity: polar edge zeroing and center rift attenuation are applied
 * INSIDE the diamond-square loop on every pass, compounding the effect through
 * refinement. This matches CvFractal::fracInitInternal() exactly.
 *
 * References:
 * - Civ4 BTS SDK: CvFractal.cpp, CvFractal.h
 * - CvMapGeneratorUtil.py: FractalWorld, HintedWorld
 */

import { clamp, lerp } from './utils.js';

// ============================================================================
// FRACTAL FLAGS (match CvFractal.h constants)
// ============================================================================

/** Set polar edges to 0 each pass (creates smooth polar attenuation) */
export const FRAC_POLAR = 0x01;

/** Create two vertical rift channels at x=0 and x=center (1/6 width each, applied per-pass) */
export const FRAC_CENTER_RIFT = 0x02;

/** Invert heights: 255 - height (used by Lakes map) */
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
   * Matches C++ CvFractal::fracInit() which delegates to fracInitInternal().
   * Polar and center rift flags are applied per-pass inside the diamond-square
   * loop, compounding their effect through refinement passes.
   *
   * @param {number} mapWidth - Target map width in tiles
   * @param {number} mapHeight - Target map height in tiles
   * @param {number} grain - Feature size control (1=huge features, 6=fine features)
   * @param {SeededRandom} rng - Seeded random number generator
   * @param {number} flags - Bitmask of FRAC_* flags
   */
  fracInit(mapWidth, mapHeight, grain, rng, flags = 0) {
    this._fracInitInternal(mapWidth, mapHeight, grain, rng, flags, null);
  }

  /**
   * Initialize fractal modulated by a rift fractal
   *
   * Matches C++ fracInit(... pRifts) path: generates base fractal with
   * per-pass polar + center rift, then applies tectonicAction from the
   * rift fractal to carve a dynamic ocean channel near x=0.
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
    this._fracInitInternal(mapWidth, mapHeight, grain, rng, flags, riftsFrac);
  }

  /**
   * Internal fractal initialization — exact port of C++ fracInitInternal()
   *
   * Flow matches C++ exactly:
   * 1. Diamond-square loop with per-pass wrap/polar/rift handling
   * 2. If pRifts provided: tectonicAction() carves dynamic rift
   * 3. If INVERT_HEIGHTS: flip all values (255 - value)
   *
   * @private
   */
  _fracInitInternal(mapWidth, mapHeight, grain, rng, flags, pRifts) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    // Grid always at full resolution (matching C++: m_iFracX = 1 << iFracXExp)
    this.gridWidth = (1 << this.fracXExp) + 1;
    this.gridHeight = (1 << this.fracYExp) + 1;

    // Compute iSmooth matching C++: range(min(fracXExp, fracYExp) - grain, 0, min(...))
    const minExp = Math.min(this.fracXExp, this.fracYExp);
    const iSmooth = clamp(minExp - grain, 0, minExp);

    // Allocate grid (initialized to 0)
    this.grid = new Float64Array(this.gridWidth * this.gridHeight);

    // Diamond-square with per-pass flag application (matching C++ fracInitInternal loop)
    this._generateDiamondSquareWithFlags(rng, flags, iSmooth);

    // Tectonic action (assumes FRAC_WRAP_X is on)
    if (pRifts) {
      this._tectonicAction(pRifts);
    }

    // Invert heights (post-processing, matching C++)
    if (flags & FRAC_INVERT_HEIGHTS) {
      this._applyInvert();
    }

    // Invalidate cached sorted heights
    this.sortedHeights = null;
  }

  /**
   * Initialize fractal seeded by block hint data
   *
   * Used by HintedWorld for controlled continent placement.
   * Matches C++ fracInitHinted which strips FRAC_POLAR before calling
   * fracInitInternal, then seeds from hint data instead of random.
   *
   * Note: Our implementation generates a separate diamond-square and blends
   * it with upscaled hints, rather than using hints as seed values directly
   * as C++ does. This divergence is acceptable for hint-based maps.
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
    this.gridWidth = (1 << this.fracXExp) + 1;
    this.gridHeight = (1 << this.fracYExp) + 1;

    const w = this.gridWidth;
    const h = this.gridHeight;

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

    // Compute iSmooth
    const minExp = Math.min(this.fracXExp, this.fracYExp);
    const iSmooth = clamp(minExp - grain, 0, minExp);

    // Generate diamond-square (strip POLAR flag, matching C++ fracInitHinted)
    this.grid = new Float64Array(w * h);
    const flagsNonPolar = flags & (~FRAC_POLAR);
    this._generateDiamondSquareWithFlags(rng, flagsNonPolar, iSmooth);

    // Blend hint data with fractal.
    // Grain-dependent strength: ~0.60 at grain 1, ~0.18 at grain 5.
    const grainFactor = Math.max(0.3, 1.0 - (grain - 1) * 0.15);
    const HINT_STRENGTH = 0.6 * grainFactor;

    for (let i = 0; i < this.grid.length; i++) {
      const hint = hintGrid[i];
      const fractal = this.grid[i];

      // Blend: weighted average of fractal and hint values
      this.grid[i] = fractal * (1 - HINT_STRENGTH) + hint * HINT_STRENGTH;
    }

    // Re-normalize after blending
    this._normalizeGrid();

    // Invert if needed
    if (flags & FRAC_INVERT_HEIGHTS) {
      this._applyInvert();
    }

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
   * Diamond-square with per-pass flag application — exact port of C++ fracInitInternal loop.
   *
   * On every pass:
   * 1. Sync wrap edges (FRAC_WRAP_X/Y) or zero polar edges (FRAC_POLAR)
   * 2. Apply center rift attenuation (FRAC_CENTER_RIFT) — divides values at
   *    two rift zones, compounding through passes for deep ocean channels
   * 3. Seed (first pass) or interpolate (subsequent passes) grid points
   *
   * Values are integers in [0, 255], matching C++ clamped arithmetic.
   *
   * @param {SeededRandom} rng
   * @param {number} flags - Bitmask of FRAC_* flags
   * @param {number} iSmooth - Number of refinement passes (computed from grain)
   * @private
   */
  _generateDiamondSquareWithFlags(rng, flags, iSmooth) {
    const w = this.gridWidth;   // fracX + 1
    const h = this.gridHeight;  // fracY + 1
    const fracX = w - 1;        // 2^fracXExp (= C++ m_iFracX)
    const fracY = h - 1;        // 2^fracYExp (= C++ m_iFracY)
    const grid = this.grid;

    const wrapX = (flags & FRAC_WRAP_X) !== 0;
    const wrapY = (flags & FRAC_WRAP_Y) !== 0;
    const polar = (flags & FRAC_POLAR) !== 0;
    const centerRift = (flags & FRAC_CENTER_RIFT) !== 0;

    for (let iPass = iSmooth; iPass >= 0; iPass--) {
      // Build screen mask (C++: iScreen |= (1 << iI) for iI = 0..iPass)
      let iScreen = 0;
      for (let i = 0; i <= iPass; i++) {
        iScreen |= (1 << i);
      }

      // --- Per-pass Y edge handling ---
      if (wrapY) {
        for (let x = 0; x <= fracX; x++) {
          grid[fracY * w + x] = grid[0 * w + x];
        }
      } else if (polar) {
        for (let x = 0; x <= fracX; x++) {
          grid[0 * w + x] = 0;
          grid[fracY * w + x] = 0;
        }
      }

      // --- Per-pass X edge handling ---
      if (wrapX) {
        for (let y = 0; y <= fracY; y++) {
          grid[y * w + fracX] = grid[y * w + 0];
        }
      } else if (polar) {
        for (let y = 0; y <= fracY; y++) {
          grid[y * w + 0] = 0;
          grid[y * w + fracX] = 0;
        }
      }

      // --- Per-pass center rift attenuation (C++ exact formula) ---
      // Two rifts: at y=0 and y=center (if WRAP_Y), at x=0 and x=center (if WRAP_X)
      // Each rift spans 1/6 of the grid dimension. Divisor = abs(midpoint - offset) + 1
      // Applied every pass, this compounds into deep ocean channels.
      if (centerRift) {
        if (wrapY) {
          const riftW = Math.floor(fracY / 6);
          const mid = Math.floor(fracY / 12);
          const halfY = Math.floor(fracY / 2);
          for (let x = 0; x <= fracX; x++) {
            for (let iy = 0; iy < riftW; iy++) {
              const divisor = Math.abs(mid - iy) + 1;
              grid[iy * w + x] = Math.floor(grid[iy * w + x] / divisor);
              grid[(halfY + iy) * w + x] = Math.floor(grid[(halfY + iy) * w + x] / divisor);
            }
          }
        }
        if (wrapX) {
          const riftW = Math.floor(fracX / 6);
          const mid = Math.floor(fracX / 12);
          const halfX = Math.floor(fracX / 2);
          for (let y = 0; y <= fracY; y++) {
            for (let ix = 0; ix < riftW; ix++) {
              const divisor = Math.abs(mid - ix) + 1;
              grid[y * w + ix] = Math.floor(grid[y * w + ix] / divisor);
              grid[y * w + (halfX + ix)] = Math.floor(grid[y * w + (halfX + ix)] / divisor);
            }
          }
        }
      }

      // --- Diamond-square interpolation (C++ exact structure) ---
      // C++: for iX = 0 to (fracX >> iPass) + (wrapX ? 0 : 1)
      //      grid coord = iX << iPass
      const xCount = (fracX >> iPass) + (wrapX ? 0 : 1);
      const yCount = (fracY >> iPass) + (wrapY ? 0 : 1);

      for (let iX = 0; iX < xCount; iX++) {
        for (let iY = 0; iY < yCount; iY++) {
          const gx = iX << iPass;  // Actual grid X coordinate
          const gy = iY << iPass;  // Actual grid Y coordinate

          if (iPass === iSmooth) {
            // Seed pass: random value 0-255 (C++: random.get(256))
            grid[gy * w + gx] = Math.floor(rng.next() * 256);
          } else {
            // Interpolation pass: classify point by screen mask
            const xBit = gx & iScreen;
            const yBit = gy & iScreen;

            if (xBit !== 0 && yBit !== 0) {
              // Center point: average of 4 diagonal neighbors
              const step = 1 << iPass;
              let iSum = grid[(gy - step) * w + (gx - step)]
                       + grid[(gy - step) * w + (gx + step)]
                       + grid[(gy + step) * w + (gx - step)]
                       + grid[(gy + step) * w + (gx + step)];
              iSum >>= 2;
              iSum += Math.floor(rng.next() * (1 << (8 - iSmooth + iPass)));
              iSum -= (1 << (7 - iSmooth + iPass));
              grid[gy * w + gx] = clamp(iSum, 0, 255);
            } else if (xBit !== 0) {
              // Horizontal midpoint: average of left and right
              const step = 1 << iPass;
              let iSum = grid[gy * w + (gx - step)]
                       + grid[gy * w + (gx + step)];
              iSum >>= 1;
              iSum += Math.floor(rng.next() * (1 << (8 - iSmooth + iPass)));
              iSum -= (1 << (7 - iSmooth + iPass));
              grid[gy * w + gx] = clamp(iSum, 0, 255);
            } else if (yBit !== 0) {
              // Vertical midpoint: average of top and bottom
              const step = 1 << iPass;
              let iSum = grid[(gy - step) * w + gx]
                       + grid[(gy + step) * w + gx];
              iSum >>= 1;
              iSum += Math.floor(rng.next() * (1 << (8 - iSmooth + iPass)));
              iSum -= (1 << (7 - iSmooth + iPass));
              grid[gy * w + gx] = clamp(iSum, 0, 255);
            }
            // else: corner point — already set in earlier pass, skip
          }
        }
      }
    }
  }

  /**
   * Tectonic action — exact port of C++ CvFractal::tectonicAction()
   *
   * Carves a dynamic rift channel near x=0 (the wrap seam). The rift position
   * wiggles vertically based on the rift fractal sampled at column 3/4.
   * Width is fixed at 16 grid cells on each side of center.
   * Values blend linearly from 0 at center to original at edges.
   *
   * Assumes FRAC_WRAP_X is on (matching C++ comment).
   *
   * @param {CyFractal} pRifts - Rift fractal (same grid dimensions)
   * @private
   */
  _tectonicAction(pRifts) {
    const w = this.gridWidth;
    const fracX = w - 1;
    const fracY = this.gridHeight - 1;
    const grid = this.grid;

    // C++: iRift2x = (m_iFracX / 4) * 3
    const iRift2x = Math.floor(fracX / 4) * 3;
    const iWidth = 16;

    for (let iY = 0; iY <= fracY; iY++) {
      for (let iX = 0; iX < iWidth; iX++) {
        // Sample rift fractal at column iRift2x for this row
        // C++: pRifts->m_aaiFrac[iRift2x][iY] → JS: pRifts.grid[iY * w + iRift2x]
        const riftVal = pRifts.grid[iY * pRifts.gridWidth + iRift2x];

        // Compute dynamic horizontal offset (C++ integer division with truncation)
        const offset = Math.trunc(Math.trunc((riftVal - 128) * fracX / 128) / 8);

        const iRx = this._yieldX(offset + iX);
        const iLx = this._yieldX(offset - iX);

        // Linear blend to 0 at center: value = (value * iX) / iWidth
        // C++: iDeep = 0, so formula simplifies to (value * iX + 0 * (iWidth - iX)) / iWidth
        grid[iY * w + iRx] = Math.floor((grid[iY * w + iRx] * iX) / iWidth);
        grid[iY * w + iLx] = Math.floor((grid[iY * w + iLx] * iX) / iWidth);
      }
    }

    // Sync wrap edge (C++: m_aaiFrac[m_iFracX][iY] = m_aaiFrac[0][iY])
    for (let iY = 0; iY <= fracY; iY++) {
      grid[iY * w + fracX] = grid[iY * w + 0];
    }
  }

  /**
   * Wrap X coordinate within [0, fracX) — port of C++ CvFractal::yieldX()
   * Assumes FRAC_WRAP_X is on.
   * @private
   */
  _yieldX(x) {
    const fracX = this.gridWidth - 1;
    if (x < 0) return x + fracX;
    if (x >= fracX) return x - fracX;
    return x;
  }

  /**
   * Normalize grid values to [0, 255] range
   * Used by fracInitHints after hint blending.
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
   * Invert all heights (for Lakes map type)
   * C++ iterates interior only (iX < m_iFracX, iY < m_iFracY) but the
   * difference is negligible. We invert all cells for simplicity.
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
