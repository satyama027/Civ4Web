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
import { FeatureGenerator } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import { GoodyGenerator } from '../GoodyGenerator.js';
import {
  resolveGridSize,
  resolveSeaLevelChange,
  resolveClimateSettings,
  findBiggestLandArea,
  buildMapResult
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
// Subcontinent Slot Tables
// ============================================================================

const TYPE0_SLOTS = [
  { lonCenter: 0.10, latCenter: 0.50, lonVar: 0.05, latVar: 0.15 },
  { lonCenter: 0.90, latCenter: 0.50, lonVar: 0.05, latVar: 0.15 },
  { lonCenter: 0.30, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.70, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.30, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.70, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.90, lonVar: 0.15, latVar: 0.03 },
  { lonCenter: 0.50, latCenter: 0.10, lonVar: 0.15, latVar: 0.03 }
];

const TYPE1_SLOTS = [
  { lonCenter: 0.07, latCenter: 0.50, lonVar: 0.03, latVar: 0.20 },
  { lonCenter: 0.93, latCenter: 0.50, lonVar: 0.03, latVar: 0.20 },
  { lonCenter: 0.50, latCenter: 0.88, lonVar: 0.20, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.12, lonVar: 0.20, latVar: 0.05 }
];

const TYPE2_SLOTS_SOUTH = [
  { lonCenter: 0.25, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.10, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.75, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 }
];

const TYPE2_SLOTS_NORTH = [
  { lonCenter: 0.25, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.90, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.75, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 }
];

// ============================================================================
// Subcontinent Placement
// ============================================================================

function addSubcontinents(mlf, rng, numSubcontinents, dimension,
                           _mainWestLon, _mainEastLon, _mainSouthLat, _mainNorthLat,
                           W, H, sea, archGrain, iFlags, typeIndex, bSouthwardShift) {
  let slots;
  if (typeIndex === 0) slots = TYPE0_SLOTS;
  else if (typeIndex === 1) slots = TYPE1_SLOTS;
  else slots = bSouthwardShift ? TYPE2_SLOTS_NORTH : TYPE2_SLOTS_SOUTH;

  const slotsCopy = [...slots];
  rng.shuffle(slotsCopy);

  for (let i = 0; i < numSubcontinents && i < slotsCopy.length; i++) {
    const slot = slotsCopy[i];

    const lonCenter = slot.lonCenter + (rng.next() - 0.5) * 2 * slot.lonVar;
    const latCenter = slot.latCenter + (rng.next() - 0.5) * 2 * slot.latVar;

    const regionW = Math.floor(dimension * W);
    const regionH = Math.floor(dimension * H);
    const westX = Math.floor(lonCenter * W) - Math.floor(regionW / 2);
    const southY = Math.floor(latCenter * H) - Math.floor(regionH / 2);

    const shape = rng.nextInt(0, 4);

    if (shape > 1) {
      // 60% — Regular subcontinent
      mlf.generatePlotsInRegion(rng, {
        iWaterPercent: 55 + sea,
        iRegionWidth: regionW,
        iRegionHeight: regionH,
        iRegionWestX: ((westX % W) + W) % W,
        iRegionSouthY: clamp(southY, 0, H - regionH),
        iRegionGrain: 1,
        iRegionHillsGrain: 3,
        iRegionPlotFlags: iFlags,
        iRegionTerrainFlags: iFlags,
        bShift: false,
        iStrip: 15,
        rift_grain: -1,
        has_center_rift: false,
        invert_heights: false
      });
    } else if (shape === 1) {
      // 20% — Irregular subcontinent
      mlf.generatePlotsInRegion(rng, {
        iWaterPercent: 66 + sea,
        iRegionWidth: regionW,
        iRegionHeight: regionH,
        iRegionWestX: ((westX % W) + W) % W,
        iRegionSouthY: clamp(southY, 0, H - regionH),
        iRegionGrain: 2,
        iRegionHillsGrain: 3,
        iRegionPlotFlags: iFlags,
        iRegionTerrainFlags: iFlags,
        bShift: false,
        iStrip: 15,
        rift_grain: 2,
        has_center_rift: false,
        invert_heights: false
      });
    } else {
      // 20% — Archipelago appendage
      mlf.generatePlotsInRegion(rng, {
        iWaterPercent: 77 + sea,
        iRegionWidth: regionW,
        iRegionHeight: regionH,
        iRegionWestX: ((westX % W) + W) % W,
        iRegionSouthY: clamp(southY, 0, H - regionH),
        iRegionGrain: archGrain,
        iRegionHillsGrain: archGrain + 1,
        iRegionPlotFlags: iFlags,
        iRegionTerrainFlags: iFlags,
        bShift: false,
        iStrip: 15,
        rift_grain: -1,
        has_center_rift: false,
        invert_heights: false
      });
    }
  }
}

// ============================================================================
// Multilayered Pangaea Generation
// ============================================================================

function generateMultilayered(W, H, typeIndex, seaLevelChange, climateConfig, worldSize, rng) {
  const sea = clamp(seaLevelChange, -5, 5);
  const archGrain = getPangaeaGrain(worldSize);

  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: sea,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  const iFlags = FRAC_WRAP_X | FRAC_POLAR;

  let mainWestLon, mainEastLon, mainSouthLat, mainNorthLat;
  let subcontinentDimension, numSubcontinents;
  let bSouthwardShift = false;

  if (typeIndex === 0) {
    // TYPE 0: NATURAL
    mainWestLon = 0.2;
    mainEastLon = 0.8;
    mainSouthLat = 0.2;
    mainNorthLat = 0.8;
    subcontinentDimension = 0.3;
    numSubcontinents = 4 + rng.nextInt(0, 2);

    const shift = 0.075;
    if (rng.next() < 0.5) {
      mainSouthLat += shift;
      mainNorthLat += shift;
    } else {
      mainSouthLat -= shift;
      mainNorthLat -= shift;
    }
  } else if (typeIndex === 1) {
    // TYPE 1: PRESSED EQUATORIAL
    mainWestLon = 0.2;
    mainEastLon = 0.8;
    mainSouthLat = 0.2;
    mainNorthLat = 0.8;
    subcontinentDimension = 0.4;
    numSubcontinents = 2 + rng.nextInt(0, 3);
  } else {
    // TYPE 2: PRESSED POLAR
    mainWestLon = 0.2;
    mainEastLon = 0.8;
    mainSouthLat = 0.2;
    mainNorthLat = 0.8;
    subcontinentDimension = 0.4;
    numSubcontinents = 3;

    const shift = 0.175;
    if (rng.next() < 0.5) {
      mainSouthLat += shift;
      mainNorthLat += shift;
      bSouthwardShift = false;
    } else {
      mainSouthLat -= shift;
      mainNorthLat -= shift;
      bSouthwardShift = true;
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
    iRegionHillsGrain: 3,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: 2,
    has_center_rift: false,
    invert_heights: false
  });

  // PASS 2: Cohesion fill (inset 10% horiz, 25% vert)
  const cohInsetX = Math.floor(mainWidth * 0.10);
  const cohInsetY = Math.floor(mainHeight * 0.25);
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 60 + sea,
    iRegionWidth: mainWidth - 2 * cohInsetX,
    iRegionHeight: mainHeight - 2 * cohInsetY,
    iRegionWestX: mainWestX + cohInsetX,
    iRegionSouthY: mainSouthY + cohInsetY,
    iRegionGrain: 1,
    iRegionHillsGrain: 3,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    iStrip: 15,
    rift_grain: -1,
    has_center_rift: false,
    invert_heights: false
  });

  // SUBCONTINENTS
  addSubcontinents(mlf, rng, numSubcontinents, subcontinentDimension,
                    mainWestLon, mainEastLon, mainSouthLat, mainNorthLat,
                    W, H, sea, archGrain, iFlags, typeIndex, bSouthwardShift);

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
  const hw = new HintedWorld(W, H, 8, 4, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  // Set border cells to ocean (value 0)
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 4; by++) {
      if (bx === 0 || bx === 7 || by === 0 || by === 3) {
        hw.setValue(bx, by, 0);
      } else {
        hw.setValue(bx, by, 200 + rng.nextInt(0, 54));
      }
    }
  }

  // Add 4 random bays (low values in interior)
  const interiorCells = [];
  for (let bx = 1; bx <= 6; bx++) {
    for (let by = 1; by <= 2; by++) {
      interiorCells.push([bx, by]);
    }
  }
  rng.shuffle(interiorCells);

  for (let i = 0; i < Math.min(4, interiorCells.length); i++) {
    const [bx, by] = interiorCells[i];
    hw.setValue(bx, by, rng.nextInt(0, 47));
  }

  // 50% chance of extra bay on left or right side
  if (rng.next() < 0.5) {
    const side = rng.next() < 0.5 ? 0 : 7;
    const by = rng.nextInt(1, 2);
    hw.setValue(side, by, rng.nextInt(0, 47));
  }

  return hw.generatePlotTypes(rng, {
    water_percent: -1,
    shift_plot_types: false
  });
}

