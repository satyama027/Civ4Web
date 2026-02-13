/**
 * Archipelago Map Script — Port of Civ4 BTS Archipelago.py
 * by Bob Thomas (Sirian) and Soren Johnson.
 *
 * Island world with adjustable grain (Snaky → Tiny Islands), extra peaks
 * to counterbalance coastal peak removal, and a custom regional starting
 * plot system that ensures players are spread across different island groups.
 */

import { clamp } from '../utils.js';
import { FractalWorld, PLOT } from '../FractalWorld.js';
import { TERRAIN } from '../TerrainGenerator.js';
import { TerrainGenerator } from '../TerrainGenerator.js';
import { FeatureGenerator } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import { GoodyGenerator } from '../GoodyGenerator.js';
import {
  getDefaultDimensions,
  resolveSeaLevelChange,
  resolveClimateSettings,
  removeCoastalPeaks,
  scoreCitySite,
  buildMapResult
} from './_helpers.js';

// ============================================================================
// Region Count Tables
// ============================================================================

const REGION_COUNTS = {
  tinyIslands:  [0, 3, 3, 3, 6, 6, 8, 8, 12, 12, 12, 15, 15, 15, 20, 20, 20, 20, 24],
  archipelago:  [0, 3, 3, 6, 6, 8, 8, 12, 12, 15, 15, 15, 20, 20, 20, 24, 24, 24, 24],
  snaky:        [0, 3, 3, 6, 6, 8, 8, 12, 12, 15, 15, 15, 20, 20, 20, 24, 24, 24, 24]
};

const MIN_DISTANCES = {
  3:  [0.10, 0.20],
  6:  [0.10, 0.125],
  8:  [0.07, 0.125],
  12: [0.07, 0.10],
  15: [0.06, 0.10],
  20: [0.06, 0.06],
  24: [0.05, 0.05]
};

// ============================================================================
// Regional Starting Plot System
// ============================================================================

/**
 * Place region centers with minimum distance constraints.
 */
function placeRegions(numRegions, W, H, rng) {
  const [minLon, minLat] = MIN_DISTANCES[numRegions] || [0.05, 0.05];
  const minDistX = Math.floor(W * minLon);
  const minDistY = Math.floor(H * minLat);

  const regions = [];
  const maxAttempts = 1000;

  for (let r = 0; r < numRegions; r++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const cx = rng.nextInt(0, W - 1);
      const cy = rng.nextInt(0, H - 1);

      let valid = true;
      for (const existing of regions) {
        let dx = Math.abs(cx - existing.x);
        if (dx > W / 2) dx = W - dx; // wrap
        const dy = Math.abs(cy - existing.y);
        if (dx < minDistX && dy < minDistY) {
          valid = false;
          break;
        }
      }

      if (valid) {
        regions.push({ x: cx, y: cy });
        placed = true;
      }
    }

    // Relaxation: if placement fails, place randomly
    if (!placed) {
      regions.push({ x: rng.nextInt(0, W - 1), y: rng.nextInt(0, H - 1) });
    }
  }

  return regions;
}

/**
 * Score a region based on resources and land quality within a radius.
 */
function scoreRegion(cx, cy, radius, plotTypes1D, terrain1D, features1D,
                     bonuses1D, W, H, wrapX) {
  let score = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      const idx = ny * W + nx;
      const plot = plotTypes1D[idx];
      const terr = terrain1D[idx];

      if (plot === PLOT.OCEAN || plot === PLOT.COAST) {
        if (bonuses1D[idx]) score += 2;
        continue;
      }

      if (terr === TERRAIN.GRASSLAND) score += 2;
      else if (terr === TERRAIN.PLAINS) score += 1;
      if (plot === PLOT.HILLS) score += 1;
      if (bonuses1D[idx]) score += 2;
    }
  }
  return score;
}

/**
 * Find the best starting tile within a region radius.
 */
function findBestTileInRadius(cx, cy, radius, plotTypes1D, terrain1D,
                               features1D, bonuses1D, W, H, wrapX) {
  let bestScore = -Infinity;
  let bestTile = { x: cx, y: cy };

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      const idx = ny * W + nx;
      const plot = plotTypes1D[idx];
      if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) continue;

      const score = scoreCitySite(nx, ny, plotTypes1D, terrain1D,
                                   features1D, bonuses1D, W, H, wrapX);
      if (score > bestScore) {
        bestScore = score;
        bestTile = { x: nx, y: ny };
      }
    }
  }

  return bestTile;
}

/**
 * Assign starting plots using worst-region-first strategy.
 */
