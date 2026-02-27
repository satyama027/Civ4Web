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
import {
  resolveSeaLevelChange,
  resolveClimateSettings,
  removeCoastalPeaks,
  scoreCitySite
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

      if (plot === PLOT.OCEAN) {
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
 * Skips tiles already too close to an existing start (minDist=4 Manhattan),
 * and skips tiles not adjacent to any water tile (Civ4 ocean-adjacency requirement).
 */
function findBestTileInRadius(cx, cy, radius, plotTypes1D, terrain1D,
                               features1D, bonuses1D, W, H, wrapX,
                               existingStarts = []) {
  const minDist = 4;
  const adjOffsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  let bestScore = -Infinity;
  let bestTile = null;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      const idx = ny * W + nx;
      const plot = plotTypes1D[idx];
      if (plot === PLOT.OCEAN || plot === PLOT.PEAK) continue;

      // Skip tiles too close to already-placed starts (Fix 1: deduplication)
      let tooClose = false;
      for (const s of existingStarts) {
        if (!s) continue;
        let ddx = Math.abs(nx - s.x);
        if (wrapX && ddx > W / 2) ddx = W - ddx;
        const ddy = Math.abs(ny - s.y);
        if (ddx + ddy < minDist) { tooClose = true; break; }
      }
      if (tooClose) continue;

      // Skip tiles not adjacent to any water tile (Fix 2: ocean adjacency)
      let hasWater = false;
      for (const [adx, ady] of adjOffsets) {
        let ax = nx + adx;
        const ay = ny + ady;
        if (wrapX) ax = ((ax % W) + W) % W;
        else if (ax < 0 || ax >= W) continue;
        if (ay < 0 || ay >= H) continue;
        const ap = plotTypes1D[ay * W + ax];
        if (ap === PLOT.OCEAN || ap === PLOT.COAST) { hasWater = true; break; }
      }
      if (!hasWater) continue;

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
 * Last-resort global scan for a land tile, matching Civ4's findStartingPlot() fallback.
 * Finds the highest-scoring land tile not too close to already-assigned starts.
 */
function findBestLandTileGlobal(plotTypes1D, terrain1D, features1D,
                                 bonuses1D, W, H, wrapX, existingStarts) {
  let bestScore = -Infinity;
  let bestTile = null;
  const minDist = 4;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (plotTypes1D[idx] === PLOT.OCEAN || plotTypes1D[idx] === PLOT.PEAK) continue;

      let tooClose = false;
      for (const s of existingStarts) {
        if (!s) continue;
        let ddx = Math.abs(x - s.x);
        if (wrapX && ddx > W / 2) ddx = W - ddx;
        const ddy = Math.abs(y - s.y);
        if (ddx + ddy < minDist) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const score = scoreCitySite(x, y, plotTypes1D, terrain1D,
                                   features1D, bonuses1D, W, H, wrapX);
      if (score > bestScore) {
        bestScore = score;
        bestTile = { x, y };
      }
    }
  }

  // Ultimate fallback: any land tile at all
  if (!bestTile) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (plotTypes1D[y * W + x] !== PLOT.OCEAN && plotTypes1D[y * W + x] !== PLOT.PEAK) {
          return { x, y };
        }
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

    let best = findBestTileInRadius(region.x, region.y, radius,
                                     plotTypes1D, terrain1D, features1D,
                                     bonuses1D, W, H, wrapX, starts);

    // If no land tile in radius, try wider search (double radius)
    if (!best) {
      best = findBestTileInRadius(region.x, region.y, radius * 2,
                                   plotTypes1D, terrain1D, features1D,
                                   bonuses1D, W, H, wrapX, starts);
    }

    // If still no land tile, scan entire map for best unclaimed land tile
    if (!best) {
      best = findBestLandTileGlobal(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, W, H, wrapX, starts);
    }

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

  getGridSize() { return null; },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);
    const optionIndex = settings.customOption != null ? settings.customOption : 1;
    const grainMap = [3, 4, 5];
    const continent_grain = grainMap[optionIndex] || 4;
    const extraPeaks = 15 * (1 + optionIndex);
    const adjustedPeakPercent = clamp(climateConfig.iPeakPercent + extraPeaks, 0, 100);

    const fw = new FractalWorld(W, H, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.iHillRange,
      hillGroupTwoRange: climateConfig.iHillRange,
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

    const plotTypes = fw.generatePlotTypes(rng, {
      water_percent: 78,
      grain_amount: 3,
      shift_plot_types: true
    });

    removeCoastalPeaks(plotTypes, W, H, true);
    return plotTypes;
  },

  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) {
    const optionIndex = settings.customOption != null ? settings.customOption : 1;
    const regionTableKey = optionIndex === 2 ? 'tinyIslands'
                         : optionIndex === 0 ? 'snaky' : 'archipelago';
    const regionTable = REGION_COUNTS[regionTableKey];
    const numRegions = regionTable[Math.min(settings.numPlayers, regionTable.length - 1)];
    const regions = placeRegions(numRegions, W, H, rng);
    return assignStartsArchipelago(
      settings.numPlayers, regions, plotTypes, terrain, features, bonuses, W, H, rng
    );
  },

  normalizeRemovePeaks() { /* no-op: archipelago keeps peaks near starts */ }
};
