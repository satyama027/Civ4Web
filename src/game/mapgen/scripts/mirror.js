/**
 * Mirror Map Script — Port of Civ4 BTS Mirror.py
 * by Bob Thomas (Sirian).
 *
 * Generates half a map, then mirrors it for symmetrical play.
 * Four mirror types: Reflection, Inversion, Copy, Opposite.
 * Multi-stage mirroring pipeline with river direction corrections.
 * All normalizations disabled to preserve symmetry.
 */

import { FractalWorld, PLOT } from '../FractalWorld.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import { FeatureGenerator } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import {
  resolveClimateSettings
} from './_helpers.js';

// ============================================================================
// Mirror Transform Functions
// ============================================================================

const MIRROR_TRANSFORMS = {
  reflection: (x, y, W, _H) => ({ x: W - x - 1, y }),
  inversion:  (x, y, W, H) => ({ x: W - x - 1, y: H - y - 1 }),
  copy:       (x, y, W, _H) => ({ x: (x + Math.floor(W / 2)) % W, y }),
  opposite:   (x, y, W, H) => ({ x: (x + Math.floor(W / 2)) % W, y: H - y - 1 })
};

// ============================================================================
// Landmass Type Resolution
// ============================================================================

function resolveMirrorLandmass(rng) {
  const roll = rng.nextInt(0, 5);
  switch (roll) {
    case 0: return { water: 8, grain: 1, rift: -1 };
    case 1: return { water: 65, grain: 2, rift: 2 };
    case 2: return { water: 70, grain: 3, rift: -1 };
    case 3: return { water: 75, grain: 4, rift: -1 };
    case 4: return { water: 80, grain: 5, rift: -1 };
    default: return { water: 70, grain: 3, rift: -1 };
  }
}

// ============================================================================
// Mirror Array — Copy Source Half to Mirror Half
// ============================================================================

function mirrorArray(arr, W, H, transform) {
  const halfW = Math.floor(W / 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < halfW; x++) {
      const srcIdx = y * W + x;
      const { x: mx, y: my } = transform(x, y, W, H);
      if (mx >= 0 && mx < W && my >= 0 && my < H) {
        const dstIdx = my * W + mx;
        arr[dstIdx] = arr[srcIdx];
      }
    }
  }
}

// ============================================================================
// Mirror Rivers — Copy with Direction Corrections
// ============================================================================

function reverseEW(dir) {
  if (dir === 'E') return 'W';
  if (dir === 'W') return 'E';
  return dir;
}

function reverseNS(dir) {
  if (dir === 'N') return 'S';
  if (dir === 'S') return 'N';
  return dir;
}

function mirrorRivers(rivers1D, W, H, transform, mirrorType) {
  const halfW = Math.floor(W / 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < halfW; x++) {
      const srcIdx = y * W + x;
      const src = rivers1D[srcIdx];
      const { x: mx, y: my } = transform(x, y, W, H);
      if (mx < 0 || mx >= W || my < 0 || my >= H) continue;
      const dstIdx = my * W + mx;

      // Copy river edges
      rivers1D[dstIdx].isNOfRiver = src.isNOfRiver;
      rivers1D[dstIdx].isWOfRiver = src.isWOfRiver;

      // Correct flow directions based on mirror type
      switch (mirrorType) {
        case 'reflection':
          rivers1D[dstIdx].riverNSDirection = reverseEW(src.riverNSDirection);
          rivers1D[dstIdx].riverWEDirection = src.riverWEDirection;
          break;

        case 'inversion':
          rivers1D[dstIdx].riverNSDirection = reverseEW(src.riverNSDirection);
          rivers1D[dstIdx].riverWEDirection = reverseNS(src.riverWEDirection);
          break;

        case 'copy':
          rivers1D[dstIdx].riverNSDirection = src.riverNSDirection;
          rivers1D[dstIdx].riverWEDirection = src.riverWEDirection;
          break;

        case 'opposite':
          rivers1D[dstIdx].riverNSDirection = src.riverNSDirection;
          rivers1D[dstIdx].riverWEDirection = reverseNS(src.riverWEDirection);
          break;
      }
    }
  }
}

// ============================================================================
// Starting Plots — Mirrored Positions
// ============================================================================

function assignStartsMirror(numPlayers, plotTypes1D, terrain1D, features1D,
                             bonuses1D, rivers1D, lakes1D,
                             W, H, transform, _rng) {
  const halfPlayers = Math.ceil(numPlayers / 2);

  // Constrain first half to left portion of map
  const maxX = numPlayers <= 2
    ? Math.floor(W * 0.20)
    : Math.floor(W * 0.40);

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: -65,
    wrapX: false, wrapY: false
  });

  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < maxX; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  // Place source-side players
  const sourceStarts = [];
  const baseRange = sp._startingPlotRange(halfPlayers);
  let minDist = baseRange;

  for (let pass = 0; pass < 50 && sourceStarts.length < halfPlayers; pass++) {
    for (const c of candidates) {
      if (sourceStarts.length >= halfPlayers) break;
      if (sourceStarts.some(s => s.x === c.x && s.y === c.y)) continue;
      let ok = true;
      for (const s of sourceStarts) {
        if (Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2) < minDist) {
          ok = false; break;
        }
      }
      if (ok) sourceStarts.push({ x: c.x, y: c.y });
    }
    minDist = Math.max(1, minDist - 1);
  }

  // Build full starts: source players + mirrored positions
  const starts = [];
  for (let i = 0; i < sourceStarts.length; i++) {
    starts.push(sourceStarts[i]);

    if (starts.length < numPlayers) {
      const { x: mx, y: my } = transform(sourceStarts[i].x, sourceStarts[i].y, W, H);
      starts.push({ x: mx, y: my });
    }
  }

  return starts.slice(0, numPlayers);
}

