/**
 * Lakes Map Script — Port of Civ4 BTS Lakes.py
 * by Andy Szybalski and Bob Thomas (Sirian).
 *
 * Oceanless planet with many small lakes. Uses an inverted fractal
 * (invert_heights=true) so what would be ocean basins become land
 * plateaus. Water percentage clamped to 7-14%.
 */

import { FractalWorld, PLOT } from '../FractalWorld.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import { FeatureGenerator } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings,
  assignStartsBiggestArea,
  buildMapResult
} from './_helpers.js';

// ============================================================================
// Lakes Script Export
// ============================================================================

export default {
  id: 'lakes',
  name: 'Lakes',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return -15; },
  customOption: null,

  getGridSize(worldSize) {
    const table = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [13, 8],
      large:    [16, 10],
      huge:     [21, 13]
    };
    return table[worldSize] || table.standard;
  },

  generate(settings, rng) {
    const { mapSize, climate, seaLevel, numPlayers } = settings;
    const climateConfig = resolveClimateSettings(climate);
    const seaLevelChange = resolveSeaLevelChange(seaLevel);

    const gridSize = this.getGridSize(mapSize);
    const W = gridSize[0] * 4;
    const H = gridSize[1] * 4;

    // Create FractalWorld with clamped sea level [7%, 14%]
    const fw = new FractalWorld(W, H, {
      seaLevelChange,
      seaLevelMin: 7,
      seaLevelMax: 14,
      hillGroupOneRange: climateConfig.hillRange,
      hillGroupTwoRange: climateConfig.hillRange,
      peakPercent: climateConfig.peakPercent,
      wrapX: true, wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: 3,
      rift_grain: -1,
      has_center_rift: false,
      invert_heights: true,
      polar: false
    });

    const plotTypes1D = fw.generatePlotTypes(rng, {
      water_percent: 10,
      grain_amount: 3,
      shift_plot_types: true
    });

    // Force polar ice rows: y=0 and y=max become ocean
    for (let x = 0; x < W; x++) {
      plotTypes1D[0 * W + x] = PLOT.OCEAN;
      plotTypes1D[(H - 1) * W + x] = PLOT.OCEAN;
    }

    // Standard pipeline
    TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

    const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false });
    const terrain1D = tg.generateTerrain(rng, plotTypes1D);

    const riverGen = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
    const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
    const lakes1D = riverGen.addLakes(plotTypes1D);

    const fg = new FeatureGenerator(W, H, {
      jungleLatitude: climateConfig.jungleLatitude,
      wrapX: true, wrapY: false
    });
    const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

    const bg = new BonusGenerator(W, H, {
      numPlayers, wrapX: true, wrapY: false
    });
    const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

    // Starting plots — all on biggest area
    const starts = assignStartsBiggestArea(
      numPlayers, plotTypes1D, terrain1D, features1D, bonuses1D,
      rivers1D, lakes1D, W, H, -15, true, rng
    );

    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: -15,
      wrapX: true, wrapY: false
    });
    sp.normalize(starts, plotTypes1D, terrain1D, features1D,
                 bonuses1D, rivers1D, lakes1D, rng);

    return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                          bonuses1D, rivers1D, lakes1D, starts);
  }
};
