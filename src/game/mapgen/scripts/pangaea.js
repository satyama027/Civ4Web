/**
 * Pangaea Map Script — Port of Civ4 BTS Pangaea.py
 * by Bob Thomas (Sirian), Soren Johnson, and Andy Szybalski.
 *
 * The most complex core script. Offers four "Shoreline" variants, each
 * using a different generation algorithm:
 * - Natural: MultilayeredFractal type 0 (main landmass + subcontinents)
 * - Pressed Equatorial: MultilayeredFractal type 1
 * - Pressed Polar: MultilayeredFractal type 2
 * - Solid (Soren's): HintedWorld(8, 4) with manual border/interior setup
 * - Solid (Andy's): HintedWorld(16, 8) with continent growth
 *
 * The "Random" option selects among these with a weighted distribution.
 */

import { clamp } from '../utils.js';
import { CyFractal, FRAC_WRAP_X, FRAC_POLAR } from '../CyFractal.js';
import { PLOT } from '../FractalWorld.js';
import { HintedWorld } from '../HintedWorld.js';
import { MultilayeredFractal } from '../MultilayeredFractal.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings,
  findBiggestLandArea
} from './_helpers.js';

// ============================================================================
// Pangaea Type Resolution
// ============================================================================

function resolvePangaeaType(customOption, rng) {
  if (customOption === 1) return 'natural';
  if (customOption === 2) {
    return rng.next() < 0.5 ? 'pressed_equatorial' : 'pressed_polar';
  }
  if (customOption === 3) {
    return rng.next() < 0.5 ? 'solid_soren' : 'solid_andy';
  }

  // Random (option 0): weighted selection
  const roll = rng.next();
  if (roll < 0.40) return 'natural';
  if (roll < 0.50) return 'pressed_equatorial';
  if (roll < 0.70) return 'pressed_polar';
  if (roll < 0.90) return 'solid_andy';
  return 'solid_soren';
}

// ============================================================================
// Grain Helpers
// ============================================================================

function getPangaeaGrain(worldSize) {
  switch (worldSize) {
    case 'duel':
    case 'tiny':     return 3;
    case 'small':
    case 'standard':
    case 'large':    return 4;
    case 'huge':     return 5;
    default:         return 4;
  }
}

// ============================================================================
// Subcontinent Slot Tables (exact Civ4 format)
// Each entry: [westLon, southLat, vertRange, horzRange, southShift]
// ============================================================================

// TYPE 0: Natural
const TYPE0_SLOTS = [
  [0.05, 0.575, 0.0, 0.0, 0.15],
  [0.05, 0.275, 0.0, 0.0, 0.15],
  [0.2,  0.175, 0.0, 0.0, 0.15],
  [0.5,  0.175, 0.0, 0.0, 0.15],
  [0.65, 0.575, 0.0, 0.0, 0.15],
  [0.65, 0.275, 0.0, 0.0, 0.15],
  [0.2,  0.675, 0.0, 0.0, 0.15],
  [0.5,  0.675, 0.0, 0.0, 0.15]
];

// TYPE 1: Pressed Equatorial
const TYPE1_SLOTS = [
  [0.05, 0.2,  0.2, 0.0, 0.0],
  [0.55, 0.2,  0.2, 0.0, 0.0],
  [0.2,  0.05, 0.0, 0.2, 0.0],
  [0.2,  0.55, 0.0, 0.2, 0.0]
];

// TYPE 2: Pressed Polar — northward shift (polarShiftRoll == 1)
const TYPE2_SLOTS_NORTH = [
  [0.05, 0.375, 0.2, 0.0, 0],
  [0.55, 0.375, 0.2, 0.0, 0],
  [0.1,  0.225, 0.0, 0.15, 0],
  [0.3,  0.225, 0.0, 0.15, 0]
];

// TYPE 2: Pressed Polar — southward shift (polarShiftRoll == 0)
const TYPE2_SLOTS_SOUTH = [
  [0.05, 0.025, 0.2, 0.0, 0],
  [0.55, 0.025, 0.2, 0.0, 0],
  [0.1,  0.375, 0.0, 0.15, 0],
  [0.3,  0.375, 0.0, 0.15, 0]
];

// ============================================================================
// Subcontinent Placement (exact Civ4 algorithm)
// ============================================================================

