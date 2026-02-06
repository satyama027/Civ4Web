/**
 * FractalWorld - Civ4-compatible plot type generator
 *
 * Direct port of CvMapGeneratorUtil.FractalWorld from Civ4 BTS.
 * Generates plot types (ocean/land/hills/peaks) using three CyFractal instances:
 * - continentsFrac: determines land vs water
 * - hillsFrac: determines hills placement (two bands at 25% and 75%)
 * - peaksFrac: determines peaks within hill bands
 *
 * This is the primary plot type generator used by:
 * - Continents, Archipelago, Fractal, Lakes, Ice Age
 *
 * This is also the base class for HintedWorld (Milestone 3).
 *
 * References:
 * - Civ4 SDK: CvMapGeneratorUtil.py FractalWorld class
 * - docs/MapGen-Rewrite-Plan.md Milestone 2
 */

import { CyFractal, FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS, FRAC_WRAP_X, FRAC_WRAP_Y } from './CyFractal.js';
import { clamp } from './utils.js';

// ============================================================================
// PLOT TYPE ENUM
// ============================================================================

/**
 * Plot types matching Civ4's PlotTypes enum
 */
export const PLOT = {
  OCEAN: 0,
  COAST: 1,  // Added by addCoastTiles() later, not by FractalWorld
  LAND: 2,
  HILLS: 3,
  PEAK: 4
};

// ============================================================================
// FRACTALWORLD CLASS
// ============================================================================

/**
 * FractalWorld - Civ4-compatible plot type generator
 *
 * Generates plot types using three-fractal approach:
 * 1. Continent fractal determines land vs water
 * 2. Hills fractal determines elevation variations (two bands)
 * 3. Peaks fractal determines mountain tops within hill bands
 */