// ============================================================================
// Mirror Script Export
// ============================================================================

export default {
  id: 'mirror',
  name: 'Mirror',
  description: 'Symmetrical map mirrored across one or two axes.',
  isAdvancedMap: true,
  getWrapX()  { return false; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return false; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return -65; },

  customOptions: [
    {
      id: 'mirror_type',
      name: 'Mirror Type',
      values: [
        { id: 'reflection', label: 'Reflection' },
        { id: 'inversion', label: 'Inversion' },
        { id: 'copy', label: 'Copy' },
        { id: 'opposite', label: 'Opposite' }
      ],
      default: 0,
      allowRandom: true
    }
  ],

  getGridSize(worldSize) {
    // Mirror.py: "Because this is such a land-heavy map, make the map smaller"
    // Uses the same grid scale as Lakes.py and Inland_Sea.py: (6,4)→(21,13) × 4
    const table = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [13, 8],
      large:    [16, 10],
      huge:     [21, 13]
    };
    const grid = table[worldSize] ?? table.standard;
    return { width: grid[0] * 4, height: grid[1] * 4 };
  },

  beforeInit(settings, rng) {
    const mirrorTypeIndex = settings.customOption != null ? settings.customOption : 0;
    const mirrorNames = ['reflection', 'inversion', 'copy', 'opposite'];
    this._mirrorType = mirrorNames[mirrorTypeIndex] || 'reflection';
    this._transform = MIRROR_TRANSFORMS[this._mirrorType];
    this._landmass = resolveMirrorLandmass(rng);
    this._climateConfig = resolveClimateSettings(settings.climate);
    this._mapSize = settings.mapSize;
    this._numPlayers = settings.numPlayers;
  },

  generateRandomMap(W, H, settings, rng) {
    const fw = new FractalWorld(W, H, {
      seaLevelChange: 0,
      hillGroupOneRange: this._climateConfig.iHillRange,
      hillGroupTwoRange: this._climateConfig.iHillRange,
      peakPercent: this._climateConfig.iPeakPercent,
      wrapX: false, wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: this._landmass.grain,
      rift_grain: this._landmass.rift,
      has_center_rift: this._landmass.rift >= 0,
      invert_heights: this._landmass.water <= 15,
      polar: true
    });

    const plotTypes = fw.generatePlotTypes(rng, {
      water_percent: this._landmass.water,
      grain_amount: 3,
      shift_plot_types: false
    });
    mirrorArray(plotTypes, W, H, this._transform);

    const tg = new TerrainGenerator(W, H, { wrapX: false, wrapY: false, mapSize: this._mapSize });
    const terrain = tg.generateTerrain(rng, plotTypes);
    mirrorArray(terrain, W, H, this._transform);

    return { plotTypes, terrain };
  },

  addRivers(W, H, plotTypes, terrain, rng, callbacks) {
    const riverGen = new RiverGenerator(W, H, { wrapX: false, wrapY: false });
    const rivers = riverGen.addRivers(rng, plotTypes, terrain);
    mirrorRivers(rivers, W, H, this._transform, this._mirrorType);
    return rivers;
  },

  addLakes(W, H, plotTypes, rng) {
    const riverGen = new RiverGenerator(W, H, { wrapX: false, wrapY: false });
    const lakes = riverGen.addLakes(plotTypes);
    mirrorArray(lakes, W, H, this._transform);
    return lakes;
  },

  addFeatures(W, H, plotTypes, terrain, rivers, settings, rng) {
    const fg = new FeatureGenerator(W, H, {
      jungleLatitude: this._climateConfig.iJungleLatitude,
      randIceLatitude: this._climateConfig.fRandIceLatitude,
      mapSize: this._mapSize,
      wrapX: false, wrapY: false
    });
    const features = fg.generateFeatures(rng, plotTypes, terrain, rivers);
    mirrorArray(features, W, H, this._transform);
    return features;
  },

  addBonuses(W, H, plotTypes, terrain, features, settings, rng, callbacks) {
    const bg = new BonusGenerator(W, H, {
      numPlayers: this._numPlayers, wrapX: false, wrapY: false
    });
    const bonuses = bg.addBonuses(rng, plotTypes, terrain, features);
    mirrorArray(bonuses, W, H, this._transform);
    return bonuses;
  },

  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) {
    return assignStartsMirror(settings.numPlayers, plotTypes, terrain,
                              features, bonuses, rivers, lakes,
                              W, H, this._transform, rng);
  },

  skipNormalization() { return true; }
};