function addSubcontinents(mlf, rng, numSubcontinents, dimension,
                           W, H, sea, grain, typeIndex, bSouthwardShift, scValues) {
  // Subcontinents use FRAC_POLAR only (no X-wrap) — Civ4's self.iRoundFlags
  const iRoundFlags = FRAC_POLAR;

  const slots = scValues.map(s => [...s]); // copy

  while (numSubcontinents > 0 && slots.length > 0) {
    // Choose a random slot
    const scIndex = slots.length > 1 ? rng.nextInt(0, slots.length - 1) : 0;
    const [scWestLon, scSouthLat, scVertRange, scHorzRange, scSouthShift] = slots[scIndex];

    let scWidth = Math.floor(dimension * W);
    let scHeight = Math.floor(dimension * H);

    // Compute position with optional variance
    let scHorzShift = 0;
    let scVertShift = 0;
    if (scHorzRange > 0.0) {
      scHorzShift = rng.nextInt(0, Math.max(0, Math.floor(W * scHorzRange) - 1));
    }
    if (scVertRange > 0.0) {
      // Note: Civ4 uses iW (not iH) for vertical range — replicate the quirk
      scVertShift = rng.nextInt(0, Math.max(0, Math.floor(W * scVertRange) - 1));
    }

    let scWestX = Math.floor(W * scWestLon) + scHorzShift;
    let scEastX = scWestX + scWidth;
    // Clamp width to not exceed map
    while (scEastX >= W) {
      scWidth--;
      scEastX = scWestX + scWidth;
    }

    let scSouthY = Math.floor(H * scSouthLat) + scVertShift;
    // Apply southward shift if applicable
    if (bSouthwardShift) {
      scSouthY -= Math.floor(H * scSouthShift);
    }
    let scNorthY = scSouthY + scHeight;
    // Clamp height to not exceed map
    while (scNorthY >= H) {
      scHeight--;
      scNorthY = scSouthY + scHeight;
    }
    // Clamp south to >= 0
    if (scSouthY < 0) scSouthY = 0;

    if (scWidth <= 0 || scHeight <= 0) {
      slots.splice(scIndex, 1);
      numSubcontinents--;
      continue;
    }

    const scShape = rng.nextInt(0, 4);
    let scWater, scGrain, scRift;
    if (scShape > 1) {
      // 60% — Regular subcontinent
      scWater = 55 + sea; scGrain = 1; scRift = -1;
    } else if (scShape === 1) {
      // 20% — Irregular subcontinent
      scWater = 66 + sea; scGrain = 2; scRift = 2;
    } else {
      // 20% — Archipelago appendage
      scWater = 77 + sea; scGrain = grain; scRift = -1;
    }

    const scHillsGrain = (scShape === 0) ? grain + 1 : grain;

    mlf.generatePlotsInRegion(rng, {
      iWaterPercent: scWater,
      iRegionWidth: scWidth,
      iRegionHeight: scHeight,
      iRegionWestX: scWestX,
      iRegionSouthY: scSouthY,
      iRegionGrain: scGrain,
      iRegionHillsGrain: scHillsGrain,
      iRegionPlotFlags: iRoundFlags,
      iRegionTerrainFlags: iRoundFlags,
      iRegionFracXExp: 6,
      iRegionFracYExp: 6,
      bShift: true,
      iStrip: 7,
      rift_grain: scRift,
      has_center_rift: false,
      invert_heights: false
    });

    slots.splice(scIndex, 1);
    numSubcontinents--;
  }
}

// ============================================================================
// Multilayered Pangaea Generation
// ============================================================================

