/**
 * Inland Sea Map Script — Port of Civ4 BTS Inland_Sea.py
 * by Bob Thomas (Sirian), Soren Johnson, and Andy Szybalski.
 *
 * Mediterranean-type map: ring of land around a central sea.
 * Unique properties:
 * - No wrapping in either axis
 * - Compressed latitude (no snow/ice terrain)
 * - Rivers flow toward center
 * - Template-based starting positions
 */

import { PLOT } from '../FractalWorld.js';
import { HintedWorld } from '../HintedWorld.js';
import { TerrainGenerator, TERRAIN } from '../TerrainGenerator.js';
import { FeatureGenerator } from '../FeatureGenerator.js';
import { BonusGenerator } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
import {
  resolveSeaLevelChange,
  resolveClimateSettings,
  scoreCitySite
} from './_helpers.js';

// ============================================================================
// Custom Terrain Generator — Latitude Compression
// ============================================================================

/**
 * Compresses latitude to [0.07, 0.63] range, eliminating snow/ice terrain
 * and compressing the tropical zone.
 */
class ISTerrainGenerator extends TerrainGenerator {
  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return 0.07 + 0.56 * baseLat;
  }
}

// ============================================================================
// Custom Feature Generator — Latitude Compression
// ============================================================================

class ISFeatureGenerator extends FeatureGenerator {
  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return 0.07 + 0.56 * baseLat;
  }
}

// ============================================================================
// Plot Generation — HintedWorld Ring
// ============================================================================

function generateInlandSeaPlots(W, H, seaLevelChange, climateConfig, rng) {
  const hw = new HintedWorld(W, H, 4, 2, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.iHillRange,
    hillGroupTwoRange: climateConfig.iHillRange,
    peakPercent: climateConfig.iPeakPercent,
    wrapX: false,
    wrapY: false
  });

  // For a 4×2 grid:
  // Set border cells (corners/edges) to land (high values)
  // Set interior cells to ocean (low values)
  // The 4×2 grid: all are border cells, so we set corners to land
  // and the 2 inner-bottom + 2 inner-top to ocean for the sea effect
  hw.setValue(0, 0, 200 + rng.nextInt(0, 54)); // bottom-left corner
  hw.setValue(3, 0, 200 + rng.nextInt(0, 54)); // bottom-right corner
  hw.setValue(0, 1, 200 + rng.nextInt(0, 54)); // top-left corner
  hw.setValue(3, 1, 200 + rng.nextInt(0, 54)); // top-right corner

  // Inner cells: ocean (creates the inland sea)
  hw.setValue(1, 0, 0);
  hw.setValue(2, 0, 0);
  hw.setValue(1, 1, 0);
  hw.setValue(2, 1, 0);

  return hw.generatePlotTypes(rng, {
    water_percent: -1,
    shift_plot_types: false
  });
}

// ============================================================================
// Custom Rivers — Flow Toward Center
// ============================================================================

function addInlandSeaRivers(rng, plotTypes1D, terrain1D, W, H) {
  const rivers1D = new Array(W * H).fill(null).map(() => ({
    isNOfRiver: false, isWOfRiver: false,
    riverNSDirection: null, riverWEDirection: null
  }));

  const centerX = Math.floor(W / 2);
  const centerY = Math.floor(H / 2);

  // Build candidate river sources: land tiles sorted by distance from center (farthest first)
  const candidates = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = y * W + x;
      if (plotTypes1D[idx] === PLOT.OCEAN) continue;
      if (plotTypes1D[idx] === PLOT.PEAK) continue;
      const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
      candidates.push({ x, y, dist });
    }
  }
  candidates.sort((a, b) => b.dist - a.dist);

  // Place rivers from outer land tiles flowing toward center
  const maxRivers = Math.max(4, Math.floor(Math.sqrt(W * H) / 6));
  let placed = 0;

  for (const start of candidates) {
    if (placed >= maxRivers) break;

    // Skip tiles already with rivers
    if (rivers1D[start.y * W + start.x].isNOfRiver ||
        rivers1D[start.y * W + start.x].isWOfRiver) continue;

    // Trace path toward center
    let cx = start.x;
    let cy = start.y;
    let length = 0;
    const maxLength = Math.floor((W + H) / 3);

    while (length < maxLength) {
      const idx = cy * W + cx;

      // Stop at water
      if (plotTypes1D[idx] === PLOT.OCEAN) break;

      // Determine direction toward center
      const dx = centerX - cx;
      const dy = centerY - cy;

      // Bias toward the longer axis, with some randomness
      const roll = rng.next();
      let moveX = false;

      if (dx === 0 && dy === 0) break;
      if (dx === 0) moveX = false;
      else if (dy === 0) moveX = true;
      else if (roll < 0.6) moveX = Math.abs(dx) >= Math.abs(dy);
      else moveX = Math.abs(dx) < Math.abs(dy);

      if (moveX) {
        // Move horizontally
        if (dx > 0) {
          // Moving east: place river on west edge of next tile
          const nx = cx + 1;
          if (nx >= W) break;
          rivers1D[cy * W + nx].isWOfRiver = true;
          rivers1D[cy * W + nx].riverWEDirection = dy >= 0 ? 'N' : 'S';
          cx = nx;
        } else {
          // Moving west: place river on west edge of current tile
          rivers1D[idx].isWOfRiver = true;
          rivers1D[idx].riverWEDirection = dy >= 0 ? 'N' : 'S';
          cx = cx - 1;
          if (cx < 0) break;
        }
      } else {
        // Move vertically
        if (dy > 0) {
          // Moving north (increasing y): place river on north edge
          rivers1D[idx].isNOfRiver = true;
          rivers1D[idx].riverNSDirection = dx >= 0 ? 'E' : 'W';
          cy = cy + 1;
          if (cy >= H) break;
        } else {
          // Moving south (decreasing y): place river on north edge of southern tile
          const ny = cy - 1;
          if (ny < 0) break;
          rivers1D[ny * W + cx].isNOfRiver = true;
          rivers1D[ny * W + cx].riverNSDirection = dx >= 0 ? 'E' : 'W';
          cy = ny;
        }
      }

      length++;
    }

    if (length >= 3) placed++;
  }

  return rivers1D;
}

