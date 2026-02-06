/**
 * Fractal Map Script — Port of Civ4 BTS Fractal.py by Soren Johnson.
 *
 * The simplest possible script. Pure FractalWorld with no rift, no custom
 * water percent, no custom options. Result is completely unpredictable.
 */

import { FractalWorld } from '../FractalWorld.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import { FeatureGenerator } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import {
  getDefaultDimensions,
  resolveSeaLevelChange,
  resolveClimateSettings,
  buildMapResult
} from './_helpers.js';

export default {
  id: 'fractal',
  name: 'Fractal',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },
  customOption: null,
  getGridSize() { return null; },

  generate(settings, rng) {
    const { mapSize, climate, seaLevel, numPlayers } = settings;
    const climateConfig = resolveClimateSettings(climate);
    const seaLevelChange = resolveSeaLevelChange(seaLevel);

    // 1. Resolve map dimensions (default grid size)
    const { width: W, height: H } = getDefaultDimensions(mapSize);

    // 2. Generate plot types
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
      rift_grain: -1,
      has_center_rift: false,
      invert_heights: false,
      polar: true
    });

    const plotTypes1D = fw.generatePlotTypes(rng, {
      water_percent: 78,
      grain_amount: 3,
      shift_plot_types: true
    });

    // 3. Add coast tiles
    TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

    // 4. Generate terrain
    const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false });
    const terrain1D = tg.generateTerrain(rng, plotTypes1D);

    // 5. Add rivers
    const rg = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
    const rivers1D = rg.addRivers(rng, plotTypes1D, terrain1D);

    // 6. Add lakes
    const lakes1D = rg.addLakes(plotTypes1D);

    // 7. Add features
    const fg = new FeatureGenerator(W, H, {
      jungleLatitude: climateConfig.jungleLatitude,
      wrapX: true, wrapY: false
    });
    const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

    // 8. Add bonuses
    const bg = new BonusGenerator(W, H, {
      numPlayers, wrapX: true, wrapY: false
    });
    const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

    // 9. Assign starting plots
    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: 0,
      wrapX: true, wrapY: false
    });
    const starts = sp.assignStartingPlots(
      numPlayers, rng, plotTypes1D, terrain1D, features1D, bonuses1D, rivers1D, lakes1D
    );

    // 10. Normalize
    sp.normalize(starts, plotTypes1D, terrain1D, features1D, bonuses1D, rivers1D, lakes1D, rng);

    // 11. Convert to 2D and return
    return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                          bonuses1D, rivers1D, lakes1D, starts);
  }
};
