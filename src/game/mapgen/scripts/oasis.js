/**
 * Oasis Map Script — Port of Civ4 BTS Oasis.py
 * by Bob Thomas (Sirian).
 *
 * Desert world between two fertile bands. Unique properties:
 * - No wrapping in either axis
 * - Latitude range [0, 40]
 * - No climate/sea level options
 * - Starts as all-land with water layered on top
 * - Custom 4-band terrain
 * - Nile-style rivers (4 rivers, one per quadrant, flowing north)
 * - Regional bonus placement
 * - All normalizations disabled
 */

import { CyFractal } from '../CyFractal.js';
import { PLOT } from '../FractalWorld.js';
import { MultilayeredFractal } from '../MultilayeredFractal.js';
import { TerrainGenerator, TERRAIN } from '../TerrainGenerator.js';
import { FeatureGenerator } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import { GoodyGenerator } from '../GoodyGenerator.js';
import {
  getDefaultDimensions,
  buildMapResult
} from './_helpers.js';

// ============================================================================
// Plot Generation — All-Land Base + Water Overlay
// ============================================================================

function generateOasisPlots(W, H, rng) {
  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: 0,
    hillGroupOneRange: 9,
    hillGroupTwoRange: 9,
    peakPercent: 4,
    wrapX: false, wrapY: false
  });

  // Initialize all plots as LAND
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      mlf.setPlotType(x, y, PLOT.LAND);
    }
  }

  // Force ocean at top rows (northern coast)
  const oceanRows = Math.max(2, Math.floor(H * 0.08));
  for (let y = H - oceanRows; y < H; y++) {
    for (let x = 0; x < W; x++) {
      mlf.setPlotType(x, y, PLOT.OCEAN);
    }
  }

  // Fractalize the northern coastline (partial water overlay)
  const coastRegionH = Math.floor(H * 0.25);
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 65,
    iRegionWidth: W,
    iRegionHeight: coastRegionH,
    iRegionWestX: 0,
    iRegionSouthY: H - coastRegionH,
    iRegionGrain: 2,
    iRegionHillsGrain: 3,
    iRegionPlotFlags: 0,
    iRegionTerrainFlags: 0,
    bShift: false,
    rift_grain: -1
  });

  // Force land in southern portion (fertile band)
  const landRows = Math.floor(H * 0.15);
  for (let y = 0; y < landRows; y++) {
    for (let x = 0; x < W; x++) {
      if (mlf.getPlotType(x, y) === PLOT.OCEAN) {
        mlf.setPlotType(x, y, PLOT.LAND);
      }
    }
  }

  // Add hills using separate fractal
  const iFlags = 0;
  const hillsFrac = new CyFractal();
  hillsFrac.fracInit(W, H, 3, rng, iFlags);
  const peaksFrac = new CyFractal();
  peaksFrac.fracInit(W, H, 4, rng, iFlags);

  const hillsBottom1 = hillsFrac.getHeightFromPercent(20);
  const hillsTop1 = hillsFrac.getHeightFromPercent(30);
  const hillsBottom2 = hillsFrac.getHeightFromPercent(70);
  const hillsTop2 = hillsFrac.getHeightFromPercent(80);
  const peakThreshold = peaksFrac.getHeightFromPercent(25);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (mlf.getPlotType(x, y) !== PLOT.LAND) continue;

      const hv = hillsFrac.getHeight(x, y);
      if ((hv >= hillsBottom1 && hv <= hillsTop1) ||
          (hv >= hillsBottom2 && hv <= hillsTop2)) {
        const pv = peaksFrac.getHeight(x, y);
        if (pv <= peakThreshold) {
          mlf.setPlotType(x, y, PLOT.PEAK);
        } else {
          mlf.setPlotType(x, y, PLOT.HILLS);
        }
      }
    }
  }

  // Extract 1D
  const plotTypes1D = new Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      plotTypes1D[y * W + x] = mlf.getPlotType(x, y);
    }
  }
  return plotTypes1D;
}

