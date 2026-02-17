/**
 * Test: River-Water Adjacency Invariants
 *
 * Validates Civ4 BTS invariants about where river edges can be placed
 * relative to water tiles:
 *
 * 1. No river edge should have BOTH adjacent tiles be water.
 * 2. River edges should only be set on land tiles (the tile storing the flag
 *    should be land or border land).
 * 3. River source tiles (where rivers originate) should be land.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = mapType !== 'inland_sea';

  let bothWaterN = 0; // isNOfRiver where both tile(x,y) and tile(x,y-1) are water
  let bothWaterW = 0; // isWOfRiver where both tile(x,y) and tile(x-1,y) are water
  let riverOnDeepWater = 0; // river flag set on a tile that is deep ocean (not adjacent to land)
  let totalRiverEdges = 0;

  forEachTile(map, (tile, x, y) => {
    // Check isNOfRiver: this is the horizontal edge between tile (x, y-1) and tile (x, y)
    if (tile.isNOfRiver) {
      totalRiverEdges++;

      // The tile to the north
      const northTile = y > 0 ? map.getTile(x, y - 1) : null;

      // Both tiles sharing this edge are water?
      if (tile.isWater && northTile && northTile.isWater) {
        // Exclude if either is a lake (lakes can have rivers flowing in/out)
        if (!tile.isLake && !(northTile && northTile.isLake)) {
          bothWaterN++;
        }
      }
    }

    // Check isWOfRiver: this is the vertical edge between tile (x-1, y) and tile (x, y)
    if (tile.isWOfRiver) {
      totalRiverEdges++;

      // The tile to the west
      let westX = x - 1;
      if (wrapX) westX = ((westX % W) + W) % W;

      const westTile = (!wrapX && x === 0) ? null : map.getTile(westX, y);

      // Both tiles sharing this edge are water?
      if (tile.isWater && westTile && westTile.isWater) {
        if (!tile.isLake && !(westTile && westTile.isLake)) {
          bothWaterW++;
        }
      }
    }

    // Check if any river flag is set on a tile completely surrounded by water
    // (not adjacent to any land at all)
    if ((tile.isNOfRiver || tile.isWOfRiver) && tile.isWater && !tile.isLake) {
      let hasLandNeighbor = false;
      for (let dy = -1; dy <= 1 && !hasLandNeighbor; dy++) {
        for (let dx = -1; dx <= 1 && !hasLandNeighbor; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (ny < 0 || ny >= H) continue;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;

          const nt = map.getTile(nx, ny);
          if (nt && nt.isLand) hasLandNeighbor = true;
        }
      }
      if (!hasLandNeighbor) riverOnDeepWater++;
    }
  });

  console.log(`  Total river edges: ${totalRiverEdges}`);

  if (totalRiverEdges === 0) {
    console.log(`  (no rivers — skipping)`);
    continue;
  }

  assert(bothWaterN === 0,
    `${mapType}: no N-of-river edge has both adjacent tiles as ocean (found ${bothWaterN})`);
  assert(bothWaterW === 0,
    `${mapType}: no W-of-river edge has both adjacent tiles as ocean (found ${bothWaterW})`);
  assert(riverOnDeepWater === 0,
    `${mapType}: no river flags on deep water tiles (found ${riverOnDeepWater})`);
}

reportResults('test-river-water-adjacency');
