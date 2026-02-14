/**
 * Lakes Map Script — Port of Civ4 BTS Lakes.py
 * by Andy Szybalski and Bob Thomas (Sirian).
 *
 * Oceanless planet with many small lakes. Uses an inverted fractal
 * (invert_heights=true) so what would be ocean basins become land
 * plateaus. Water percentage clamped to 7-14%.
 *
 * Overrides: getGridSize, generatePlotTypes, assignStartingPlots.
 */

import { FractalWorld, PLOT } from '../FractalWorld.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings,
  assignStartsBiggestArea
} from './_helpers.js';

// ============================================================================
// Lakes Script Export
// ============================================================================

export default {
  id: 'lakes',
  name: 'Lakes',
  description: 'Large continent with many interior lakes and waterways.',
  isAdvancedMap: false,
  customOptions: [],

  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return -15; },

  getGridSize(worldSize) {
    const table = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [13, 8],
      large:    [16, 10],
      huge:     [21, 13]
    };
    const grid = table[worldSize] || table.standard;
    return { width: grid[0] * 4, height: grid[1] * 4 };
  },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);

    const fw = new FractalWorld(W, H, {
      seaLevelChange,
      seaLevelMin: 7,
      seaLevelMax: 14,
      hillGroupOneRange: climateConfig.iHillRange,
      hillGroupTwoRange: climateConfig.iHillRange,
      peakPercent: climateConfig.iPeakPercent,
      wrapX: true, wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: 3,
      rift_grain: -1,
      has_center_rift: false,
      invert_heights: true,
      polar: false
    });

    const plotTypes = fw.generatePlotTypes(rng, {
      water_percent: 10,
      grain_amount: 3,
      shift_plot_types: true
    });

    // Force polar ice rows: y=0 and y=max become ocean
    for (let x = 0; x < W; x++) {
      plotTypes[0 * W + x] = PLOT.OCEAN;
      plotTypes[(H - 1) * W + x] = PLOT.OCEAN;
    }

    return plotTypes;
  },

  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) {
    return assignStartsBiggestArea(
      settings.numPlayers, plotTypes, terrain, features, bonuses,
      rivers, lakes, W, H, -15, true, rng
    );
  }
};
