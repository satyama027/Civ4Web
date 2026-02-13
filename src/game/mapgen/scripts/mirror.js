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
import { GoodyGenerator } from '../GoodyGenerator.js';
import {
  getDefaultDimensions,
  resolveClimateSettings,
  buildMapResult
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

  // Legacy single-option support
  customOption: {
    name: 'Mirror Type',
    values: ['Reflection', 'Inversion', 'Copy', 'Opposite'],
    default: 0
  },

  getGridSize() { return null; },

  generate(settings, rng) {
    const { mapSize, climate, numPlayers } = settings;
    const climateConfig = resolveClimateSettings(climate);

    const { width: W, height: H } = getDefaultDimensions(mapSize);

    const mirrorTypeIndex = settings.customOption != null ? settings.customOption : 0;
    const mirrorNames = ['reflection', 'inversion', 'copy', 'opposite'];
    const mirrorType = mirrorNames[mirrorTypeIndex] || 'reflection';
    const transform = MIRROR_TRANSFORMS[mirrorType];

    const landmass = resolveMirrorLandmass(rng);

    // ── STAGE 1: Generate plot types (half map) ──
    const fw = new FractalWorld(W, H, {
      seaLevelChange: 0,
      hillGroupOneRange: climateConfig.hillRange,
      hillGroupTwoRange: climateConfig.hillRange,
      peakPercent: climateConfig.peakPercent,
      wrapX: false, wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: landmass.grain,
      rift_grain: landmass.rift,
      has_center_rift: landmass.rift >= 0,
      invert_heights: landmass.water <= 15,
      polar: true
    });

    const plotTypes1D = fw.generatePlotTypes(rng, {
      water_percent: landmass.water,
      grain_amount: 3,
      shift_plot_types: false
    });

    // Mirror plot types
    mirrorArray(plotTypes1D, W, H, transform);

    // Coast tiles
    TerrainGenerator.addCoastTiles(plotTypes1D, W, H, false, false);

    // ── STAGE 2: Generate terrain + mirror ──
    const tg = new TerrainGenerator(W, H, { wrapX: false, wrapY: false });
    const terrain1D = tg.generateTerrain(rng, plotTypes1D);
    mirrorArray(terrain1D, W, H, transform);

    // ── STAGE 3: Rivers + mirror with direction corrections ──
    const riverGen = new RiverGenerator(W, H, { wrapX: false, wrapY: false });
    const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
    mirrorRivers(rivers1D, W, H, transform, mirrorType);

    // ── STAGE 4: Lakes + mirror ──
    const lakes1D = riverGen.addLakes(plotTypes1D);
    mirrorArray(lakes1D, W, H, transform);

    // ── STAGE 5: Features + mirror ──
    const fg = new FeatureGenerator(W, H, {
      jungleLatitude: climateConfig.jungleLatitude,
      wrapX: false, wrapY: false
    });
    const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);
    mirrorArray(features1D, W, H, transform);

    // ── STAGE 6: Bonuses + mirror ──
    const bg = new BonusGenerator(W, H, {
      numPlayers, wrapX: false, wrapY: false
    });
    const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);
    mirrorArray(bonuses1D, W, H, transform);

    // ── STAGE 7: Starting plots — mirrored positions ──
    const starts = assignStartsMirror(numPlayers, plotTypes1D, terrain1D,
                                       features1D, bonuses1D, rivers1D, lakes1D,
                                       W, H, transform, rng);

    // NO normalization (preserves symmetry)

    // Goody huts
    const gg = new GoodyGenerator(W, H, { wrapX: false, wrapY: false });
    const goodies1D = gg.addGoodies(rng, plotTypes1D, terrain1D, features1D, bonuses1D, starts);

    return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                          bonuses1D, rivers1D, lakes1D, starts, goodies1D);
  }
};
