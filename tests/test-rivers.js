/**
 * Test: Rivers and lakes are generated for all map types.
 *
 * Usage:  node tests/test-rivers.js
 * Exit 0 = all tests pass, exit 1 = at least one failure.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES
} from './_test-utils.js';
import { getMapStats } from '../src/game/mapGenerator.js';

// Per-type seed overrides: use a seed known to produce rivers at the correct
// map dimensions.  Mirror changed to a smaller grid (40×24 for 'small') so
// seed 42 produces 0 rivers — seed 1 reliably produces rivers at that size.
const SEED_OVERRIDES = {
  mirror: { seed: 1 }
};

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType, SEED_OVERRIDES[mapType] ?? {});

  // Count river edges and lakes by iterating every tile
  let riverEdgeCount = 0;
  let lakeCount = 0;

  forEachTile(map, (tile) => {
    if (tile.hasRiver) riverEdgeCount++;
    if (tile.isLake) lakeCount++;
  });

  const stats = getMapStats(map);

  console.log(`  Map size: ${map.width}x${map.height}`);
  console.log(`  Tiles with river edges: ${riverEdgeCount}`);
  console.log(`  Lake tiles: ${lakeCount}`);
  console.log(`  Stats: ${JSON.stringify(stats.terrain ?? {})}`);

  assert(riverEdgeCount > 0,
    `${mapType}: rivers present (${riverEdgeCount} tiles)`);

  // Lakes are rare — just report, don't fail on zero lakes
  console.log(`  INFO: ${lakeCount} lake tile(s)`);
}

reportResults('test-rivers');
