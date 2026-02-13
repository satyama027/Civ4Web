/**
 * MultilayeredFractal - Civ4-compatible multi-region plot type generator
 *
 * Direct port of CvMapGeneratorUtil.MultilayeredFractal from Civ4 BTS.
 * Generates plot types by layering multiple independent fractal regions
 * onto a single global map. Each region has its own fractal configuration,
 * and non-ocean results are layered onto the global array (ocean plots
 * in a region never erase existing land from previous regions).
 *
 * This is the base class for map scripts that build worlds from multiple
 * overlapping regions:
 * - Terra (Old World + New World regions)
 * - Pangaea (multilayered variant with subcontinents)
 * - Oasis (all-land base with water regions layered on top)
 * - Hub, Islands, Ring (template-based regional maps)
 *
 * References:
 * - Civ4 SDK: CvMapGeneratorUtil.py MultilayeredFractal class
 * - docs/MapGen-Rewrite-Plan.md Milestone 4
 */

import { CyFractal, FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS, FRAC_WRAP_X, FRAC_WRAP_Y } from './CyFractal.js';
import { PLOT } from './FractalWorld.js';
import { clamp } from './utils.js';

// ============================================================================
// MULTILAYEREDFRACTAL CLASS
// ============================================================================

/**
 * MultilayeredFractal - Multi-region plot type generator
 *
 * Builds the world region-by-region. Each region gets its own set of
 * three fractals (continent, hills, peaks). Non-ocean plots from each
 * region are layered onto the global array, while ocean plots are skipped
 * (preserving existing land from earlier regions).
 */
export class MultilayeredFractal {
  /**
   * Create a new MultilayeredFractal instance
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
   * @param {boolean} settings.wrapX - X-axis wrapping (default true)
   * @param {boolean} settings.wrapY - Y-axis wrapping (default false)
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    // Map dimensions
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;

    // Global plot array — starts as all ocean
    this.wholeworldPlotTypes = new Array(mapWidth * mapHeight).fill(PLOT.OCEAN);

    // Fractal exponents
    this.fracXExp = settings.fracXExp || 7;
    this.fracYExp = settings.fracYExp || 6;

    // Sea level configuration
    this.seaLevelChange = settings.seaLevelChange || 0;

    // Hills configuration (from Civ4 climate XML)
    // Two bands: centered at 25% and 75% percentile
    this.hillGroupOneBase = 25;
    this.hillGroupOneRange = settings.hillGroupOneRange || 9;
    this.hillGroupTwoBase = 75;
    this.hillGroupTwoRange = settings.hillGroupTwoRange || 9;

    // Peaks percentage
    this.peakPercent = settings.peakPercent || 4;

    // Map wrapping flags
    this.wrapX = settings.wrapX !== false; // Default: true
    this.wrapY = settings.wrapY || false;  // Default: false

    // Pre-computed flag sets (Civ4's MultilayeredFractal convention)
    // Subclasses select the appropriate set for each region
    this.iHorzFlags = FRAC_WRAP_X | FRAC_POLAR;  // Horizontal-wrapping regions
    this.iVertFlags = FRAC_WRAP_Y | FRAC_POLAR;  // Vertical-wrapping regions (rare)
    this.iRoundFlags = FRAC_POLAR;                // Non-wrapping enclosed regions
  }

  // ==========================================================================
  // ENTRY POINT
  // ==========================================================================

  /**
   * Generate plot types for the entire map
   *
   * Calls the template method generatePlotsByRegion() which must be
   * overridden by subclasses to define their regional structure.
   *
   * @param {SeededRandom} rng - Seeded random number generator
   * @returns {number[]} 1D array of plot types (wholeworldPlotTypes)
   */
  generatePlotTypes(rng) {
    this.generatePlotsByRegion(rng);
    return this.wholeworldPlotTypes;
  }

  // ==========================================================================
  // TEMPLATE METHOD
  // ==========================================================================

  /**
   * Template method — must be overridden by subclasses
   *
   * Each map script subclass defines its own set of regions by calling
   * generatePlotsInRegion() one or more times.
   *
   * @param {SeededRandom} rng - Seeded random number generator
   */
  generatePlotsByRegion(_rng) { // eslint-disable-line no-unused-vars
    // No-op in base class. Subclasses override this.
    // Example (Terra):
    //   this.generatePlotsInRegion(rng, { ...eurasiaParams });
    //   this.generatePlotsInRegion(rng, { ...northAmericaParams });
  }

  // ==========================================================================
  // CORE METHOD: GENERATE PLOTS IN REGION
  // ==========================================================================

