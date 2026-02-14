/**
 * Continents Map Script — Port of Civ4 BTS Continents.py by Soren Johnson.
 *
 * The simplest core script. Uses default FractalWorld with center rift,
 * polar attenuation, and water_percent=75. No custom options, no grid
 * size override, no generator overrides.
 *
 * Python original:
 *   fractal_world = FractalWorld()
 *   fractal_world.initFractal(polar = True)
 *   return fractal_world.generatePlotTypes(water_percent=75)
 *
 * Only overrides: generatePlotTypes (polar + water_percent=75).
 * All other hooks (terrain, features, etc.) use orchestrator defaults.
 */

import { FractalWorld } from '../FractalWorld.js';

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
    const fw = new FractalWorld(W, H, settings);
    fw.initFractal(rng, { polar: true });
    return fw.generatePlotTypes(rng, { water_percent: 75 });
  }
};