function generateMultilayered(W, H, typeIndex, seaLevelChange, climateConfig, worldSize, rng) {
  const sea = clamp(seaLevelChange, -5, 5);
  const grain = getPangaeaGrain(worldSize);

  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: sea,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: true, wrapY: false
  });

  const iFlags = FRAC_WRAP_X | FRAC_POLAR;

  let mainWestLon = 0.2;
  let mainEastLon = 0.8;
  let mainSouthLat = 0.2;
  let mainNorthLat = 0.8;
  let subcontinentDimension = 0.4;
  let numSubcontinents;
  let bSouthwardShift = false;
  let scValues;

  if (typeIndex === 0) {
    // TYPE 0: NATURAL
    subcontinentDimension = 0.3;

    // Shift mainland north or south
    if (rng.next() < 0.5) {
      mainNorthLat += 0.075;
      mainSouthLat += 0.075;
    } else {
      mainNorthLat -= 0.075;
      mainSouthLat -= 0.075;
      bSouthwardShift = true;
    }

    // Civ4: 4 + dice.get(3) → 4, 5, or 6
    numSubcontinents = 4 + rng.nextInt(0, 2);
    scValues = TYPE0_SLOTS;
  } else if (typeIndex === 1) {
    // TYPE 1: PRESSED EQUATORIAL
    // Civ4: equRoll = dice.get(4); if equRoll == 3: equRoll = 1
    // Gives: 0, 1, 2, or 1 → numSubcontinents = 2, 3, 4, or 3
    let equRoll = rng.nextInt(0, 3);
    if (equRoll === 3) equRoll = 1;
    numSubcontinents = 2 + equRoll;
    scValues = TYPE1_SLOTS;
  } else {
    // TYPE 2: PRESSED POLAR
    numSubcontinents = 3;

    if (rng.next() < 0.5) {
      // Northward shift
      mainSouthLat += 0.175;
      mainNorthLat += 0.175;
      bSouthwardShift = false;
      scValues = TYPE2_SLOTS_NORTH;
    } else {
      // Southward shift
      mainSouthLat -= 0.175;
      mainNorthLat -= 0.175;
      bSouthwardShift = true;
      scValues = TYPE2_SLOTS_SOUTH;
    }
  }

  const mainWestX  = Math.floor(mainWestLon * W);
  const mainEastX  = Math.floor(mainEastLon * W);
  const mainSouthY = Math.floor(mainSouthLat * H);
  const mainNorthY = Math.floor(mainNorthLat * H);
  const mainWidth  = mainEastX - mainWestX + 1;
  const mainHeight = mainNorthY - mainSouthY + 1;

  // PASS 1: Main landmass
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 55 + sea,
    iRegionWidth: mainWidth,
    iRegionHeight: mainHeight,
    iRegionWestX: mainWestX,
    iRegionSouthY: mainSouthY,
    iRegionGrain: 2,
    iRegionHillsGrain: grain,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: 2,
    has_center_rift: false,
    invert_heights: false
  });

  // PASS 2: Cohesion fill (exact Civ4 dimensions)
  // Python: second_layerHeight = mainHeight/2
  //         second_layerWestX = mainWestX + mainWidth/10
  //         second_layerEastX = mainEastX - mainWidth/10
  //         second_layerWidth = second_layerEastX - second_layerWestX + 1
  //         second_layerSouthY = mainSouthY + mainHeight/4
  const second_layerHeight = Math.floor(mainHeight / 2);
  const second_layerWestX = mainWestX + Math.floor(mainWidth / 10);
  const second_layerEastX = mainEastX - Math.floor(mainWidth / 10);
  const second_layerWidth = second_layerEastX - second_layerWestX + 1;
  const second_layerSouthY = mainSouthY + Math.floor(mainHeight / 4);

  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 60 + sea,
    iRegionWidth: second_layerWidth,
    iRegionHeight: second_layerHeight,
    iRegionWestX: second_layerWestX,
    iRegionSouthY: second_layerSouthY,
    iRegionGrain: 1,
    iRegionHillsGrain: grain,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: -1,
    has_center_rift: false,
    invert_heights: false
  });

  // SUBCONTINENTS
  addSubcontinents(mlf, rng, numSubcontinents, subcontinentDimension,
                    W, H, sea, grain, typeIndex, bSouthwardShift, scValues);

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
// Soren's Hinted Pangaea
// ============================================================================