  /**
   * Generate plot types for a rectangular region and layer onto global array
   *
   * Creates three fractals (continent, hills, peaks) scoped to the region,
   * assigns plot types using the same 3-fractal logic as FractalWorld, then
   * layers non-ocean results onto the global wholeworldPlotTypes array.
   *
   * @param {SeededRandom} rng - Seeded random number generator
   * @param {Object} params - Region parameters (16 parameters matching Civ4)
   * @param {number} params.iWaterPercent - Water percentage for this region
   * @param {number} params.iRegionWidth - Region width in plots
   * @param {number} params.iRegionHeight - Region height in plots
   * @param {number} params.iRegionWestX - Region SW corner X (global coords)
   * @param {number} params.iRegionSouthY - Region SW corner Y (global coords)
   * @param {number} params.iRegionGrain - Continent fractal grain
   * @param {number} params.iRegionHillsGrain - Hills fractal grain
   * @param {number} params.iRegionPlotFlags - Fractal flags for continent fractal
   * @param {number} params.iRegionTerrainFlags - Fractal flags for hills/peaks fractals
   * @param {number} params.iRegionFracXExp - Override fracXExp (-1 = use default)
   * @param {number} params.iRegionFracYExp - Override fracYExp (-1 = use default)
   * @param {boolean} params.bShift - Whether to shift region plots before layering
   * @param {number} params.iStrip - Strip radius for shift algorithm
   * @param {number} params.rift_grain - Rift grain (-1 = no rifts)
   * @param {boolean} params.has_center_rift - Center rift toggle
   * @param {boolean} params.invert_heights - Invert fractal heights
   */
  generatePlotsInRegion(rng, params) {
    const {
      iWaterPercent,
      iRegionWidth,
      iRegionHeight,
      iRegionWestX,
      iRegionSouthY,
      iRegionGrain,
      iRegionHillsGrain,
      iRegionPlotFlags,
      iRegionTerrainFlags,
      iRegionFracXExp = -1,
      iRegionFracYExp = -1,
      bShift = true,
      iStrip = 15,
      rift_grain = -1,
      has_center_rift = false,
      invert_heights = false
    } = params;

    // 1. Create regional plot array, all ocean
    const regionalPlots = new Array(iRegionWidth * iRegionHeight).fill(PLOT.OCEAN);

    // 2. Resolve fractal exponents
    const regionFracXExp = (iRegionFracXExp !== -1) ? iRegionFracXExp : this.fracXExp;
    const regionFracYExp = (iRegionFracYExp !== -1) ? iRegionFracYExp : this.fracYExp;

    // 3. Create three fractals scoped to this region
    const continentsFrac = new CyFractal(regionFracXExp, regionFracYExp);
    const hillsFrac = new CyFractal(regionFracXExp, regionFracYExp);
    const peaksFrac = new CyFractal(regionFracXExp, regionFracYExp);

    // 4. Build continent flags
    let flags = iRegionPlotFlags;
    if (invert_heights) flags |= FRAC_INVERT_HEIGHTS;

    // 5. Init continent fractal (with or without rifts)
    // Matching original Civ4: rift fractal is plain noise (flags=0),
    // CENTER_RIFT goes on the continent fractal via fracInitRifts.
    if (rift_grain >= 0) {
      const riftsFrac = new CyFractal(regionFracXExp, regionFracYExp);
      riftsFrac.fracInit(iRegionWidth, iRegionHeight, rift_grain, rng, 0);

      if (has_center_rift) flags |= FRAC_CENTER_RIFT;
      continentsFrac.fracInitRifts(
        riftsFrac, has_center_rift,
        iRegionWidth, iRegionHeight,
        iRegionGrain, rng, flags
      );
    } else {
      continentsFrac.fracInit(
        iRegionWidth, iRegionHeight,
        iRegionGrain, rng, flags
      );
    }

    // 6. Init hills and peaks fractals
    hillsFrac.fracInit(
      iRegionWidth, iRegionHeight,
      iRegionHillsGrain, rng, iRegionTerrainFlags
    );
    peaksFrac.fracInit(
      iRegionWidth, iRegionHeight,
      iRegionHillsGrain + 1, rng, iRegionTerrainFlags
    );

    // 7. Apply sea level adjustment
    const adjustedWaterPercent = clamp(
      iWaterPercent + this.seaLevelChange,
      0, 100
    );

    // 8. Compute thresholds
    const iWaterThreshold = continentsFrac.getHeightFromPercent(adjustedWaterPercent);

    const iHillsBottom1 = hillsFrac.getHeightFromPercent(
      Math.max(0, this.hillGroupOneBase - this.hillGroupOneRange)
    );
    const iHillsTop1 = hillsFrac.getHeightFromPercent(
      Math.min(100, this.hillGroupOneBase + this.hillGroupOneRange)
    );
    const iHillsBottom2 = hillsFrac.getHeightFromPercent(
      Math.max(0, this.hillGroupTwoBase - this.hillGroupTwoRange)
    );
    const iHillsTop2 = hillsFrac.getHeightFromPercent(
      Math.min(100, this.hillGroupTwoBase + this.hillGroupTwoRange)
    );

    const iPeakThreshold = peaksFrac.getHeightFromPercent(this.peakPercent);

    // 9. Generate regional plot types (same 3-fractal logic as FractalWorld)
    for (let ry = 0; ry < iRegionHeight; ry++) {
      for (let rx = 0; rx < iRegionWidth; rx++) {
        const ri = ry * iRegionWidth + rx;

        const contVal = continentsFrac.getHeight(rx, ry);

        if (contVal <= iWaterThreshold) {
          regionalPlots[ri] = PLOT.OCEAN;
        } else {
          // Land — check for hills
          const hillVal = hillsFrac.getHeight(rx, ry);
          const inHillBand = (hillVal >= iHillsBottom1 && hillVal <= iHillsTop1) ||
                             (hillVal >= iHillsBottom2 && hillVal <= iHillsTop2);

          if (inHillBand) {
            // Check for peaks within hill band
            const peakVal = peaksFrac.getHeight(rx, ry);
            if (peakVal <= iPeakThreshold) {
              regionalPlots[ri] = PLOT.PEAK;
            } else {
              regionalPlots[ri] = PLOT.HILLS;
            }
          } else {
            regionalPlots[ri] = PLOT.LAND;
          }
        }
      }
    }

    // 10. Shift region plots if requested
    if (bShift) {
      this.shiftRegionPlots(regionalPlots, iRegionWidth, iRegionHeight, iStrip);
    }

    // 11. Layer onto global array (KEY: ocean plots are SKIPPED)
    for (let ry = 0; ry < iRegionHeight; ry++) {
      for (let rx = 0; rx < iRegionWidth; rx++) {
        const plotType = regionalPlots[ry * iRegionWidth + rx];

        // Only layer non-ocean plots — ocean never erases existing land
        if (plotType !== PLOT.OCEAN) {
          const globalX = ((iRegionWestX + rx) % this.iNumPlotsX + this.iNumPlotsX) % this.iNumPlotsX;
          const globalY = iRegionSouthY + ry;

          if (globalY >= 0 && globalY < this.iNumPlotsY) {
            this.wholeworldPlotTypes[globalY * this.iNumPlotsX + globalX] = plotType;
          }
        }
      }
    }
  }

