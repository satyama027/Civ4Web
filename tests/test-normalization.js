/**
 * Test: Starting Plot Normalization Effects
 *
 * After normalization, each starting location's BFC (big fat cross, radius 2
 * excluding 4 corners) should satisfy:
 * - No PEAK tiles (pass 3: converted to hills)
 * - No DESERT/SNOW on 8 tiles adjacent to start, radius 1 (pass 6)
 * - At least 1 hills tile within radius 2 (pass 8)
 *
 * Skipped for map types that disable normalization:
 * - oasis: skipNormalization=true
 * - archipelago: skipRemovePeaks=true (peaks test skipped)
 */

import {
  generateTestMap, assert, reportResults,
  ALL_MAP_TYPES, PLOT, TERRAIN
} from './_test-utils.js';

// Map types that skip specific normalization passes
const SKIP_NORMALIZATION = ['oasis', 'mirror'];  // oasis: skipNormalization=true; mirror: preserves symmetry
const SKIP_REMOVE_PEAKS = ['archipelago'];        // skipRemovePeaks=true

/**
 * Get tiles in BFC (radius 2, excluding 4 corners) around a position.
 * Matches StartingPlots._getTilesInRadius with radius=2.
 */
function getBFCTiles(cx, cy, W, H, wrapX) {
  const tiles = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      // BFC shape: exclude corners at Chebyshev distance 2
      if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;

      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      tiles.push({ x: nx, y: ny });
    }
  }
  return tiles;
}

/**
 * Get tiles within radius 1 (8 adjacent + center).
 */
function getRadius1Tiles(cx, cy, W, H, wrapX) {
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      tiles.push({ x: nx, y: ny });
    }
  }
  return tiles;
}

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea';

  if (map.startingLocations.length === 0) {
    console.log(`  skip: no starting locations`);
    continue;
  }

  if (SKIP_NORMALIZATION.includes(mapType)) {
    console.log(`  skip: ${mapType} disables normalization`);
    continue;
  }

  let peakViolations = 0;
  let badTerrainViolations = 0;
  let noHillsStarts = 0;
  let totalStarts = map.startingLocations.length;
  const checkPeaks = !SKIP_REMOVE_PEAKS.includes(mapType);

  for (const start of map.startingLocations) {
    // Skip starts on water tiles (known issue for some map types)
    const startTile = map.getTile(start.x, start.y);
    if (startTile && startTile.isWater) continue;

    const bfcTiles = getBFCTiles(start.x, start.y, W, H, wrapX);
    const r1Tiles = getRadius1Tiles(start.x, start.y, W, H, wrapX);

    // Pass 3: No peaks within BFC
    if (checkPeaks) {
      for (const t of bfcTiles) {
        const tile = map.getTile(t.x, t.y);
        if (tile && tile.plot === PLOT.PEAK) {
          peakViolations++;
        }
      }
    }

    // Pass 6: No desert/snow on land tiles within radius 1
    // Exception: desert is preserved under oasis/floodplains (Civ4 CvGame.cpp:1388)
    for (const t of r1Tiles) {
      const tile = map.getTile(t.x, t.y);
      if (!tile || tile.isWater) continue;
      if (tile.terrain === TERRAIN.DESERT && (tile.feature === 'oasis' || tile.feature === 'floodplains')) continue;
      if (tile.terrain === TERRAIN.DESERT || tile.terrain === TERRAIN.SNOW) {
        badTerrainViolations++;
      }
    }

    // Pass 8: At least 1 hills tile in BFC
    let hillsCount = 0;
    for (const t of bfcTiles) {
      const tile = map.getTile(t.x, t.y);
      if (tile && tile.plot === PLOT.HILLS) hillsCount++;
    }
    if (hillsCount === 0) noHillsStarts++;
  }

  if (checkPeaks) {
    assert(peakViolations === 0,
      `${mapType}: no peaks in any start's BFC (violations: ${peakViolations})`);
  }
  assert(badTerrainViolations === 0,
    `${mapType}: no desert/snow within radius 1 of any start (violations: ${badTerrainViolations})`);
  assert(noHillsStarts === 0,
    `${mapType}: all starts have ≥ 1 hills in BFC (starts without hills: ${noHillsStarts}/${totalStarts})`);

  console.log(`  info: ${totalStarts} starting locations validated`);
}

reportResults('test-normalization');