function generateSorensHinted(W, H, seaLevelChange, climateConfig, rng) {
  const maxRetries = 50;

  for (let retry = 0; retry < maxRetries; retry++) {
    const hw = new HintedWorld(W, H, 8, 4, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.iHillRange,
      hillGroupTwoRange: climateConfig.iHillRange,
      peakPercent: climateConfig.iPeakPercent,
      wrapX: true, wrapY: false
    });

    // Set border cells to ocean (value 0), interior to land
    for (let bx = 0; bx < 8; bx++) {
      for (let by = 0; by < 4; by++) {
        if (bx === 0 || bx === 7 || by === 0 || by === 3) {
          hw.setValue(bx, by, 0);
        } else {
          hw.setValue(bx, by, 200 + rng.nextInt(0, 54));
        }
      }
    }

    // Exact Civ4 bay placement (4 specific positions, not random interior cells)
    // Civ4: setValue(1, 1+rand(3), rand(64))
    hw.setValue(1, 1 + rng.nextInt(0, 2), rng.nextInt(0, 63));
    // Civ4: setValue(2+rand(2), 1+rand(3), rand(64))
    hw.setValue(2 + rng.nextInt(0, 1), 1 + rng.nextInt(0, 2), rng.nextInt(0, 63));
    // Civ4: setValue(4+rand(2), 1+rand(3), rand(64))
    hw.setValue(4 + rng.nextInt(0, 1), 1 + rng.nextInt(0, 2), rng.nextInt(0, 63));
    // Civ4: setValue(6, 1+rand(3), rand(64))
    hw.setValue(6, 1 + rng.nextInt(0, 2), rng.nextInt(0, 63));

    // 50% chance of extra bay on column 2 or 5
    if (rng.next() < 0.5) {
      hw.setValue(2, 1 + rng.nextInt(0, 2), rng.nextInt(0, 63));
    } else {
      hw.setValue(5, 1 + rng.nextInt(0, 2), rng.nextInt(0, 63));
    }

    hw.buildAllContinents(rng);

    const plotTypes = hw.generatePlotTypes(rng, {
      water_percent: -1,
      shift_plot_types: true
    });

    // Cohesion check: biggest land area must be >= 90% of total land
    const { areaSizes } = findBiggestLandArea(plotTypes, W, H, true);
    const sizes = Object.values(areaSizes);
    const totalLand = sizes.reduce((a, b) => a + b, 0);
    const biggestArea = sizes.length > 0 ? Math.max(...sizes) : 0;

    if (totalLand === 0 || biggestArea / totalLand >= 0.90) {
      return plotTypes;
    }
  }

  // Safety fallback: return last attempt
  const hw = new HintedWorld(W, H, 8, 4, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: true, wrapY: false
  });
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 4; by++) {
      if (bx === 0 || bx === 7 || by === 0 || by === 3) hw.setValue(bx, by, 0);
      else hw.setValue(bx, by, 200 + rng.nextInt(0, 54));
    }
  }
  hw.buildAllContinents(rng);
  return hw.generatePlotTypes(rng, { water_percent: -1, shift_plot_types: true });
}

// ============================================================================
// Andy's Hinted Pangaea
// ============================================================================

function generateAndysHinted(W, H, seaLevelChange, climateConfig, rng) {
  const maxRetries = 50;

  for (let retry = 0; retry < maxRetries; retry++) {
    const hw = new HintedWorld(W, H, 16, 8, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.iHillRange,
      hillGroupTwoRange: climateConfig.iHillRange,
      peakPercent: climateConfig.iPeakPercent,
      wrapX: true, wrapY: false
    });

    const numBlocks = 16 * 8;
    const numBlocksLand = Math.floor(numBlocks * 0.33);

    // Civ4: rand(5)+4 → 4-8, rand(3)+2 → 2-4
    const cx = rng.nextInt(4, 8);
    const cy = rng.nextInt(2, 4);
    const success = hw.addContinent(rng, numBlocksLand, cx, cy);

    if (!success) {
      // Civ4: if addContinent fails, fall back to Soren's
      return generateSorensHinted(W, H, seaLevelChange, climateConfig, rng);
    }

    // Force ocean at poles (Civ4: set y=0 and y=h-1 to 1)
    for (let x = 0; x < 16; x++) {
      hw.setValue(x, 0, 1);
      hw.setValue(x, 7, 1);
    }

    hw.buildAllContinents(rng);

    const plotTypes = hw.generatePlotTypes(rng, {
      water_percent: -1,
      shift_plot_types: true
    });

    // Plot-level cohesion check (matches Civ4 original)
    const { areaSizes } = findBiggestLandArea(plotTypes, W, H, true);
    const sizes = Object.values(areaSizes);
    const totalLand = sizes.reduce((a, b) => a + b, 0);
    const biggestArea = sizes.length > 0 ? Math.max(...sizes) : 0;

    if (totalLand === 0 || biggestArea / totalLand >= 0.90) {
      return plotTypes;
    }
  }

  // Safety fallback
  const hw = new HintedWorld(W, H, 16, 8, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: true, wrapY: false
  });
  const numBlocksLand = Math.floor(128 * 0.33);
  hw.addContinent(rng, numBlocksLand, 8, 4);
  hw.buildAllContinents(rng);
  return hw.generatePlotTypes(rng, {
    water_percent: -1,
    shift_plot_types: true
  });
}