// ============================================================================
// Custom Terrain Generator — 4-Band System
// ============================================================================

class OasisTerrainGenerator extends TerrainGenerator {
  constructor(W, H) {
    super(W, H, {
      iDesertPercent: 32,
      iPlainsPercent: 18,
      wrapX: false, wrapY: false
    });
    this.iOasisGrassPercent = 9;
    this.iOasisPlainsPercent = 16;
    this.iOasisTopLatitude = 0.69;
    this.iOasisBottomLatitude = 0.30;
  }

  // Civ4 Oasis: lat = iY / float(self.iHeight) + variation jitter
  // Linear 0.0 (south) to 1.0 (north), NOT the standard H/2 pole-equator-pole
  getLatitudeAtPlot(x, y) {
    let lat = y / this.iNumPlotsY;
    lat += (128 - this.variationFrac.getHeight(x, y)) / (255.0 * 5.0);
    if (lat < 0) lat = 0.0;
    if (lat > 1) lat = 1.0;
    return lat;
  }

  generateTerrain(rng, plotTypes) {
    this._rng = rng;
    return super.generateTerrain(rng, plotTypes);
  }

  generateTerrainAtPlot(x, y, plotType) {
    if (plotType === PLOT.OCEAN) return TERRAIN.OCEAN;
    if (plotType === PLOT.COAST) return TERRAIN.COAST;

    const lat = this.getLatitudeAtPlot(x, y);

    // Band 1: Northern fertile (> 0.69)
    if (lat > this.iOasisTopLatitude) {
      const plainsVal = this.plainsFrac.getHeight(x, y);
      const plainsThreshold = this.plainsFrac.getHeightFromPercent(50);
      return plainsVal >= plainsThreshold ? TERRAIN.PLAINS : TERRAIN.GRASSLAND;
    }

    // Band 2: Jungle zone (< 0.14)
    if (lat < 0.14) {
      return TERRAIN.GRASSLAND;
    }

    // Band 3: Southern fertile (0.14 - 0.30)
    if (lat < this.iOasisBottomLatitude) {
      const roll = this._rng.next();
      if (roll < 0.50) return TERRAIN.GRASSLAND;
      if (roll < 0.85) return TERRAIN.PLAINS;
      return TERRAIN.DESERT;
    }

    // Band 4: Oasis/desert zone (0.30 - 0.69)
    const roll = this._rng.next();
    if (roll < this.iOasisGrassPercent / 100) return TERRAIN.GRASSLAND;
    if (roll < (this.iOasisGrassPercent + this.iOasisPlainsPercent) / 100) return TERRAIN.PLAINS;
    return TERRAIN.DESERT;
  }
}

// ============================================================================
// Custom Feature Generator — Linear Latitude (south→north)
// ============================================================================

class OasisFeatureGenerator extends FeatureGenerator {
  // Civ4 Oasis: lat = iY / float(self.iGridH)
  // Linear 0.0 (south) to 1.0 (north), no fractal jitter
  getLatitudeAtPlot(_x, y) {
    return Math.max(0.0, Math.min(1.0, y / this.iNumPlotsY));
  }
}

// ============================================================================
// Nile-Style Rivers
// ============================================================================

