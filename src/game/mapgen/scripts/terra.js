/**
 * Terra Map Script — Port of Civ4 BTS Terra.py
 * by Bob Thomas (Sirian).
 *
 * Earth-like map with Old World and New World. Uses MultilayeredFractal
 * with 12+ regions. The defining mechanic: all players start on the
 * largest landmass (Old World), leaving the New World uninhabited.
 */

import { clamp } from '../utils.js';
import { FRAC_WRAP_X, FRAC_POLAR } from '../CyFractal.js';
import { PLOT } from '../FractalWorld.js';
import { MultilayeredFractal } from '../MultilayeredFractal.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings,
  findBiggestLandArea
} from './_helpers.js';

// ============================================================================
// Grain by World Size
// ============================================================================

function getTerraGrains(worldSize) {
  switch (worldSize) {
    case 'duel':
    case 'tiny':
      return { archGrain: 3, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
    case 'small':
    case 'standard':
    case 'large':
      return { archGrain: 4, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
    case 'huge':
      return { archGrain: 5, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
    default:
      return { archGrain: 4, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
  }
}

// ============================================================================
// Shape-Varied Subcontinent
// ============================================================================

function addTerraSubcontinent(mlf, rng, regionParams, westLon, eastLon,
                               southLat, northLat, dim, sea,
                               contGrain, archGrain, iFlags, size) {
  const shape = rng.nextInt(0, 4);
  const region = regionParams(westLon, eastLon, southLat, northLat);

  if (shape > 1) {
    // 60% — Standard subcontinent
    mlf.generatePlotsInRegion(rng, {
      ...region,
      iWaterPercent: (size === 'large' ? 55 : 60) + sea,
      iRegionGrain: contGrain,
      iRegionHillsGrain: contGrain + 1,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: true,
      iStrip: 15,
      rift_grain: -1
    });
  } else if (shape === 1) {
    // 20% — Irregular
    mlf.generatePlotsInRegion(rng, {
      ...region,
      iWaterPercent: 66 + sea,
      iRegionGrain: contGrain + 1,
      iRegionHillsGrain: contGrain + 2,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: true,
      iStrip: 15,
      rift_grain: 2,
      has_center_rift: false
    });
  } else {
    // 20% — Archipelago-style
    mlf.generatePlotsInRegion(rng, {
      ...region,
      iWaterPercent: 75 + sea,
      iRegionGrain: archGrain,
      iRegionHillsGrain: archGrain + 1,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: false,
      rift_grain: -1
    });
  }
}

// ============================================================================
// Region Layout — 12+ Regions
// ============================================================================

function generateTerraRegions(W, H, sea, grains, iFlags, climateConfig,
                               roll1, roll2, rng) {
  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: sea,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: true, wrapY: false
  });

  const { archGrain, contGrain, gaeaGrain, eurasiaGrain } = grains;

  // Helper: apply N/S and E/W flips to lat/lon coordinates
  function flipLat(lat) { return roll1 ? (1.0 - lat) : lat; }
  function flipLon(lon) { return roll2 ? (1.0 - lon) : lon; }

  // Convert fractional [westLon, eastLon, southLat, northLat] to plot coords
  function regionParams(westLon, eastLon, southLat, northLat) {
    const wl = flipLon(westLon);
    const el = flipLon(eastLon);
    const sl = flipLat(southLat);
    const nl = flipLat(northLat);

    const actualWest = Math.min(wl, el);
    const actualEast = Math.max(wl, el);
    const actualSouth = Math.min(sl, nl);
    const actualNorth = Math.max(sl, nl);

    const westX = Math.floor(actualWest * W);
    const southY = Math.floor(actualSouth * H);
    const regionW = Math.max(1, Math.floor((actualEast - actualWest) * W));
    const regionH = Math.max(1, Math.floor((actualNorth - actualSouth) * H));

    return { iRegionWestX: westX, iRegionSouthY: southY,
             iRegionWidth: regionW, iRegionHeight: regionH };
  }

  // ── REGION 1: EURASIA (main) ──
  const eurasiaMain = regionParams(0.45, 0.95, 0.45, 0.95);
  mlf.generatePlotsInRegion(rng, {
    ...eurasiaMain,
    iWaterPercent: 55 + sea,
    iRegionGrain: eurasiaGrain,
    iRegionHillsGrain: eurasiaGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: 2,
    has_center_rift: false,
    invert_heights: false
  });

  // ── REGION 2: EURASIA (cohesion) ──
  const cohInsetX = Math.floor(eurasiaMain.iRegionWidth * 0.10);
  const cohInsetY = Math.floor(eurasiaMain.iRegionHeight * 0.25);
  mlf.generatePlotsInRegion(rng, {
    iRegionWestX: eurasiaMain.iRegionWestX + cohInsetX,
    iRegionSouthY: eurasiaMain.iRegionSouthY + cohInsetY,
    iRegionWidth: eurasiaMain.iRegionWidth - 2 * cohInsetX,
    iRegionHeight: eurasiaMain.iRegionHeight - 2 * cohInsetY,
    iWaterPercent: 60 + sea,
    iRegionGrain: gaeaGrain,
    iRegionHillsGrain: gaeaGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 3: NORTH AMERICA ──
  const nAmerica = regionParams(0.05, 0.35, 0.52, 0.85);
  mlf.generatePlotsInRegion(rng, {
    ...nAmerica,
    iWaterPercent: 61 + sea,
    iRegionGrain: contGrain,
    iRegionHillsGrain: contGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: -1
  });

  // ── REGION 4: SOUTH AMERICA ──
  const sAmerica = regionParams(0.05, 0.30, 0.25, 0.47);
  mlf.generatePlotsInRegion(rng, {
    ...sAmerica,
    iWaterPercent: 55 + sea,
    iRegionGrain: contGrain,
    iRegionHillsGrain: contGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: -1
  });

  // ── REGION 5: SOUTH AMERICA TIP ──
  const sTip = regionParams(0.10, 0.25, 0.18, 0.30);
  mlf.generatePlotsInRegion(rng, {
    ...sTip,
    iWaterPercent: 67 + sea,
    iRegionGrain: contGrain,
    iRegionHillsGrain: contGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 6: YUKON ──
  const yukon = regionParams(0.05, 0.25, 0.75, 0.93);
  mlf.generatePlotsInRegion(rng, {
    ...yukon,
    iWaterPercent: 68 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 7: ARCTIC ISLANDS ──
  const arctic = regionParams(0.05, 0.35, 0.88, 0.97);
  mlf.generatePlotsInRegion(rng, {
    ...arctic,
    iWaterPercent: 76 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 8: CENTRAL AMERICA ──
  const cAmerica = regionParams(0.10, 0.30, 0.45, 0.55);
  mlf.generatePlotsInRegion(rng, {
    ...cAmerica,
    iWaterPercent: 60 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 9: CARIBBEAN ──
  const carib = regionParams(0.15, 0.35, 0.40, 0.52);
  mlf.generatePlotsInRegion(rng, {
    ...carib,
    iWaterPercent: 75 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 10: LARGE SUBCONTINENT (Africa) ──
  addTerraSubcontinent(mlf, rng, regionParams, 0.55, 0.80, 0.20, 0.45,
                        0.125, sea, contGrain, archGrain, iFlags, 'large');

  // ── REGION 11: SMALL SUBCONTINENT (India) ──
  addTerraSubcontinent(mlf, rng, regionParams, 0.80, 0.95, 0.35, 0.55,
                        0.125, sea, contGrain, archGrain, iFlags, 'small');

  // ── REGIONS 12+: MINOR REGIONS (Australia/Antarctica) ──
  const numMinor = 2 + rng.nextInt(0, 2);
  const minorSlots = [
    [0.75, 0.95, 0.10, 0.30],
    [0.45, 0.70, 0.05, 0.18],
    [0.60, 0.80, 0.08, 0.22],
    [0.85, 0.98, 0.15, 0.35]
  ];
  for (let i = 0; i < numMinor && i < minorSlots.length; i++) {
    const [wl, el, sl, nl] = minorSlots[i];
    const minor = regionParams(wl, el, sl, nl);
    const minorWater = 60 + rng.nextInt(0, 10) + sea;
    mlf.generatePlotsInRegion(rng, {
      ...minor,
      iWaterPercent: minorWater,
      iRegionGrain: archGrain,
      iRegionHillsGrain: archGrain + 1,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: false,
      rift_grain: -1
    });
  }

  // Extract 1D plot array
  const plotTypes1D = new Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      plotTypes1D[y * W + x] = mlf.getPlotType(x, y);
    }
  }
  return plotTypes1D;
}

// ============================================================================
// Starting Plots — Old World Only
// ============================================================================

function assignStartsTerra(numPlayers, plotTypes1D, terrain1D, features1D,
                            bonuses1D, rivers1D, lakes1D, W, H, _rng) {
  const { areaId: biggestAreaId, areas } = findBiggestLandArea(plotTypes1D, W, H, true);

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: -20,
    wrapX: true, wrapY: false
  });

  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      if (areas[idx] !== biggestAreaId) continue;
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const baseRange = sp._startingPlotRange(numPlayers);
  let minDist = baseRange;
  const starts = [];

  for (let pass = 0; pass < 50 && starts.length < numPlayers; pass++) {
    for (const candidate of candidates) {
      if (starts.length >= numPlayers) break;
      if (starts.some(s => s.x === candidate.x && s.y === candidate.y)) continue;
      let tooClose = false;
      for (const existing of starts) {
        if (sp._wrappedDistance(candidate.x, candidate.y, existing.x, existing.y) < minDist) {
          tooClose = true; break;
        }
      }
      if (!tooClose) starts.push({ x: candidate.x, y: candidate.y });
    }
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}

// ============================================================================
// Terra Script Export
// ============================================================================

export default {
  id: 'terra',
  name: 'Terra',
  description: 'Old World and New World separated by ocean.',
  isAdvancedMap: false,
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return -20; },
  customOptions: [],

  getGridSize(worldSize) {
    const table = {
      duel:     [13, 8],
      tiny:     [16, 10],
      small:    [21, 13],
      standard: [26, 16],
      large:    [32, 20],
      huge:     [38, 24]
    };
    const grid = table[worldSize] || table.standard;
    return { width: grid[0] * 4, height: grid[1] * 4 };
  },

  beforeInit(settings, rng) {
    this._flipNS = rng.next() < 0.5;
    this._flipEW = rng.next() < 0.5;
  },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const sea = clamp(resolveSeaLevelChange(settings.seaLevel), -5, 5);
    const grains = getTerraGrains(settings.mapSize);
    const iFlags = FRAC_WRAP_X | FRAC_POLAR;
    return generateTerraRegions(W, H, sea, grains, iFlags, climateConfig, this._flipNS, this._flipEW, rng);
  },

  generateTerrain(W, H, plotTypes, settings, rng) {
    const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false, mapSize: settings.mapSize });
    return tg.generateTerrain(rng, plotTypes);
  },

  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) {
    return assignStartsTerra(
      settings.numPlayers, plotTypes, terrain, features, bonuses,
      rivers, lakes, W, H, rng
    );
  }
};