// ============================================================================
// Cohesion Repair (exact Civ4 generateTerrainTypes repair)
// ============================================================================

function applyCohesionRepair(plotTypes1D, _terrain1D, W, H, pangaeaType,
                              _seaLevelChange, _climateConfig, rng, shiftInfo) {
  const threshold = (pangaeaType === 'solid_soren' || pangaeaType === 'solid_andy')
    ? 0.90 : 0.80;

  let totalLand = 0;
  for (let i = 0; i < W * H; i++) {
    if (plotTypes1D[i] !== PLOT.OCEAN) {
      totalLand++;
    }
  }
  if (totalLand === 0) return;

  const { areaSizes } = findBiggestLandArea(plotTypes1D, W, H, true);
  const biggestSize = Math.max(...Object.values(areaSizes));

  if (biggestSize / totalLand >= threshold) return;

  // Civ4 repair region: 30-70% horizontal, 40-60% vertical (with shift)
  const iWestX = Math.floor(0.3 * W);
  const eastX = Math.floor(0.7 * W);
  let southLat = 0.4;
  let northLat = 0.6;

  // Adjust vertical position based on pangaea type shift
  if (shiftInfo) {
    if (shiftInfo.type === 'natural') {
      if (shiftInfo.shiftedNorth) {
        southLat += 0.075;
        northLat += 0.075;
      } else {
        southLat -= 0.075;
        northLat -= 0.075;
      }
    } else if (shiftInfo.type === 'pressed_polar') {
      if (shiftInfo.shiftedNorth) {
        southLat += 0.175;
        northLat += 0.175;
      } else {
        southLat -= 0.175;
        northLat -= 0.175;
      }
    }
  }

  const iSouthY = Math.floor(southLat * H);
  const northY = Math.floor(northLat * H);
  const iRegionWidth = eastX - iWestX + 1;
  const iRegionHeight = northY - iSouthY + 1;

  if (iRegionWidth <= 0 || iRegionHeight <= 0) return;

  const iHorzFlags = FRAC_WRAP_X | FRAC_POLAR;

  // Civ4: fracInit(iRegionWidth, iRegionHeight, grain, dice, flags, fracXExp=7, fracYExp=5)
  const repairFrac = new CyFractal(7, 5);
  repairFrac.fracInit(iRegionWidth, iRegionHeight, 1, rng, iHorzFlags);

  const hillsFrac = new CyFractal(7, 5);
  hillsFrac.fracInit(iRegionWidth, iRegionHeight, 3, rng, iHorzFlags);

  const peaksFrac = new CyFractal(7, 5);
  peaksFrac.fracInit(iRegionWidth, iRegionHeight, 4, rng, iHorzFlags);

  const waterThreshold = repairFrac.getHeightFromPercent(40);
  const hillsBottom = hillsFrac.getHeightFromPercent(20);
  const hillsTop = hillsFrac.getHeightFromPercent(30);
  const hills2Bottom = hillsFrac.getHeightFromPercent(70);
  const hills2Top = hillsFrac.getHeightFromPercent(80);
  const peakThreshold = peaksFrac.getHeightFromPercent(25);

  for (let rx = 0; rx < iRegionWidth; rx++) {
    for (let ry = 0; ry < iRegionHeight; ry++) {
      const globalX = (iWestX + rx) % W;
      const globalY = iSouthY + ry;
      if (globalY < 0 || globalY >= H) continue;

      const globalIdx = globalY * W + globalX;

      if (plotTypes1D[globalIdx] !== PLOT.OCEAN) {
        continue;
      }

      const val = repairFrac.getHeight(rx, ry);
      if (val <= waterThreshold) continue;

      const hillVal = hillsFrac.getHeight(rx, ry);
      if ((hillVal >= hillsBottom && hillVal <= hillsTop) ||
          (hillVal >= hills2Bottom && hillVal <= hills2Top)) {
        const peakVal = peaksFrac.getHeight(rx, ry);
        if (peakVal <= peakThreshold) {
          plotTypes1D[globalIdx] = PLOT.PEAK;
        } else {
          plotTypes1D[globalIdx] = PLOT.HILLS;
        }
      } else {
        plotTypes1D[globalIdx] = PLOT.LAND;
      }
    }
  }
}

