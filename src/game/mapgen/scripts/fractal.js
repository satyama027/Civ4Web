/**
 * Fractal Map Script — Port of Civ4 BTS Fractal.py by Soren Johnson.
 *
 * The simplest possible script. Pure FractalWorld with no rift, no custom
 * water percent, no custom options. Result is completely unpredictable.
 *
 * Only overrides: generatePlotTypes (no rift, higher water_percent).
 * All other hooks use orchestrator defaults.
 */

import { FractalWorld } from '../FractalWorld.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings
} from './_helpers.js';

export default {
  id: 'fractal',
  name: 'Fractal',
  description: 'Randomly generated landmasses of varied shapes and sizes.',
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
  minStartingDistanceModifier() { return 0; },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);

    const fw = new FractalWorld(W, H, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.iHillRange,
      hillGroupTwoRange: climateConfig.iHillRange,
      peakPercent: climateConfig.iPeakPercent,
      wrapX: true,
      wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: 2,
      rift_grain: -1,
      has_center_rift: false,
      invert_heights: false,
      polar: true
    });

    const plotTypes = fw.generatePlotTypes(rng, {
      water_percent: 78,
      grain_amount: 3,
      shift_plot_types: true
    });

    return plotTypes;
  }
};