  // ==========================================================================
  // REGIONAL SHIFT METHODS
  // ==========================================================================

  /**
   * Calculate weights for shift scoring (EXACT Civ4 algorithm)
   *
   * Same formula as FractalWorld.calcWeights() — peak at center of strip,
   * with edge weights tapering linearly.
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
   * Find best X split point for a regional array (EXACT Civ4 algorithm)
   *
   * Scores each column using weighted land counts with +30 bonus for
   * any land. Returns column with minimum score.
   *
   * @param {number[]} plotData - 1D regional plot array
   * @param {number} regionWidth - Region width
   * @param {number} regionHeight - Region height
   * @param {number} stripRadius - Half-width of scoring strip
   * @returns {number} Best X offset for split
   */
  findBestRegionSplitX(plotData, regionWidth, regionHeight, stripRadius) {
    const stripSize = 2 * stripRadius;

    if (stripSize > regionWidth) return 0;

    const scores = new Array(regionWidth).fill(0);
    const weights = this.calcWeights(stripRadius);

    for (let x = 0; x < regionWidth; x++) {
      // Count land tiles in this column
      let landCount = 0;
      for (let y = 0; y < regionHeight; y++) {
        if (plotData[y * regionWidth + x] !== PLOT.OCEAN) {
          landCount++;
        }
      }

      // +30 bonus for any land (Civ4 behavior)
      if (landCount > 0) {
        landCount += 30;
      }

      // Distribute score across the strip
      for (let i = 0; i < stripSize; i++) {
        const targetCol = ((x - stripRadius + i) % regionWidth + regionWidth) % regionWidth;
        scores[targetCol] += landCount * weights[i];
      }
    }

    // Find column with minimum score
    let minScore = Infinity;
    let bestX = 0;
    for (let x = 0; x < regionWidth; x++) {
      if (scores[x] < minScore) {
        minScore = scores[x];
        bestX = x;
      }
    }

    return bestX;
  }

