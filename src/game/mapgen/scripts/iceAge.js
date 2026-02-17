/**
 * Ice Age Map Script — Port of Civ4 BTS Ice_Age.py
 * by Bob Thomas (Sirian).
 *
 * Frozen wasteland with habitable equatorial center. Extra-wide, short maps.
 * Custom terrain (more plains, lower snow threshold), aggressive ice placement
 * extending far from poles, and a landmass type custom option.
 */

import { FractalWorld, PLOT } from '../FractalWorld.js';
import { TerrainGenerator, TERRAIN } from '../TerrainGenerator.js';
import { FeatureGenerator, FEATURE } from '../FeatureGenerator.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings
} from './_helpers.js';

// ============================================================================
// Custom Option Resolution
// ============================================================================

function resolveIceAgeGrain(customOption, rng) {
  if (customOption === 1) {
    // Wide Continents: grain 1 or 2 with rift
    return rng.next() < 0.5
      ? { grain: 1, rift_grain: -1 }
      : { grain: 2, rift_grain: 2 };
  }
  if (customOption === 2) return { grain: 3, rift_grain: -1 };
  if (customOption === 3) return { grain: 4, rift_grain: -1 };
  if (customOption === 4) return { grain: 5, rift_grain: -1 };

  // Random (D20 weighted)
  const roll = rng.nextInt(0, 19);
  if (roll <= 1)  return { grain: 1, rift_grain: -1 };     // 10% Pangaea
  if (roll <= 4)  return { grain: 2, rift_grain: 2 };      // 15% Wide
  if (roll <= 9)  return { grain: 3, rift_grain: -1 };     // 25% Narrow
  if (roll <= 16) return { grain: 4, rift_grain: -1 };     // 35% Islands
  return { grain: 5, rift_grain: -1 };                      // 15% Tiny
}

// ============================================================================
// Custom Terrain Generator — Ice Age (colder latitudes, more plains)
// ============================================================================

class IceAgeTerrainGenerator extends TerrainGenerator {
  constructor(W, H, settings = {}) {
    super(W, H, {
      iDesertPercent: 20,
      iPlainsPercent: 50,
      fSnowLatitude: 0.4,
      fTundraLatitude: 0.3,
      fGrassLatitude: 0.1,
      fDesertBottomLatitude: 0.1,
      fDesertTopLatitude: 0.2,
      wrapX: true, wrapY: false,
      mapSize: settings.mapSize
    });
  }

  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return baseLat * 0.6;  // Compress latitude (shorter map)
  }
}

// ============================================================================
// Custom Feature Generator — Ice Age (aggressive ice, reduced jungle)
// ============================================================================

class IceAgeFeatureGenerator extends FeatureGenerator {
  constructor(W, H, settings = {}) {
    super(W, H, {
      iJunglePercent: 30,
      iForestPercent: 50,
      jungle_grain: 7,
      jungleLatitude: 0.00,  // no jungle (ice age)
      randIceLatitude: settings.randIceLatitude ?? 0.30,
      wrapX: true, wrapY: false,
      mapSize: settings.mapSize
    });
  }

  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return baseLat * 0.6;
  }

  addIceAtPlot(x, y, lat, plotTypes, features, rng) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;

    if (plotTypes[idx] !== PLOT.OCEAN) return;

    // Edge rows: always ice
    if (y === 0 || y === H - 1) {
      features[idx] = FEATURE.ICE;
      return;
    }

    // Standard dense/sparse bands (from parent class)
    super.addIceAtPlot(x, y, lat, plotTypes, features, rng);

    // Additional aggressive ice bands (Ice Age specific)
    if (features[idx] !== FEATURE.NONE) return;

    if (lat > 0.47) {
      if (rng.next() < 8.0 * (lat - 0.50)) { features[idx] = FEATURE.ICE; return; }
      if (rng.next() < 4.0 * (lat - 0.46)) { features[idx] = FEATURE.ICE; return; }
    }
    if (lat > 0.39 && rng.next() < 0.06) { features[idx] = FEATURE.ICE; return; }
    if (lat > 0.32 && rng.next() < 0.04) { features[idx] = FEATURE.ICE; return; }
    if (lat > 0.27 && rng.next() < 0.02) { features[idx] = FEATURE.ICE; }
  }
}

// ============================================================================
// Plot Generation
// ============================================================================

function generateIceAgePlots(W, H, seaLevelChange, climateConfig, grainConfig, rng) {
  const fw = new FractalWorld(W, H, {
    seaLevelChange,
    seaLevelMin: 60,
    seaLevelMax: 72,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: true, wrapY: false
  });

  fw.initFractal(rng, {
    continent_grain: grainConfig.grain,
    rift_grain: grainConfig.rift_grain,
    has_center_rift: grainConfig.rift_grain >= 0,
    invert_heights: false,
    polar: true
  });

  return fw.generatePlotTypes(rng, {
    water_percent: 65,
    grain_amount: 3,
    shift_plot_types: true
  });
}

// ============================================================================
// Ice Age Script Export
// ============================================================================

export default {
  id: 'ice_age',
  name: 'Ice Age',
  description: 'Wide map with aggressive ice coverage and varied terrain.',
  isAdvancedMap: true,
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return 0; },

  customOptions: [
    {
      id: 'landmass_type',
      name: 'Landmass Type',
      values: [
        { id: 'random', label: 'Random' },
        { id: 'wide', label: 'Wide Continents' },
        { id: 'narrow', label: 'Narrow Continents' },
        { id: 'islands', label: 'Islands' },
        { id: 'small_islands', label: 'Small Islands' }
      ],
      default: 0,
      allowRandom: false
    }
  ],

  getGridSize(worldSize) {
    const table = {
      duel:     [10, 4],
      tiny:     [13, 5],
      small:    [16, 7],
      standard: [21, 9],
      large:    [26, 11],
      huge:     [32, 13]
    };
    const grid = table[worldSize] || table.standard;
    return { width: grid[0] * 4, height: grid[1] * 4 };
  },

  beforeInit(settings, rng) {
    const customOption = settings.customOption != null ? settings.customOption : 0;
    this._grainConfig = resolveIceAgeGrain(customOption, rng);
  },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);
    return generateIceAgePlots(W, H, seaLevelChange, climateConfig, this._grainConfig, rng);
  },

  generateTerrain(W, H, plotTypes, settings, rng) {
    const tg = new IceAgeTerrainGenerator(W, H, { mapSize: settings.mapSize });
    return tg.generateTerrain(rng, plotTypes);
  },

  addFeatures(W, H, plotTypes, terrain, rivers, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const fg = new IceAgeFeatureGenerator(W, H, {
      randIceLatitude: climateConfig.fRandIceLatitude,
      mapSize: settings.mapSize
    });
    return fg.generateFeatures(rng, plotTypes, terrain, rivers);
  }
};
