/**
 * Test script: verify that rivers and lakes are generated in map output.
 *
 * Usage:  node tests/test-rivers.js
 * Exit 0 = all tests pass, exit 1 = at least one failure (bug confirmed).
 */

import { generateMap, getMapStats } from '../src/game/mapGenerator.js';

const SEED = 42;

const TEST_CASES = [
  { mapType: 'continents', mapSize: 'small', label: 'Continents (default pipeline)' },
  { mapType: 'pangaea',    mapSize: 'small', label: 'Pangaea (script overrides)' },
  { mapType: 'fractal',    mapSize: 'small', label: 'Fractal (varied terrain)' },
];

let failures = 0;

for (const tc of TEST_CASES) {
  console.log(`\n--- ${tc.label} ---`);

  const map = generateMap({
    mapType: tc.mapType,
    mapSize: tc.mapSize,
    climate: 'temperate',
    seaLevel: 'medium',
    numPlayers: 4,
    seed: SEED,
  });

  // Count river edges and lakes by iterating every tile
  let riverEdgeCount = 0;
  let lakeCount = 0;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      if (tile.hasRiver) riverEdgeCount++;
      if (tile.isLake) lakeCount++;
    }
  }

  const stats = getMapStats(map);

  console.log(`  Map size: ${map.width}x${map.height}`);
  console.log(`  Tiles with river edges: ${riverEdgeCount}`);
  console.log(`  Lake tiles: ${lakeCount}`);
  console.log(`  Stats: ${JSON.stringify(stats.terrain ?? {})}`);

  if (riverEdgeCount > 0) {
    console.log(`  PASS: Rivers present (${riverEdgeCount} tiles)`);
  } else {
    console.log(`  FAIL: No river edges found!`);
    failures++;
  }

  // Lakes are rare — just report, don't fail on zero lakes
  console.log(`  INFO: ${lakeCount} lake tile(s)`);
}

console.log(`\n========================================`);
if (failures > 0) {
  console.log(`RESULT: ${failures} test(s) FAILED — rivers are missing!`);
  process.exit(1);
} else {
  console.log(`RESULT: All tests PASSED — rivers are present.`);
  process.exit(0);
}