// ============================================================================
// Template-Based Starting Positions
// ============================================================================

// Templates: [fLat, fLon, xVariance, yVariance] — positions ring the edges
const TEMPLATES = {
  1: [
    [[0.5, 0.1, 2, 2]]
  ],
  2: [
    [[0.5, 0.1, 2, 2], [0.5, 0.9, 2, 2]],
    [[0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2]],
    [[0.2, 0.1, 2, 2], [0.8, 0.9, 2, 2]],
    [[0.8, 0.1, 2, 2], [0.2, 0.9, 2, 2]],
    [[0.2, 0.2, 2, 2], [0.8, 0.8, 2, 2]],
    [[0.8, 0.2, 2, 2], [0.2, 0.8, 2, 2]]
  ],
  3: [
    [[0.5, 0.1, 2, 2], [0.1, 0.7, 2, 2], [0.9, 0.7, 2, 2]],
    [[0.5, 0.9, 2, 2], [0.1, 0.3, 2, 2], [0.9, 0.3, 2, 2]],
    [[0.1, 0.5, 2, 2], [0.7, 0.1, 2, 2], [0.7, 0.9, 2, 2]],
    [[0.9, 0.5, 2, 2], [0.3, 0.1, 2, 2], [0.3, 0.9, 2, 2]]
  ],
  4: [
    [[0.1, 0.2, 2, 2], [0.1, 0.8, 2, 2], [0.9, 0.2, 2, 2], [0.9, 0.8, 2, 2]],
    [[0.2, 0.1, 2, 2], [0.8, 0.1, 2, 2], [0.2, 0.9, 2, 2], [0.8, 0.9, 2, 2]],
    [[0.5, 0.1, 2, 2], [0.5, 0.9, 2, 2], [0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2]]
  ],
  5: [
    [[0.5, 0.1, 2, 2], [0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2], [0.2, 0.9, 2, 2], [0.8, 0.9, 2, 2]],
    [[0.5, 0.9, 2, 2], [0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2], [0.2, 0.1, 2, 2], [0.8, 0.1, 2, 2]]
  ],
  6: [
    [[0.1, 0.2, 2, 2], [0.1, 0.8, 2, 2], [0.5, 0.1, 2, 2], [0.5, 0.9, 2, 2], [0.9, 0.2, 2, 2], [0.9, 0.8, 2, 2]],
    [[0.2, 0.1, 2, 2], [0.8, 0.1, 2, 2], [0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2], [0.2, 0.9, 2, 2], [0.8, 0.9, 2, 2]]
  ],
  7: [
    [[0.1, 0.2, 2, 2], [0.1, 0.8, 2, 2], [0.5, 0.1, 2, 2], [0.5, 0.9, 2, 2], [0.9, 0.2, 2, 2], [0.9, 0.8, 2, 2], [0.5, 0.5, 2, 2]],
    [[0.2, 0.1, 2, 2], [0.8, 0.1, 2, 2], [0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2], [0.2, 0.9, 2, 2], [0.8, 0.9, 2, 2], [0.5, 0.5, 2, 2]]
  ],
  8: [
    [[0.1, 0.1, 2, 2], [0.1, 0.5, 2, 2], [0.1, 0.9, 2, 2], [0.5, 0.1, 2, 2],
     [0.5, 0.9, 2, 2], [0.9, 0.1, 2, 2], [0.9, 0.5, 2, 2], [0.9, 0.9, 2, 2]],
    [[0.1, 0.3, 2, 2], [0.1, 0.7, 2, 2], [0.3, 0.1, 2, 2], [0.3, 0.9, 2, 2],
     [0.7, 0.1, 2, 2], [0.7, 0.9, 2, 2], [0.9, 0.3, 2, 2], [0.9, 0.7, 2, 2]],
    [[0.2, 0.1, 2, 2], [0.2, 0.5, 2, 2], [0.2, 0.9, 2, 2], [0.5, 0.1, 2, 2],
     [0.5, 0.9, 2, 2], [0.8, 0.1, 2, 2], [0.8, 0.5, 2, 2], [0.8, 0.9, 2, 2]],
    [[0.1, 0.2, 2, 2], [0.1, 0.8, 2, 2], [0.3, 0.5, 2, 2], [0.5, 0.1, 2, 2],
     [0.5, 0.9, 2, 2], [0.7, 0.5, 2, 2], [0.9, 0.2, 2, 2], [0.9, 0.8, 2, 2]]
  ]
};