// ============================================================================
// Andy's Hinted Pangaea
// ============================================================================

function generateAndysHinted(W, H, seaLevelChange, climateConfig, rng) {
  const maxRetries = 3;

  for (let retry = 0; retry <= maxRetries; retry++) {
    const hw = new HintedWorld(W, H, 16, 8, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.hillRange,
      hillGroupTwoRange: climateConfig.hillRange,
      peakPercent: climateConfig.peakPercent,
      wrapX: true, wrapY: false
    });

    const numBlocks = 16 * 8;
    const numBlocksLand = Math.floor(numBlocks * 0.33);

    const cx = rng.nextInt(4, 11);
    const cy = rng.nextInt(2, 5);
    hw.addContinent(rng, numBlocksLand, cx, cy);
    hw.buildAllContinents(rng);

    // Cohesion check
    const landBlocks = hw.data.filter(v => v !== null && v >= 192).length;
    if (landBlocks > 0 && retry < maxRetries) {
      const blockAreas = countBlockAreas(hw);
      if (blockAreas.biggestSize / landBlocks < 0.90) {
        continue; // Retry
      }
    }

    return hw.generatePlotTypes(rng, {
      water_percent: -1,
      shift_plot_types: true
    });
  }

  // Should not reach here, but fallback
  const hw = new HintedWorld(W, H, 16, 8, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
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

/**
 * Count connected land areas in the block grid (BFS on blocks).
 */
function countBlockAreas(hw) {
  const w = hw.w;
  const h = hw.h;
  const visited = new Array(w * h).fill(false);
  const areaSizes = {};
  let nextId = 0;

  for (let by = 0; by < h; by++) {
    for (let bx = 0; bx < w; bx++) {
      const idx = by * w + bx;
      if (visited[idx]) continue;
      const val = hw.data[idx];
      if (val === null || val < 192) continue; // water or unassigned

      const areaId = nextId++;
      let size = 0;
      const queue = [{ x: bx, y: by }];
      visited[idx] = true;

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift();
        size++;
        for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
          let nx = cx + dx;
          let ny = cy + dy;
          if (hw.wrapX) nx = ((nx % w) + w) % w;
          else if (nx < 0 || nx >= w) continue;
          if (ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (visited[nIdx]) continue;
          const nVal = hw.data[nIdx];
          if (nVal === null || nVal < 192) continue;
          visited[nIdx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
      areaSizes[areaId] = size;
    }
  }

  let biggestSize = 0;
  for (const size of Object.values(areaSizes)) {
    if (size > biggestSize) biggestSize = size;
  }

  return { areaSizes, biggestSize };
}

// ============================================================================
// Cohesion Repair
// ============================================================================

function applyCohesionRepair(plotTypes1D, _terrain1D, W, H, pangaeaType,
                              _seaLevelChange, _climateConfig, rng) {
  const threshold = (pangaeaType === 'solid_soren' || pangaeaType === 'solid_andy')
    ? 0.90 : 0.80;

  let totalLand = 0;
  for (let i = 0; i < W * H; i++) {
    if (plotTypes1D[i] !== PLOT.OCEAN && plotTypes1D[i] !== PLOT.COAST) {
      totalLand++;
    }
  }
  if (totalLand === 0) return;

  const { areaSizes } = findBiggestLandArea(plotTypes1D, W, H, true);
  const biggestSize = Math.max(...Object.values(areaSizes));

  if (biggestSize / totalLand >= threshold) return;

  // Repair: fill center region with land
  const repairWestX = Math.floor(0.3 * W);
  const repairWidth = Math.floor(0.4 * W);
  const repairSouthY = Math.floor(0.3 * H);
  const repairHeight = Math.floor(0.4 * H);

  const repairFrac = new CyFractal();
  repairFrac.fracInit(repairWidth, repairHeight, 1, rng, FRAC_WRAP_X | FRAC_POLAR);

  const hillsFrac = new CyFractal();
  hillsFrac.fracInit(repairWidth, repairHeight, 3, rng, FRAC_WRAP_X | FRAC_POLAR);

  const peaksFrac = new CyFractal();
  peaksFrac.fracInit(repairWidth, repairHeight, 4, rng, FRAC_WRAP_X | FRAC_POLAR);

  const waterThreshold = repairFrac.getHeightFromPercent(40);
  const hillsBottom = hillsFrac.getHeightFromPercent(20);
  const hillsTop = hillsFrac.getHeightFromPercent(30);
  const hills2Bottom = hillsFrac.getHeightFromPercent(70);
  const hills2Top = hillsFrac.getHeightFromPercent(80);
  const peakThreshold = peaksFrac.getHeightFromPercent(25);

  for (let ry = 0; ry < repairHeight; ry++) {
    for (let rx = 0; rx < repairWidth; rx++) {
      const globalX = (repairWestX + rx) % W;
      const globalY = repairSouthY + ry;
      if (globalY >= H) continue;

      const globalIdx = globalY * W + globalX;

      if (plotTypes1D[globalIdx] !== PLOT.OCEAN && plotTypes1D[globalIdx] !== PLOT.COAST) {
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

  // Re-apply coast tiles after repair
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);
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

  // Legacy single-option support
  customOption: {
    name: 'Shoreline',
    values: ['Random', 'Natural', 'Pressed', 'Solid'],
    default: 0
  },

  getGridSize(worldSize) {
    return GRID_TABLE[worldSize] || GRID_TABLE.standard;
  },

  generate(settings, rng) {
    const { mapSize, climate, seaLevel, numPlayers } = settings;
    const climateConfig = resolveClimateSettings(climate);
    const seaLevelChange = resolveSeaLevelChange(seaLevel);

    const gridSize = this.getGridSize(mapSize);
    const { width: W, height: H } = resolveGridSize(mapSize, { [mapSize]: gridSize });

    const optionIndex = settings.customOption != null ? settings.customOption : 0;
    const pangaeaType = resolvePangaeaType(optionIndex, rng);

    // Generate plot types based on pangaea type
    let plotTypes1D;
    switch (pangaeaType) {
      case 'natural':
        plotTypes1D = generateMultilayered(W, H, 0, seaLevelChange, climateConfig, mapSize, rng);
        break;
      case 'pressed_equatorial':
        plotTypes1D = generateMultilayered(W, H, 1, seaLevelChange, climateConfig, mapSize, rng);
        break;
      case 'pressed_polar':
        plotTypes1D = generateMultilayered(W, H, 2, seaLevelChange, climateConfig, mapSize, rng);
        break;
      case 'solid_soren':
        plotTypes1D = generateSorensHinted(W, H, seaLevelChange, climateConfig, rng);
        break;
      case 'solid_andy':
        plotTypes1D = generateAndysHinted(W, H, seaLevelChange, climateConfig, rng);
        break;
    }

    // Add coast tiles
    TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

    // Terrain (default generator)
    const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false, mapSize });
    const terrain1D = tg.generateTerrain(rng, plotTypes1D);

    // Cohesion repair
    applyCohesionRepair(plotTypes1D, terrain1D, W, H, pangaeaType,
                         seaLevelChange, climateConfig, rng);

    // Rivers
    const riverGen = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
    const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
    const lakes1D = riverGen.addLakes(plotTypes1D);

    // Features (default generator)
    const fg = new FeatureGenerator(W, H, {
      jungleLatitude: climateConfig.jungleLatitude,
      randIceLatitude: climateConfig.randIceLatitude,
      mapSize,
      wrapX: true, wrapY: false
    });
    const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

    // Bonuses
    const bg = new BonusGenerator(W, H, {
      numPlayers, wrapX: true, wrapY: false
    });
    const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

    // Starting plots — biggest-area constraint
    const starts = assignStartsPangaea(
      numPlayers, plotTypes1D, terrain1D, features1D, bonuses1D,
      rivers1D, lakes1D, W, H, rng
    );

    // Normalize (all passes enabled)
    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: 0,
      wrapX: true, wrapY: false
    });
    sp.normalize(starts, plotTypes1D, terrain1D, features1D,
                 bonuses1D, rivers1D, lakes1D, rng);

    // Goody huts
    const gg = new GoodyGenerator(W, H, { wrapX: true, wrapY: false });
    const goodies1D = gg.addGoodies(rng, plotTypes1D, terrain1D, features1D, bonuses1D, starts);

    return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                          bonuses1D, rivers1D, lakes1D, starts, goodies1D);
  }
};