function assignStartsArchipelago(numPlayers, regions, plotTypes1D, terrain1D,
                                  features1D, bonuses1D, W, H, rng) {
  const radius = 5;
  const wrapX = true;

  // Score all regions
  const scored = regions.map((r, i) => ({
    ...r,
    index: i,
    score: scoreRegion(r.x, r.y, radius, plotTypes1D, terrain1D,
                       features1D, bonuses1D, W, H, wrapX)
  }));

  // Sort ascending (worst regions first)
  scored.sort((a, b) => a.score - b.score);

  // Shuffle players
  const playerOrder = Array.from({ length: numPlayers }, (_, i) => i);
  rng.shuffle(playerOrder);

  // Assign worst regions to players first (best pick within region)
  const starts = new Array(numPlayers);
  const usedRegions = new Set();

  for (let p = 0; p < numPlayers; p++) {
    let region = null;
    for (const r of scored) {
      if (!usedRegions.has(r.index)) {
        region = r;
        usedRegions.add(r.index);
        break;
      }
    }

    if (!region) {
      // More players than regions: reuse regions
      region = scored[p % scored.length];
    }

    const best = findBestTileInRadius(region.x, region.y, radius,
                                       plotTypes1D, terrain1D, features1D,
                                       bonuses1D, W, H, wrapX);
    starts[playerOrder[p]] = best;
  }

  return starts;
}

// ============================================================================
// Archipelago Script Export
// ============================================================================

export default {
  id: 'archipelago',
  name: 'Archipelago',
  description: 'Many small and medium islands spread across the ocean.',
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
      id: 'landmass_type',
      name: 'Landmass Type',
      values: [
        { id: 'snaky', label: 'Snaky Continents' },
        { id: 'archipelago', label: 'Archipelago' },
        { id: 'tiny_islands', label: 'Tiny Islands' }
      ],
      default: 1,
      allowRandom: true
    }
  ],

  // Legacy single-option support
  customOption: {
    name: 'Landmass Type',
    values: ['Snaky Continents', 'Archipelago', 'Tiny Islands'],
    default: 1
  },

  getGridSize() { return null; },

  generate(settings, rng) {
    const { mapSize, climate, seaLevel, numPlayers } = settings;
    const climateConfig = resolveClimateSettings(climate);
    const seaLevelChange = resolveSeaLevelChange(seaLevel);

    // 1. Resolve map dimensions (default grid size)
    const { width: W, height: H } = getDefaultDimensions(mapSize);

    // 2. Resolve custom option
    const optionIndex = settings.customOption != null ? settings.customOption : 1;
    const grainMap = [3, 4, 5];
    const continent_grain = grainMap[optionIndex] || 4;
    const extraPeaks = 15 * (1 + optionIndex);
    const adjustedPeakPercent = clamp(climateConfig.peakPercent + extraPeaks, 0, 100);

    // 3. Generate plot types
    const fw = new FractalWorld(W, H, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.hillRange,
      hillGroupTwoRange: climateConfig.hillRange,
      peakPercent: adjustedPeakPercent,
      wrapX: true,
      wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain,
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

    // 4. Add coast tiles
    TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

    // 5. Remove coastal peaks (Archipelago-specific)
    removeCoastalPeaks(plotTypes1D, W, H, true);

    // 6. Generate terrain
    const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false });
    const terrain1D = tg.generateTerrain(rng, plotTypes1D);

    // 7. Add rivers + lakes
    const riverGen = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
    const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
    const lakes1D = riverGen.addLakes(plotTypes1D);

    // 8. Add features
    const fg = new FeatureGenerator(W, H, {
      jungleLatitude: climateConfig.jungleLatitude,
      wrapX: true, wrapY: false
    });
    const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

    // 9. Add bonuses
    const bg = new BonusGenerator(W, H, {
      numPlayers, wrapX: true, wrapY: false
    });
    const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

    // 10. Custom regional starting plot assignment
    const regionTableKey = optionIndex === 2 ? 'tinyIslands'
                         : optionIndex === 0 ? 'snaky'
                         : 'archipelago';
    const regionTable = REGION_COUNTS[regionTableKey];
    const numRegions = regionTable[Math.min(numPlayers, regionTable.length - 1)];
    const regions = placeRegions(numRegions, W, H, rng);
    const starts = assignStartsArchipelago(
      numPlayers, regions, plotTypes1D, terrain1D, features1D, bonuses1D, W, H, rng
    );

    // 11. Normalize with skipRemovePeaks
    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: 0,
      skipRemovePeaks: true,
      wrapX: true, wrapY: false
    });
    sp.normalize(starts, plotTypes1D, terrain1D, features1D, bonuses1D, rivers1D, lakes1D, rng);

    // 12. Add goody huts
    const gg = new GoodyGenerator(W, H, { wrapX: true, wrapY: false });
    const goodies1D = gg.addGoodies(rng, plotTypes1D, terrain1D, features1D, bonuses1D, starts);

    // 13. Convert to 2D and return
    return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                          bonuses1D, rivers1D, lakes1D, starts, goodies1D);
  }
};