// ============================================================================
// Starting Plots — Biggest Area Constraint
// ============================================================================

function assignStartsPangaea(numPlayers, plotTypes1D, terrain1D, features1D,
                              bonuses1D, rivers1D, lakes1D, W, H, _rng) {
  const { areaId: biggestAreaId, areas } = findBiggestLandArea(plotTypes1D, W, H, true);

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: 0,
    wrapX: true, wrapY: false
  });

  // Score all tiles
  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  // Build candidate list filtered to biggest area
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

  // Multi-pass assignment with relaxing distance
  const baseRange = sp._startingPlotRange(numPlayers);
  let minDist = baseRange;
  const starts = [];

  for (let pass = 0; pass < 50 && starts.length < numPlayers; pass++) {
    for (const candidate of candidates) {
      if (starts.length >= numPlayers) break;
      if (starts.some(s => s.x === candidate.x && s.y === candidate.y)) continue;

      let tooClose = false;
      for (const existing of starts) {
        const dist = sp._wrappedDistance(candidate.x, candidate.y, existing.x, existing.y);
        if (dist < minDist) { tooClose = true; break; }
      }

      if (!tooClose) {
        starts.push({ x: candidate.x, y: candidate.y });
      }
    }
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}

// ============================================================================
// Pangaea Script Export
// ============================================================================

const GRID_TABLE = {
  duel:     [8, 5],
  tiny:     [10, 6],
  small:    [13, 8],
  standard: [16, 10],
  large:    [21, 13],
  huge:     [26, 16]
};

export default {
  id: 'pangaea',
  name: 'Pangaea',
  description: 'One large landmass with optional variations.',
  isAdvancedMap: false,
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
      id: 'shoreline',
      name: 'Shoreline',
      values: [
        { id: 'random', label: 'Random' },
        { id: 'natural', label: 'Natural' },
        { id: 'pressed', label: 'Pressed' },
        { id: 'solid', label: 'Solid' }
      ],
      default: 0,
      allowRandom: false
    }
  ],

  getGridSize(worldSize) {
    const grid = GRID_TABLE[worldSize] || GRID_TABLE.standard;
    return { width: grid[0] * 4, height: grid[1] * 4 };
  },

  beforeInit(settings, rng) {
    const optionIndex = settings.customOption != null ? settings.customOption : 0;
    this._pangaeaType = resolvePangaeaType(optionIndex, rng);
  },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);
    let plotTypes;
    let shiftInfo = null;

    switch (this._pangaeaType) {
      case 'natural':
      case 'pressed_equatorial':
      case 'pressed_polar': {
        const typeIndex = this._pangaeaType === 'natural' ? 0
          : this._pangaeaType === 'pressed_equatorial' ? 1 : 2;
        const result = generateMultilayeredWithShiftInfo(
          W, H, typeIndex, seaLevelChange, climateConfig, settings.mapSize, rng);
        plotTypes = result.plotTypes;
        shiftInfo = result.shiftInfo;
        break;
      }
      case 'solid_soren':
        plotTypes = generateSorensHinted(W, H, seaLevelChange, climateConfig, rng);
        break;
      case 'solid_andy':
        plotTypes = generateAndysHinted(W, H, seaLevelChange, climateConfig, rng);
        break;
    }
    applyCohesionRepair(plotTypes, null, W, H, this._pangaeaType,
                         seaLevelChange, climateConfig, rng, shiftInfo);
    return plotTypes;
  },

  generateTerrain(W, H, plotTypes, settings, rng) {
    const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false, mapSize: settings.mapSize });
    return tg.generateTerrain(rng, plotTypes);
  },

  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) {
    return assignStartsPangaea(
      settings.numPlayers, plotTypes, terrain, features, bonuses,
      rivers, lakes, W, H, rng
    );
  }
};

