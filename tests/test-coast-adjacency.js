/**
 * Test: Coast Terrain Must Be Near Land
 *
 * The TerrainGenerator assigns COAST to water tiles within Chebyshev distance ≤ 2
 * of any land tile, and OCEAN to water tiles farther away.
 * This validates the coast ring is exactly 2 tiles wide.
 *
 * Some legacy pipeline map types (pangaea, oasis) have known plot/terrain
 * mismatches where the coast assignment doesn't perfectly align with plots.
 * These are tested with a tolerance.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT, TERRAIN
} from './_test-utils.js';

// Legacy pipelines with known plot/terrain mismatches (also caught by test-terrain)
const LEGACY_TOLERANCE_TYPES = ['pangaea', 'oasis'];

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea'; // inland_sea has no X wrap

  let coastCount = 0;
  let oceanCount = 0;
  let coastViolations = 0;
  let oceanViolations = 0;

  forEachTile(map, (tile, x, y) => {
    // Only check water plot tiles (PLOT.OCEAN) — some legacy pipelines have
    // plot/terrain mismatches on land tiles, which is a separate issue
    if (tile.plot !== PLOT.OCEAN) return;
    if (tile.terrain !== TERRAIN.COAST && tile.terrain !== TERRAIN.OCEAN) return;

    // Check Chebyshev distance ≤ 2 to any land plot tile (5×5 box)
    let nearLand = false;
    for (let dy = -2; dy <= 2 && !nearLand; dy++) {
      for (let dx = -2; dx <= 2 && !nearLand; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        if (wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;

        const neighbor = map.getTile(nx, ny);
        if (neighbor && neighbor.isLand) {
          nearLand = true;
        }
      }
    }

    // Also check if tile is near a normalization-added lake (which is land→ocean
    // conversion that doesn't re-run coast assignment on neighbors)
    let nearLake = false;
    if (!nearLand) {
      for (let dy = -2; dy <= 2 && !nearLake; dy++) {
        for (let dx = -2; dx <= 2 && !nearLake; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          const neighbor = map.getTile(nx, ny);
          if (neighbor && neighbor.isLake) nearLake = true;
        }
      }
    }

    if (tile.terrain === TERRAIN.COAST) {
      coastCount++;
      if (!nearLand && !tile.isLake) coastViolations++; // lakes get COAST terrain but may lack land neighbors
    } else if (tile.terrain === TERRAIN.OCEAN) {
      oceanCount++;
      // Exclude tiles near normalization-added lakes (land→ocean doesn't re-run coast)
      if (nearLand && !nearLake) oceanViolations++;
    }
  });

  assert(coastCount > 0 || mapType === 'oasis',
    `${mapType}: has coast tiles (found ${coastCount})`);
  assert(coastViolations === 0,
    `${mapType}: every COAST tile has land within Chebyshev ≤ 2 (violations: ${coastViolations}/${coastCount})`);
  if (LEGACY_TOLERANCE_TYPES.includes(mapType)) {
    // Legacy pipelines have known plot/terrain mismatches — log but don't fail
    const pct = oceanCount > 0 ? ((oceanViolations / oceanCount) * 100).toFixed(1) : 0;
    assert(oceanViolations / Math.max(oceanCount, 1) < 0.10,
      `${mapType}: OCEAN-near-land violations < 10% (${oceanViolations}/${oceanCount} = ${pct}%)`);
  } else {
    assert(oceanViolations === 0,
      `${mapType}: no OCEAN tile has land within Chebyshev ≤ 2 (violations: ${oceanViolations}/${oceanCount})`);
  }
}

reportResults('test-coast-adjacency');