function assignStartsInlandSea(numPlayers, plotTypes1D, terrain1D, features1D,
                                bonuses1D, rivers1D, lakes1D, W, H, rng) {
  const templates = TEMPLATES[numPlayers];

  if (!templates || templates.length === 0) {
    // Fallback to default StartingPlots for unsupported player counts
    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: -95,
      wrapX: false, wrapY: false
    });
    return sp.assignStartingPlots(numPlayers, rng, plotTypes1D, terrain1D,
                                   features1D, bonuses1D, rivers1D, lakes1D);
  }

  // Pick random template
  const templateIdx = rng.nextInt(0, templates.length - 1);
  const template = templates[templateIdx];

  const starts = [];

  for (const [fLat, fLon, xVar] of template) {
    const targetX = Math.floor(fLon * W);
    const targetY = Math.floor(fLat * H);

    let best = null;
    let bestScore = -Infinity;

    // Search within expanding radius for best tile
    for (let pass = 0; pass < 50; pass++) {
      const searchRadius = xVar + pass;
      let found = false;

      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const nx = targetX + dx;
          const ny = targetY + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;

          const idx = ny * W + nx;
          if (plotTypes1D[idx] === PLOT.OCEAN ||
              plotTypes1D[idx] === PLOT.PEAK) continue;

          // Check distance from existing starts
          let tooClose = false;
          for (const s of starts) {
            const dist = Math.sqrt((nx - s.x) ** 2 + (ny - s.y) ** 2);
            if (dist < 3) { tooClose = true; break; }
          }
          if (tooClose) continue;

          // Score this tile
          const score = scoreCitySite(nx, ny, plotTypes1D, terrain1D,
                                       features1D, bonuses1D, W, H, false);
          if (score > bestScore) {
            bestScore = score;
            best = { x: nx, y: ny };
            found = true;
          }
        }
      }

      if (found) break;
    }

    if (best) starts.push(best);
    else starts.push({ x: targetX, y: targetY });
  }

  return starts;
}

// ============================================================================
// Inland Sea Script Export
// ============================================================================

export default {
  id: 'inland_sea',
  name: 'Inland Sea',
  description: 'Continental ring surrounding a central body of water.',
  isAdvancedMap: false,
  getWrapX()  { return false; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 60; },
  getBottomLatitude() { return -60; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return -95; },
  customOptions: [],

  getGridSize(worldSize) {
    const table = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [13, 8],
      large:    [16, 10],
      huge:     [21, 13]
    };
    const grid = table[worldSize] || table.standard;
    return { width: grid[0] * 4, height: grid[1] * 4 };
  },

  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);
    return generateInlandSeaPlots(W, H, seaLevelChange, climateConfig, rng);
  },

  generateTerrain(W, H, plotTypes, settings, rng) {
    const tg = new ISTerrainGenerator(W, H, {
      wrapX: false, wrapY: false,
      topLatitude: 60, bottomLatitude: -60,
      mapSize: settings.mapSize
    });
    return tg.generateTerrain(rng, plotTypes);
  },

  addRivers(W, H, plotTypes, terrain, rng, callbacks) {
    return addInlandSeaRivers(rng, plotTypes, terrain, W, H);
  },

  addFeatures(W, H, plotTypes, terrain, rivers, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const fg = new ISFeatureGenerator(W, H, {
      jungleLatitude: climateConfig.iJungleLatitude,
      randIceLatitude: climateConfig.fRandIceLatitude,
      wrapX: false, wrapY: false,
      topLatitude: 60, bottomLatitude: -60,
      mapSize: settings.mapSize
    });
    return fg.generateFeatures(rng, plotTypes, terrain, rivers);
  },

  addBonuses(W, H, plotTypes, terrain, features, settings, rng, callbacks) {
    const bg = new BonusGenerator(W, H, {
      numPlayers: settings.numPlayers, wrapX: false, wrapY: false,
      topLatitude: 60, bottomLatitude: -60
    });
    return bg.addBonuses(rng, plotTypes, terrain, features);
  },

  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) {
    return assignStartsInlandSea(
      settings.numPlayers, plotTypes, terrain, features,
      bonuses, rivers, lakes, W, H, rng
    );
  }
};