/**
 * Wrapper around generateMultilayered that also returns shift info for cohesion repair.
 */
function generateMultilayeredWithShiftInfo(W, H, typeIndex, seaLevelChange, climateConfig, worldSize, rng) {
  const sea = clamp(seaLevelChange, -5, 5);
  const grain = getPangaeaGrain(worldSize);

  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: sea,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: true, wrapY: false
  });

  const iFlags = FRAC_WRAP_X | FRAC_POLAR;

  let mainWestLon = 0.2;
  let mainEastLon = 0.8;
  let mainSouthLat = 0.2;
  let mainNorthLat = 0.8;
  let subcontinentDimension = 0.4;
  let numSubcontinents;
  let bSouthwardShift = false;
  let scValues;
  let shiftedNorth = false;

  if (typeIndex === 0) {
    // TYPE 0: NATURAL
    subcontinentDimension = 0.3;

    if (rng.next() < 0.5) {
      mainNorthLat += 0.075;
      mainSouthLat += 0.075;
      shiftedNorth = true;
    } else {
      mainNorthLat -= 0.075;
      mainSouthLat -= 0.075;
      bSouthwardShift = true;
    }

    numSubcontinents = 4 + rng.nextInt(0, 2);
    scValues = TYPE0_SLOTS;
  } else if (typeIndex === 1) {
    // TYPE 1: PRESSED EQUATORIAL
    let equRoll = rng.nextInt(0, 3);
    if (equRoll === 3) equRoll = 1;
    numSubcontinents = 2 + equRoll;
    scValues = TYPE1_SLOTS;
  } else {
    // TYPE 2: PRESSED POLAR
    numSubcontinents = 3;

    if (rng.next() < 0.5) {
      mainSouthLat += 0.175;
      mainNorthLat += 0.175;
      shiftedNorth = true;
      bSouthwardShift = false;
      scValues = TYPE2_SLOTS_NORTH;
    } else {
      mainSouthLat -= 0.175;
      mainNorthLat -= 0.175;
      bSouthwardShift = true;
      scValues = TYPE2_SLOTS_SOUTH;
    }
  }

  const mainWestX  = Math.floor(mainWestLon * W);
  const mainEastX  = Math.floor(mainEastLon * W);
  const mainSouthY = Math.floor(mainSouthLat * H);
  const mainNorthY = Math.floor(mainNorthLat * H);
  const mainWidth  = mainEastX - mainWestX + 1;
  const mainHeight = mainNorthY - mainSouthY + 1;

  // PASS 1: Main landmass
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 55 + sea,
    iRegionWidth: mainWidth,
    iRegionHeight: mainHeight,
    iRegionWestX: mainWestX,
    iRegionSouthY: mainSouthY,
    iRegionGrain: 2,
    iRegionHillsGrain: grain,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: 2,
    has_center_rift: false,
    invert_heights: false
  });

  // PASS 2: Cohesion fill (exact Civ4 dimensions)
  const second_layerHeight = Math.floor(mainHeight / 2);
  const second_layerWestX = mainWestX + Math.floor(mainWidth / 10);
  const second_layerEastX = mainEastX - Math.floor(mainWidth / 10);
  const second_layerWidth = second_layerEastX - second_layerWestX + 1;
  const second_layerSouthY = mainSouthY + Math.floor(mainHeight / 4);

  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 60 + sea,
    iRegionWidth: second_layerWidth,
    iRegionHeight: second_layerHeight,
    iRegionWestX: second_layerWestX,
    iRegionSouthY: second_layerSouthY,
    iRegionGrain: 1,
    iRegionHillsGrain: grain,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: -1,
    has_center_rift: false,
    invert_heights: false
  });

  // SUBCONTINENTS
  addSubcontinents(mlf, rng, numSubcontinents, subcontinentDimension,
                    W, H, sea, grain, typeIndex, bSouthwardShift, scValues);

  // Extract 1D plot array
  const plotTypes1D = new Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      plotTypes1D[y * W + x] = mlf.getPlotType(x, y);
    }
  }

  // Build shift info for cohesion repair
  const typeNames = ['natural', 'pressed_equatorial', 'pressed_polar'];
  const shiftInfo = {
    type: typeNames[typeIndex],
    shiftedNorth
  };

  return { plotTypes: plotTypes1D, shiftInfo };
}