function addNileRivers(rng, plotTypes1D, terrain1D, W, H, mapSize) {
  const rivers1D = new Array(W * H).fill(null).map(() => ({
    isNOfRiver: false, isWOfRiver: false,
    riverNSDirection: null, riverWEDirection: null
  }));

  // Max lateral shift per step (by world size)
  const maxShiftTable = {
    duel: 1, tiny: 2, small: 3, standard: 5, large: 7, huge: 9
  };
  const maxShift = maxShiftTable[mapSize] || 5;

  // 4 rivers, one per quadrant
  const quadrants = [
    { startX: Math.floor(W * 0.25), startY: 0 },
    { startX: Math.floor(W * 0.75), startY: 0 },
    { startX: Math.floor(W * 0.25), startY: Math.floor(H * 0.5) },
    { startX: Math.floor(W * 0.75), startY: Math.floor(H * 0.5) }
  ];

  for (const { startX, startY } of quadrants) {
    let x = startX;
    let y = startY;

    // Flow north (increasing y) with lateral drift
    while (y < H - 1) {
      const idx = y * W + x;

      // Direction: 60% north, 20% west, 20% east
      const roll = rng.next();

      if (roll < 0.60) {
        // North: place river on north edge
        rivers1D[idx].isNOfRiver = true;
        rivers1D[idx].riverNSDirection = rng.next() < 0.5 ? 'E' : 'W';
        y++;
      } else if (roll < 0.80) {
        // West
        if (x - 1 >= 0) {
          rivers1D[idx].isWOfRiver = true;
          rivers1D[idx].riverWEDirection = 'N';
          x--;
        } else {
          rivers1D[idx].isNOfRiver = true;
          rivers1D[idx].riverNSDirection = 'W';
          y++;
        }
      } else {
        // East
        if (x + 1 < W) {
          const eidx = y * W + (x + 1);
          rivers1D[eidx].isWOfRiver = true;
          rivers1D[eidx].riverWEDirection = 'N';
          x++;
        } else {
          rivers1D[idx].isNOfRiver = true;
          rivers1D[idx].riverNSDirection = 'E';
          y++;
        }
      }

      // Clamp lateral drift
      if (Math.abs(x - startX) > maxShift) {
        x = startX + (x > startX ? maxShift : -maxShift);
      }

      // Stop at water
      if (y < H && (plotTypes1D[y * W + x] === PLOT.OCEAN ||
                     plotTypes1D[y * W + x] === PLOT.COAST)) {
        break;
      }
    }
  }

  return rivers1D;
}

// ============================================================================
// Oasis Script Export
// ============================================================================

export default {
  id: 'oasis',
  name: 'Oasis',
  description: 'Desert map with a central river and oasis region.',
  isAdvancedMap: true,
  getWrapX()  { return false; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 40; },
  getBottomLatitude() { return 0; },
  isClimateMap()  { return false; },
  isSeaLevelMap() { return false; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return -35; },
  customOptions: [],

  getGridSize() { return null; },

  generate(settings, rng) {
    const { mapSize, numPlayers } = settings;

    const { width: W, height: H } = getDefaultDimensions(mapSize);

    // Generate plot types
    const plotTypes1D = generateOasisPlots(W, H, rng);

    // Coast tiles
    TerrainGenerator.addCoastTiles(plotTypes1D, W, H, false, false);

    // Custom 4-band terrain
    const tg = new OasisTerrainGenerator(W, H);
    const terrain1D = tg.generateTerrain(rng, plotTypes1D);

    // Nile-style rivers
    const rivers1D = addNileRivers(rng, plotTypes1D, terrain1D, W, H, mapSize);

    // Lakes
    const riverGen = new RiverGenerator(W, H, { wrapX: false, wrapY: false });
    const lakes1D = riverGen.addLakes(plotTypes1D);

    // Features (Civ4 Oasis: linear latitude 0→1 south→north)
    const fg = new OasisFeatureGenerator(W, H, {
      jungleLatitude: 0.15,
      wrapX: false, wrapY: false
    });
    const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

    // Bonuses
    const bg = new BonusGenerator(W, H, {
      numPlayers, wrapX: false, wrapY: false,
      topLatitude: 40, bottomLatitude: 0
    });
    const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

    // Starting plots — all normalizations disabled
    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: -35,
      skipNormalization: true,
      wrapX: false, wrapY: false
    });
    const starts = sp.assignStartingPlots(
      numPlayers, rng, plotTypes1D, terrain1D, features1D, bonuses1D, rivers1D, lakes1D
    );

    // Goody huts
    const gg = new GoodyGenerator(W, H, { wrapX: false, wrapY: false });
    const goodies1D = gg.addGoodies(rng, plotTypes1D, terrain1D, features1D, bonuses1D, starts);

    return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                          bonuses1D, rivers1D, lakes1D, starts, goodies1D);
  }
};