export class FractalWorld {
  /**
   * Create a new FractalWorld instance
   *
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} settings - Configuration settings
   * @param {number} settings.fracXExp - X-axis fractal exponent (default 7)
   * @param {number} settings.fracYExp - Y-axis fractal exponent (default 6)
   * @param {number} settings.seaLevelChange - Sea level adjustment (-5 low, 0 medium, +5 high)
   * @param {number} settings.hillGroupOneRange - Hills band 1 range (default 9)
   * @param {number} settings.hillGroupTwoRange - Hills band 2 range (default 9)
   * @param {number} settings.peakPercent - Peak percentage (default 4)
   * @param {number} settings.stripRadius - Shift strip radius (default 15)
   * @param {boolean} settings.wrapX - X-axis wrapping (default true)
   * @param {boolean} settings.wrapY - Y-axis wrapping (default false)
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    // Map dimensions
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;

    // 1D plot array (Civ4 uses 1D: y * width + x)
    this.plotTypes = new Array(mapWidth * mapHeight).fill(PLOT.OCEAN);

    // Fractal exponents
    this.fracXExp = settings.fracXExp || 7;
    this.fracYExp = settings.fracYExp || 6;

    // Three CyFractal instances (created but not initialized)
    this.continentsFrac = new CyFractal(this.fracXExp, this.fracYExp);
    this.hillsFrac = new CyFractal(this.fracXExp, this.fracYExp);
    this.peaksFrac = new CyFractal(this.fracXExp, this.fracYExp);

    // Sea level configuration
    this.seaLevelChange = settings.seaLevelChange || 0;
    this.seaLevelMin = settings.seaLevelMin != null ? settings.seaLevelMin : 0;
    this.seaLevelMax = settings.seaLevelMax != null ? settings.seaLevelMax : 100;

    // Hills configuration (from Civ4 climate XML)
    // Two bands: centered at 25% and 75% percentile
    this.hillGroupOneBase = 25;
    this.hillGroupOneRange = settings.hillGroupOneRange || 9;
    this.hillGroupTwoBase = 75;
    this.hillGroupTwoRange = settings.hillGroupTwoRange || 9;

    // Peaks percentage
    this.peakPercent = settings.peakPercent || 4;

    // Shift configuration
    this.stripRadius = settings.stripRadius || 15;

    // Map wrapping flags
    this.wrapX = settings.wrapX !== false; // Default: true (cylindrical world)
    this.wrapY = settings.wrapY || false;  // Default: false
  }

  // ==========================================================================
  // FRACTAL FLAGS
  // ==========================================================================

  /**
   * Get base fractal flags for the map type
   * @returns {number} Bitmask of FRAC_* flags
   */
  getMapFractalFlags() {
    let flags = 0;
    if (this.wrapX) flags |= FRAC_WRAP_X;
    if (this.wrapY) flags |= FRAC_WRAP_Y;
    return flags;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the continent fractal
   *
   * @param {SeededRandom} rng - Seeded random number generator
   * @param {Object} params - Initialization parameters
   * @param {number} params.continent_grain - Continent feature size (1=huge, 4=small)
   * @param {number} params.rift_grain - Rift grain (-1 to disable rifts)
   * @param {boolean} params.has_center_rift - Apply center rift attenuation
   * @param {boolean} params.invert_heights - Invert heights (for Lakes map)
   * @param {boolean} params.polar - Apply polar attenuation
   */
  initFractal(rng, params = {}) {
    const {
      continent_grain = 2,
      rift_grain = 2,
      has_center_rift = true,
      invert_heights = false,
      polar = false
    } = params;

    // Build base flags
    let flags = this.getMapFractalFlags();
    if (invert_heights) flags |= FRAC_INVERT_HEIGHTS;
    if (polar) flags |= FRAC_POLAR;

    // Initialize with or without rifts
    if (rift_grain >= 0) {
      // Create rift fractal
      const riftsFrac = new CyFractal(this.fracXExp, this.fracYExp);
      riftsFrac.fracInit(this.iNumPlotsX, this.iNumPlotsY, rift_grain, rng, flags);

      // Initialize continents with rift modulation
      let riftFlags = flags;
      if (has_center_rift) riftFlags |= FRAC_CENTER_RIFT;

      this.continentsFrac.fracInitRifts(
        riftsFrac, has_center_rift,
        this.iNumPlotsX, this.iNumPlotsY,
        continent_grain, rng, riftFlags
      );
    } else {
      // Simple initialization without rifts
      this.continentsFrac.fracInit(
        this.iNumPlotsX, this.iNumPlotsY,
        continent_grain, rng, flags
      );
    }
  }

  /**
   * Hook for subclasses to override user input variances.
   * Base implementation does nothing.
   * HintedWorld overrides this to adjust parameters based on hints.
   */
  checkForOverrideDefaultUserInputVariances() {
    // No-op in base class
  }

  // ==========================================================================
  // PLOT TYPE GENERATION
  // ==========================================================================

  /**
   * Generate plot types using Civ4's FractalWorld algorithm
   *
   * @param {SeededRandom} rng - Seeded random number generator
   * @param {Object} params - Generation parameters
   * @param {number} params.water_percent - Water percentage (default 75)
   * @param {number} params.grain_amount - Hills/peaks grain (default 3)
   * @param {boolean} params.shift_plot_types - Whether to shift map (default false)
   * @returns {number[]} 1D array of plot types
   */
  generatePlotTypes(rng, params = {}) {
    const {
      water_percent = 78,
      grain_amount = 3,
      shift_plot_types = true
    } = params;

    // Hook for subclass overrides
    this.checkForOverrideDefaultUserInputVariances();

    // Get base flags (wrapping)
    const flags = this.getMapFractalFlags();

    // Initialize hills and peaks fractals
    this.hillsFrac.fracInit(
      this.iNumPlotsX, this.iNumPlotsY,
      grain_amount, rng, flags
    );
    this.peaksFrac.fracInit(
      this.iNumPlotsX, this.iNumPlotsY,
      grain_amount + 1, rng, flags // Finer grain for peaks
    );

    // Apply sea level adjustment
    let adjustedWaterPercent = water_percent + this.seaLevelChange;
    adjustedWaterPercent = clamp(adjustedWaterPercent, this.seaLevelMin, this.seaLevelMax);

    // Compute thresholds using getHeightFromPercent
    const iWaterThreshold = this.continentsFrac.getHeightFromPercent(adjustedWaterPercent);

    // Hills bands: two bands at 25% and 75% with configurable range
    const iHillsBottom1 = this.hillsFrac.getHeightFromPercent(
      Math.max(0, this.hillGroupOneBase - this.hillGroupOneRange)
    );
    const iHillsTop1 = this.hillsFrac.getHeightFromPercent(
      Math.min(100, this.hillGroupOneBase + this.hillGroupOneRange)
    );
    const iHillsBottom2 = this.hillsFrac.getHeightFromPercent(
      Math.max(0, this.hillGroupTwoBase - this.hillGroupTwoRange)
    );
    const iHillsTop2 = this.hillsFrac.getHeightFromPercent(
      Math.min(100, this.hillGroupTwoBase + this.hillGroupTwoRange)
    );

    // Peak threshold
    const iPeakThreshold = this.peaksFrac.getHeightFromPercent(this.peakPercent);

    // Generate plot types
    for (let y = 0; y < this.iNumPlotsY; y++) {
      for (let x = 0; x < this.iNumPlotsX; x++) {
        const i = y * this.iNumPlotsX + x;

        // Check continent threshold
        const contVal = this.continentsFrac.getHeight(x, y);

        if (contVal <= iWaterThreshold) {
          this.plotTypes[i] = PLOT.OCEAN;
        } else {
          // Land - check for hills
          const hillVal = this.hillsFrac.getHeight(x, y);
          const inHillBand = (hillVal >= iHillsBottom1 && hillVal <= iHillsTop1) ||
                             (hillVal >= iHillsBottom2 && hillVal <= iHillsTop2);

          if (inHillBand) {
            // Check for peaks within hill band
            const peakVal = this.peaksFrac.getHeight(x, y);
            if (peakVal <= iPeakThreshold) {
              this.plotTypes[i] = PLOT.PEAK;
            } else {
              this.plotTypes[i] = PLOT.HILLS;
            }
          } else {
            this.plotTypes[i] = PLOT.LAND;
          }
        }
      }
    }

    // Shift plot types if requested (Continents, Terra, Mirror)
    if (shift_plot_types) {
      this.shiftPlotTypes();
    }

    return this.plotTypes;
  }

  // ==========================================================================
  // SHIFT PLOT TYPES - EXACT CIV4 ALGORITHM
  // ==========================================================================

  /**
   * Calculate weights for shift scoring (EXACT Civ4 algorithm)
   *
   * Weights are higher at strip center and edges, creating a
   * scoring system that prefers splits through narrow ocean channels.
   *
   * @param {number} stripRadius - Half-width of the scoring strip
   * @returns {number[]} Weight array of length 2*stripRadius
   */
  calcWeights(stripRadius) {
    const stripSize = 2 * stripRadius;
    const weights = new Array(stripSize);

    for (let i = 0; i < stripSize; i++) {
      // Distance from nearest edge (1 at edge, stripRadius at center)
      const distFromEdge = Math.min(i + 1, stripSize - i);
      let landWeight = distFromEdge;

      // Distance from center
      const distFromCenter = Math.abs(i - stripRadius);

      // Boost weight near center
      if (distFromCenter <= 1) {
        landWeight *= stripRadius;
      }
      // Extra boost at exact center
      if (distFromCenter === 0) {
        landWeight *= 2;
      }

      weights[i] = landWeight;
    }

    return weights;
  }

  /**
   * Find best X split point (EXACT Civ4 algorithm)
   *
   * Scores each column as potential split point using weighted
   * land counts. The +30 bonus for any land in a column is the
   * key Civ4 behavior that prevents splits through continents.
   *
   * @param {number} stripRadius - Half-width of scoring strip
   * @returns {number} Best X offset for split
   */
  findBestSplitX(stripRadius = this.stripRadius) {
    const stripSize = 2 * stripRadius;

    // If strip is wider than map, no shift needed
    if (stripSize > this.iNumPlotsX) return 0;

    // Initialize scores for each column
    const scores = new Array(this.iNumPlotsX).fill(0);

    // Calculate weights
    const weights = this.calcWeights(stripRadius);

    // Score each column
    for (let x = 0; x < this.iNumPlotsX; x++) {
      // Count land tiles in this column
      let landCount = 0;
      for (let y = 0; y < this.iNumPlotsY; y++) {
        const i = y * this.iNumPlotsX + x;
        if (this.plotTypes[i] !== PLOT.OCEAN) {
          landCount++;
        }
      }

      // THE +30 BONUS: Any column with land gets +30 base score
      // This is crucial Civ4 behavior!
      if (landCount > 0) {
        landCount += 30;
      }

      // Distribute this column's score across the strip
      for (let i = 0; i < stripSize; i++) {
        // Target column in the strip centered on this position
        const targetCol = ((x - stripRadius + i) % this.iNumPlotsX + this.iNumPlotsX) % this.iNumPlotsX;
        scores[targetCol] += landCount * weights[i];
      }
    }

    // Find column with minimum score (best split point)
    let minScore = Infinity;
    let bestX = 0;

    for (let x = 0; x < this.iNumPlotsX; x++) {
      if (scores[x] < minScore) {
        minScore = scores[x];
        bestX = x;
      }
    }

    return bestX;
  }

  /**
   * Find best Y split point (EXACT Civ4 algorithm)
   *
   * Same algorithm as findBestSplitX but for rows.
   * Rarely used in Civ4 (most maps only shift X).
   *
   * @param {number} stripRadius - Half-width of scoring strip
   * @returns {number} Best Y offset for split
   */
  findBestSplitY(stripRadius = this.stripRadius) {
    const stripSize = 2 * stripRadius;

    // If strip is taller than map, no shift needed
    if (stripSize > this.iNumPlotsY) return 0;

    // Initialize scores for each row
    const scores = new Array(this.iNumPlotsY).fill(0);

    // Calculate weights
    const weights = this.calcWeights(stripRadius);

    // Score each row
    for (let y = 0; y < this.iNumPlotsY; y++) {
      // Count land tiles in this row
      let landCount = 0;
      for (let x = 0; x < this.iNumPlotsX; x++) {
        const i = y * this.iNumPlotsX + x;
        if (this.plotTypes[i] !== PLOT.OCEAN) {
          landCount++;
        }
      }

      // THE +30 BONUS
      if (landCount > 0) {
        landCount += 30;
      }

      // Distribute this row's score across the strip
      for (let i = 0; i < stripSize; i++) {
        const targetRow = ((y - stripRadius + i) % this.iNumPlotsY + this.iNumPlotsY) % this.iNumPlotsY;
        scores[targetRow] += landCount * weights[i];
      }
    }

    // Find row with minimum score
    let minScore = Infinity;
    let bestY = 0;

    for (let y = 0; y < this.iNumPlotsY; y++) {
      if (scores[y] < minScore) {
        minScore = scores[y];
        bestY = y;
      }
    }

    return bestY;
  }

  /**
   * Circular shift of plotTypes array
   *
   * @param {number} xshift - Columns to shift
   * @param {number} yshift - Rows to shift
   */
  shiftPlotTypesBy(xshift, yshift) {
    if (xshift === 0 && yshift === 0) return;

    const oldPlots = [...this.plotTypes];

    for (let y = 0; y < this.iNumPlotsY; y++) {
      for (let x = 0; x < this.iNumPlotsX; x++) {
        // Source X always wraps (Civ4: destX + xshift)
        const srcX = ((x + xshift) % this.iNumPlotsX + this.iNumPlotsX) % this.iNumPlotsX;

        // Source Y: wrap if wrapY, otherwise direct offset
        let srcY;
        if (this.wrapY) {
          srcY = ((y + yshift) % this.iNumPlotsY + this.iNumPlotsY) % this.iNumPlotsY;
        } else {
          srcY = y + yshift;
          if (srcY < 0 || srcY >= this.iNumPlotsY) {
            this.plotTypes[y * this.iNumPlotsX + x] = PLOT.OCEAN;
            continue;
          }
        }

        this.plotTypes[y * this.iNumPlotsX + x] = oldPlots[srcY * this.iNumPlotsX + srcX];
      }
    }
  }

  /**
   * Find and apply best shift to center continents
   *
   * In Civ4, this shifts the map so the widest ocean strip
   * is at the map edge, centering the land masses.
   */
  shiftPlotTypes() {
    const xshift = this.wrapX ? this.findBestSplitX() : 0;
    const yshift = this.wrapY ? this.findBestSplitY() : 0;

    this.shiftPlotTypesBy(xshift, yshift);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get plot type at coordinates (with world wrap)
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Plot type
   */
  getPlotType(x, y) {
    // Handle X wrap
    x = ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;

    // Y clamps (no wrap by default)
    if (y < 0 || y >= this.iNumPlotsY) return PLOT.OCEAN;

    return this.plotTypes[y * this.iNumPlotsX + x];
  }

  /**
   * Set plot type at coordinates
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} plotType - Plot type to set
   */
  setPlotType(x, y, plotType) {
    x = ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
    if (y < 0 || y >= this.iNumPlotsY) return;

    this.plotTypes[y * this.iNumPlotsX + x] = plotType;
  }

  /**
   * Convert 1D plotTypes to 2D array for backward compatibility
   *
   * @returns {number[][]} 2D array of plot types [y][x]
   */
  toPlots2D() {
    const plots = [];
    for (let y = 0; y < this.iNumPlotsY; y++) {
      const row = [];
      for (let x = 0; x < this.iNumPlotsX; x++) {
        row.push(this.plotTypes[y * this.iNumPlotsX + x]);
      }
      plots.push(row);
    }
    return plots;
  }
}

// ============================================================================
// FACTORY FUNCTION (BACKWARD COMPATIBILITY)
// ============================================================================

/**
 * Factory function for backward compatibility with mapGenerator.js
 *
 * Creates a FractalWorld, initializes it, generates plot types, and returns
 * a 2D array matching the old mapGenerator.js interface.
 *
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {SeededRandom} rng - Seeded RNG
 * @param {Object} params - Generation parameters
 * @param {number} params.waterPercent - Water percentage (default 75)
 * @param {number} params.continentGrain - Continent grain (default 2)
 * @param {number} params.grainAmount - Hills/peaks grain (default 3)
 * @param {boolean} params.polar - Apply polar attenuation (default true)
 * @param {boolean} params.centerRift - Apply center rift (default false)
 * @param {number} params.riftGrain - Rift grain (default -1)
 * @param {number} params.hillGroupOneRange - Hills band 1 range (default 9)
 * @param {number} params.hillGroupTwoRange - Hills band 2 range (default 9)
 * @param {number} params.peakPercent - Peak percentage (default 4)
 * @param {number} params.seaLevelChange - Sea level adjustment (default 0)
 * @param {boolean} params.doShift - Shift to center continents (default false)
 * @param {boolean} params.invertHeights - Invert heights for Lakes (default false)
 * @returns {number[][]} 2D array of plot types [y][x]
 */
export function createFractalWorld(width, height, rng, params = {}) {
  const {
    waterPercent = 75,
    continentGrain = 2,
    grainAmount = 3,
    polar = true,
    centerRift = false,
    riftGrain = -1,
    hillGroupOneRange = 9,
    hillGroupTwoRange = 9,
    peakPercent = 4,
    seaLevelChange = 0,
    doShift = false,
    invertHeights = false
  } = params;

  // Create FractalWorld instance
  const world = new FractalWorld(width, height, {
    hillGroupOneRange,
    hillGroupTwoRange,
    peakPercent,
    seaLevelChange
  });

  // Initialize continent fractal
  world.initFractal(rng, {
    continent_grain: continentGrain,
    rift_grain: centerRift ? (riftGrain >= 0 ? riftGrain : continentGrain) : -1,
    has_center_rift: centerRift,
    invert_heights: invertHeights,
    polar
  });

  // Generate plot types
  world.generatePlotTypes(rng, {
    water_percent: waterPercent,
    grain_amount: grainAmount,
    shift_plot_types: doShift
  });

  // Return 2D array for backward compatibility
  return world.toPlots2D();
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export fractal flags for convenience
export { FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS, FRAC_WRAP_X, FRAC_WRAP_Y };

// Default export
export default FractalWorld;
