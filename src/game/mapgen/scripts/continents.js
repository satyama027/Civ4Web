/**
 * Continents Map Script — Port of Civ4 BTS Continents.py by Soren Johnson.
 *
 * The simplest core script. Uses default FractalWorld with center rift,
 * polar attenuation, and water_percent=75. No custom options, no grid
 * size override, no generator overrides.
 *
 * Only overrides: generatePlotTypes (center rift fractal).
 * All other hooks use orchestrator defaults.
 */

import { FractalWorld } from '../FractalWorld.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings
} from './_helpers.js';

export default {
  id: 'continents',
  name: 'Continents',
  description: 'Two to four large continents separated by ocean.',
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
      hillGroupOneRange: climateConfig.hillRange,
      hillGroupTwoRange: climateConfig.hillRange,
      peakPercent: climateConfig.peakPercent,
      wrapX: true,
      wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: 2,
      rift_grain: 2,
      has_center_rift: true,
      invert_heights: false,
      polar: true
    });

    const plotTypes = fw.generatePlotTypes(rng, {
      water_percent: 75,
      grain_amount: 3,
      shift_plot_types: true
    });

    // Add coast tiles
    TerrainGenerator.addCoastTiles(plotTypes, W, H, true, false);

    return plotTypes;
  }
};
