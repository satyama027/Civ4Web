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
import { FeatureGenerator, FEATURE } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';

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
  constructor(W, H, settings = {}) {
    super(W, H, {
      iDesertPercent: 32,
      iPlainsPercent: 18,
      wrapX: false, wrapY: false,
      mapSize: settings.mapSize
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

  generateTerrainAtPlot(x, y, plotType, existingTerrain) {
    if (plotType === PLOT.OCEAN) return existingTerrain;

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

  // D3 fix: override addFeaturesAtPlot to match Oasis.py's custom placement:
  //   - No ice (Oasis maps have no polar ice)
  //   - No generic XML features (Oasis.py override skips addGenericFeaturesAtPlot)
  //   - Jungle: south band only (lat < 0.16)
  //   - Forest: fertile bands only (lat < 0.30 or lat > 0.71), not in oasis zone
  //   - Oasis feature: 1/9 probability on flat desert in lat 0.30–0.71
  //     (original: mapRand.get(9, "Add Extra Oases PYTHON") == 0, Oasis.py line 572)
  addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;
    const lat = this.getLatitudeAtPlot(x, y);

    // Jungle: south band lat < 0.16 only
    if (features[idx] === FEATURE.NONE && lat < 0.16) {
      this.addJunglesAtPlot(x, y, lat, plotTypes, terrain, features);
    }

    // Forest: outside oasis zone (lat < 0.30 or lat > 0.71)
    if (features[idx] === FEATURE.NONE && (lat < 0.30 || lat > 0.71)) {
      this.addForestsAtPlot(x, y, lat, plotTypes, terrain, features);
    }

    // Oasis feature: flat desert in oasis zone, 1/9 probability
    if (features[idx] === FEATURE.NONE &&
        lat > 0.30 && lat < 0.71 &&
        plotTypes[idx] === PLOT.LAND &&
        terrain[idx] === TERRAIN.DESERT &&
        rng.nextInt(0, 8) === 0) {
      features[idx] = FEATURE.OASIS;
    }
  }
}

// ============================================================================
// Nile-Style Rivers
// ============================================================================

function addNileRivers(rng, plotTypes1D, _terrain1D, W, H, mapSize) {
  const rivers1D = new Array(W * H).fill(null).map(() => ({
    isNOfRiver: false, isWOfRiver: false,
    riverNSDirection: null, riverWEDirection: null
  }));

  // Max lateral shift / segment length by world size (Oasis.py lines 943-950)
  const maxShiftTable = {
    duel: 1, tiny: 2, small: 3, standard: 5, large: 7, huge: 9
  };
  const maxShift = maxShiftTable[mapSize] || 5;

  // 4 evenly-spaced quadrant centers (Oasis.py lines 951-956)
  const centers = [
    Math.floor(W / 8),
    Math.floor(W / 8 + W / 4),
    Math.floor(W / 8 + W / 2),
    Math.floor(W / 8 + 3 * W / 4)
  ];

  const startRangeBottom = 2;
  const startRangeTop = Math.max(startRangeBottom, Math.floor(H / 6));
  // D-River-5 fix: horzRand = 2*maxShift (not +1) → startX in [left, right-1]
  const horzRand = Math.max(1, 2 * maxShift);
  // D-River-6 fix: vertRand = top-bottom (not +1) → startY in [bottom, top-1]
  const vertRand = Math.max(1, startRangeTop - startRangeBottom);

  for (const center of centers) {
    const left  = center - maxShift;
    const right = center + maxShift;
    const startX = Math.max(0, Math.min(W - 1, left + rng.nextInt(0, horzRand - 1)));
    const startY = startRangeBottom + rng.nextInt(0, vertRand - 1);

    let x = startX;
    let y = startY;

    // D-River-3 fix: place initial north edge before the loop
    rivers1D[y * W + x].isWOfRiver = true;
    rivers1D[y * W + x].riverNSDirection = 'N';

    while (y < H) {
      // D-River-4 fix: check both north-of-x and north-of-(x+1) for water
      if (y + 1 >= H) break;
      if (plotTypes1D[(y + 1) * W + x] === PLOT.OCEAN ||
          (x + 1 < W && plotTypes1D[(y + 1) * W + (x + 1)] === PLOT.OCEAN)) break;

      // D-River-2 fix: segment-based movement (1..maxShift steps per roll)
      const segmentLength = 1 + rng.nextInt(0, maxShift - 1);
      // 60% north (roll 0,3,4), 20% west (roll 1), 20% east (roll 2)
      const roll = rng.nextInt(0, 4);

      if (roll === 1) {
        // WEST: move north first, then drift laterally, then resume north
        if (y >= H - 1) break;
        y++;
        for (let seg = 0; seg < segmentLength; seg++) {
          if (x <= left) break;
          // D-River-1 fix: isNOfRiver for lateral (horizontal) movement
          rivers1D[y * W + x].isNOfRiver = true;
          rivers1D[y * W + x].riverWEDirection = 'W';
          // D-River-4 fix: lateral water check
          if (x > 0 && plotTypes1D[y * W + (x - 1)] === PLOT.OCEAN) break;
          x--;
        }
        // Resume north from final position
        rivers1D[y * W + x].isWOfRiver = true;
        rivers1D[y * W + x].riverNSDirection = 'N';

      } else if (roll === 2) {
        // EAST: move north first, then drift laterally, then resume north
        if (y >= H - 1) break;
        if (x >= right) continue;  // already at east boundary — skip, re-roll
        y++;
        for (let seg = 0; seg < segmentLength; seg++) {
          if (x >= right) break;
          x++;
          // D-River-1 fix: isNOfRiver for lateral (horizontal) movement
          rivers1D[y * W + x].isNOfRiver = true;
          rivers1D[y * W + x].riverWEDirection = 'E';
          // D-River-4 fix: lateral water check
          if (x + 1 < W && plotTypes1D[y * W + (x + 1)] === PLOT.OCEAN) break;
        }
        // Check east water before resuming north
        if (x + 1 < W && plotTypes1D[y * W + (x + 1)] === PLOT.OCEAN) break;
        // Resume north from final position
        rivers1D[y * W + x].isWOfRiver = true;
        rivers1D[y * W + x].riverNSDirection = 'N';

      } else {
        // NORTH (roll 0, 3, 4): multi-step northward run
        for (let seg = 0; seg < segmentLength; seg++) {
          if (y >= H - 1) break;
          if (plotTypes1D[(y + 1) * W + x] === PLOT.OCEAN ||
              (x + 1 < W && plotTypes1D[(y + 1) * W + (x + 1)] === PLOT.OCEAN)) break;
          y++;
          // D-River-1 fix: isWOfRiver for north (vertical) movement
          rivers1D[y * W + x].isWOfRiver = true;
          rivers1D[y * W + x].riverNSDirection = 'N';
        }
      }

      // D-River-7 fix: clamp to center±maxShift (left..right), not startX-based
      if (x < left)  x = left;
      if (x > right) x = right;
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

  // Oasis.py grid sections (same convention as all other scripts) × 4 = tile dimensions.
  // Oasis.py lines 122-134: these are section counts, not raw tiles.
  // "Grid sizes reduced — smaller maps two steps, larger maps one and a half steps"
  getGridSize(mapSize) {
    const sections = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [14, 9],
      large:    [18, 11],
      huge:     [23, 14]
    };
    const [w, h] = sections[mapSize] ?? sections.standard;
    return { width: w * 4, height: h * 4 };
  },

  beforeInit(settings) {
    this._mapSize = settings.mapSize;
  },

  generatePlotTypes(W, H, settings, rng) {
    return generateOasisPlots(W, H, rng);
  },

  generateTerrain(W, H, plotTypes, settings, rng) {
    const tg = new OasisTerrainGenerator(W, H, { mapSize: settings.mapSize });
    return tg.generateTerrain(rng, plotTypes);
  },

  addRivers(W, H, plotTypes, terrain, rng, callbacks) {
    return addNileRivers(rng, plotTypes, terrain, W, H, this._mapSize);
  },

  addFeatures(W, H, plotTypes, terrain, rivers, settings, rng) {
    const fg = new OasisFeatureGenerator(W, H, {
      jungleLatitude: 0.15,
      randIceLatitude: 0.30,
      wrapX: false, wrapY: false,
      mapSize: settings.mapSize
    });
    return fg.generateFeatures(rng, plotTypes, terrain, rivers);
  },

  addBonuses(W, H, plotTypes, terrain, features, settings, rng, callbacks) {
    const bg = new BonusGenerator(W, H, {
      numPlayers: settings.numPlayers, wrapX: false, wrapY: false,
      topLatitude: 40, bottomLatitude: 0
    });
    return bg.addBonuses(rng, plotTypes, terrain, features);
  },

  skipNormalization() { return true; }
};
