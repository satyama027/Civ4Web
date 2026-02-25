/**
 * Test: Lake Invariants
 *
 * A lake is a PLOT.OCEAN tile where ALL 8 neighbors are land (non-ocean).
 * Lakes are single-tile bodies of water surrounded entirely by land.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT, TERRAIN
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea';

  let lakeCount = 0;
  let notOceanPlot = 0;
  let hasOceanNeighbor = 0;
  let adjacentLakePairs = 0;
  let wrongTerrain = 0;

  forEachTile(map, (tile, x, y) => {
    if (!tile.isLake) return;
    lakeCount++;

    // Lakes must have OCEAN plot type (they are water tiles)
    if (tile.plot !== PLOT.OCEAN) {
      notOceanPlot++;
    }

    // Check all 8 neighbors
    let foundOceanNeighbor = false;
    let foundLakeNeighbor = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        if (wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;

        const neighbor = map.getTile(nx, ny);
        if (!neighbor) continue;

        // Neighbor should not be ocean (non-lake)
        if (neighbor.plot === PLOT.OCEAN && !neighbor.isLake) {
          foundOceanNeighbor = true;
        }
        // Check for adjacent lakes
        if (neighbor.isLake) {
          foundLakeNeighbor = true;
        }
      }
    }

    if (foundOceanNeighbor) hasOceanNeighbor++;
    if (foundLakeNeighbor) adjacentLakePairs++;

    // Test C: lake tiles must have coast terrain (shallow water surrounded by land)
    if (tile.terrain !== TERRAIN.COAST) {
      wrongTerrain++;
    }
  });

  assert(notOceanPlot === 0,
    `${mapType}: all lakes have OCEAN plot type (violations: ${notOceanPlot}/${lakeCount})`);
  assert(hasOceanNeighbor === 0,
    `${mapType}: no lake has a non-lake ocean neighbor (violations: ${hasOceanNeighbor}/${lakeCount})`);
  assert(adjacentLakePairs === 0,
    `${mapType}: no two lakes are adjacent (violations: ${adjacentLakePairs}/${lakeCount})`);

  // Test C: all lake tiles should have coast terrain (they are enclosed by land)
  assert(wrongTerrain === 0,
    `${mapType}: all lake tiles have TERRAIN.COAST (violations: ${wrongTerrain}/${lakeCount})`);

  // Test A: completeness — every OCEAN tile whose 8 in-bounds neighbors are all
  // non-OCEAN must be flagged as isLake (no missed lakes).
  let missedLakes = 0;
  forEachTile(map, (tile, x, y) => {
    if (tile.plot !== PLOT.OCEAN) return;
    if (tile.isLake) return; // already marked — skip

    let allNonOcean = true;
    outer: for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        if (wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;

        const neighbor = map.getTile(nx, ny);
        if (!neighbor) continue;
        if (neighbor.plot === PLOT.OCEAN) { allNonOcean = false; break outer; }
      }
    }
    if (allNonOcean) missedLakes++;
  });
  assert(missedLakes === 0,
    `${mapType}: completeness — no OCEAN tiles with all-land 8-neighbors missed as lakes (missed: ${missedLakes})`);

  console.log(`  info: ${lakeCount} lakes found`);
}

reportResults('test-lakes');