  /**
   * Find best Y split point for a regional array (EXACT Civ4 algorithm)
   *
   * Same algorithm as findBestRegionSplitX but for rows.
   *
   * @param {number[]} plotData - 1D regional plot array
   * @param {number} regionWidth - Region width
   * @param {number} regionHeight - Region height
   * @param {number} stripRadius - Half-width of scoring strip
   * @returns {number} Best Y offset for split
   */
  findBestRegionSplitY(plotData, regionWidth, regionHeight, stripRadius) {
    const stripSize = 2 * stripRadius;

    if (stripSize > regionHeight) return 0;

    const scores = new Array(regionHeight).fill(0);
    const weights = this.calcWeights(stripRadius);

    for (let y = 0; y < regionHeight; y++) {
      // Count land tiles in this row
      let landCount = 0;
      for (let x = 0; x < regionWidth; x++) {
        if (plotData[y * regionWidth + x] !== PLOT.OCEAN) {
          landCount++;
        }
      }

      // +30 bonus for any land
      if (landCount > 0) {
        landCount += 30;
      }

      // Distribute score across the strip
      for (let i = 0; i < stripSize; i++) {
        const targetRow = ((y - stripRadius + i) % regionHeight + regionHeight) % regionHeight;
        scores[targetRow] += landCount * weights[i];
      }
    }

    // Find row with minimum score
    let minScore = Infinity;
    let bestY = 0;
    for (let y = 0; y < regionHeight; y++) {
      if (scores[y] < minScore) {
        minScore = scores[y];
        bestY = y;
      }
    }

    return bestY;
  }

  /**
   * Shift regional plot array to center land within the region
   *
   * Finds the best X and Y split points and applies circular shift.
   * Modifies plotData in-place.
   *
   * @param {number[]} plotData - 1D regional plot array (modified in-place)
   * @param {number} regionWidth - Region width
   * @param {number} regionHeight - Region height
   * @param {number} stripRadius - Half-width of scoring strip
   */
  shiftRegionPlots(plotData, regionWidth, regionHeight, stripRadius) {
    const bestShiftX = this.findBestRegionSplitX(plotData, regionWidth, regionHeight, stripRadius);
    const bestShiftY = this.findBestRegionSplitY(plotData, regionWidth, regionHeight, stripRadius);

    if (bestShiftX === 0 && bestShiftY === 0) return;

    // Apply circular shift
    const oldPlots = [...plotData];

    for (let y = 0; y < regionHeight; y++) {
      for (let x = 0; x < regionWidth; x++) {
        const srcX = ((x + bestShiftX) % regionWidth + regionWidth) % regionWidth;
        const srcY = ((y + bestShiftY) % regionHeight + regionHeight) % regionHeight;
        plotData[y * regionWidth + x] = oldPlots[srcY * regionWidth + srcX];
      }
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get plot type at global coordinates (with world wrap)
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Plot type
   */
  getPlotType(x, y) {
    x = ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
    if (y < 0 || y >= this.iNumPlotsY) return PLOT.OCEAN;
    return this.wholeworldPlotTypes[y * this.iNumPlotsX + x];
  }

  /**
   * Set plot type at global coordinates
   *
   * Used by subclasses for forced terrain placement (e.g., Oasis
   * initializes all-land base, Hub draws spoke lines).
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} plotType - Plot type to set
   */
  setPlotType(x, y, plotType) {
    x = ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
    if (y < 0 || y >= this.iNumPlotsY) return;
    this.wholeworldPlotTypes[y * this.iNumPlotsX + x] = plotType;
  }

  /**
   * Convert 1D wholeworldPlotTypes to 2D array for backward compatibility
   *
   * @returns {number[][]} 2D array of plot types [y][x]
   */
  toPlots2D() {
    const plots = [];
    for (let y = 0; y < this.iNumPlotsY; y++) {
      const row = [];
      for (let x = 0; x < this.iNumPlotsX; x++) {
        row.push(this.wholeworldPlotTypes[y * this.iNumPlotsX + x]);
      }
      plots.push(row);
    }
    return plots;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export for convenience
export { PLOT } from './FractalWorld.js';
export { FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS, FRAC_WRAP_X, FRAC_WRAP_Y } from './CyFractal.js';

export default MultilayeredFractal;
