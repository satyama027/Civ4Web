/**
 * Test: Civ4 BTS River Placement Rules
 *
 * Validates per-edge placement rules from Civ4's CvMapGenerator.cpp doRiver().
 * Uses Civ4-correct edge semantics (y=0=north, y increases southward):
 *
 *   isNOfRiver at (x,y) = bottom/south horizontal edge shared by tile (x,y)
 *     and its south neighbor (x,y+1). Both should not be deep ocean.
 *   isWOfRiver at (x,y) = right/east vertical edge shared by tile (x,y)
 *     and its east neighbor (x+1,y). Both should not be deep ocean.
 *
 * Coast tiles are allowed since rivers legitimately terminate at the coast.
 *
 * 2. River edges only on land-adjacent tiles: The tile storing the flag
 *    should have at least one land neighbor (including itself).
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = mapType !== 'inland_sea';

  function getPlot(tx, ty) {
    if (ty < 0 || ty >= H) return null;
    if (wrapX) tx = ((tx % W) + W) % W;
    else if (tx < 0 || tx >= W) return null;
    return map.getTile(tx, ty);
  }

  let totalRiverEdges = 0;
  let nOfRiverBothOcean = 0;  // isNOfRiver where tile AND south neighbor are both deep ocean
  let wOfRiverBothOcean = 0;  // isWOfRiver where tile AND east neighbor are both deep ocean
  let riverNoLandNeighbor = 0; // river flag on tile with no land neighbor at all

  forEachTile(map, (tile, x, y) => {
    if (tile.isNOfRiver) {
      totalRiverEdges++;

      // isNOfRiver = bottom horizontal edge shared by (x,y) and south neighbor (x,y+1)
      // Both tiles should not be deep ocean (coast is allowed — rivers terminate there)
      const southTile = getPlot(x, y + 1);
      if (tile.terrain === 'ocean' && southTile && southTile.terrain === 'ocean') {
        nOfRiverBothOcean++;
      }
    }

    if (tile.isWOfRiver) {
      totalRiverEdges++;

      // isWOfRiver = right vertical edge shared by (x,y) and east neighbor (x+1,y)
      // Both tiles should not be deep ocean (coast is allowed — rivers terminate there)
      const eastTile = getPlot(x + 1, y);
      if (tile.terrain === 'ocean' && eastTile && eastTile.terrain === 'ocean') {
        wOfRiverBothOcean++;
      }
    }

    // Check if any river flag on a tile completely isolated from land
    if ((tile.isNOfRiver || tile.isWOfRiver) && tile.isWater && !tile.isLake) {
      let hasLandNeighbor = false;
      for (let dy = -1; dy <= 1 && !hasLandNeighbor; dy++) {
        for (let dx = -1; dx <= 1 && !hasLandNeighbor; dx++) {
          const nt = getPlot(x + dx, y + dy);
          if (nt && nt.isLand) hasLandNeighbor = true;
        }
      }
      if (!hasLandNeighbor) riverNoLandNeighbor++;
    }
  });

  console.log(`  Total river edges: ${totalRiverEdges}`);

  if (totalRiverEdges === 0) {
    console.log(`  (no rivers — skipping)`);
    continue;
  }

  assert(nOfRiverBothOcean === 0,
    `${mapType}: no N-of-river where storage tile AND south neighbor are both deep ocean (found ${nOfRiverBothOcean})`);
  assert(wOfRiverBothOcean === 0,
    `${mapType}: no W-of-river where storage tile AND east neighbor are both deep ocean (found ${wOfRiverBothOcean})`);
  assert(riverNoLandNeighbor === 0,
    `${mapType}: no river flags on tiles isolated from land (found ${riverNoLandNeighbor})`);
}

reportResults('test-river-civ4-placement');
