/**
 * Test: Settings Variation
 * Validates that different settings produce reasonable results.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

// Test 1: All 10 map types produce valid maps without errors
console.log('\n--- All map types generate without errors ---');
for (const mapType of ALL_MAP_TYPES) {
  let error = null;
  try {
    const map = generateTestMap(mapType);
    assert(map.width > 0 && map.height > 0, `${mapType}: generates valid map`);
  } catch (e) {
    assert(false, `${mapType}: generates without error (threw: ${e.message})`);
  }
}

// Test 2: Climate variation
console.log('\n--- Climate variation ---');
const climates = ['temperate', 'tropical', 'arid', 'rocky', 'cold'];
for (const climate of climates) {
  const map = generateTestMap('continents', { climate, seed: 100 });
  assert(map.width > 0, `climate=${climate}: produces valid map`);
}

// Test 3: Sea level variation — water percentage should change in expected direction
console.log('\n--- Sea level variation ---');
function getWaterPercent(map) {
  let water = 0;
  const total = map.width * map.height;
  forEachTile(map, (tile) => { if (tile.isWater) water++; });
  return (water / total) * 100;
}

const lowMap = generateTestMap('continents', { seaLevel: 'low', seed: 200 });
const medMap = generateTestMap('continents', { seaLevel: 'medium', seed: 200 });
const highMap = generateTestMap('continents', { seaLevel: 'high', seed: 200 });

const lowWater = getWaterPercent(lowMap);
const medWater = getWaterPercent(medMap);
const highWater = getWaterPercent(highMap);

console.log(`  Water %: low=${lowWater.toFixed(1)}, medium=${medWater.toFixed(1)}, high=${highWater.toFixed(1)}`);
assert(lowWater < highWater, `sea level: low (${lowWater.toFixed(1)}%) < high (${highWater.toFixed(1)}%)`);

// Test 4: Map sizes — duel and huge both produce valid maps with correct relative dimensions
console.log('\n--- Map size variation ---');
const duelMap = generateTestMap('continents', { mapSize: 'duel', numPlayers: 2, seed: 300 });
const hugeMap = generateTestMap('continents', { mapSize: 'huge', numPlayers: 4, seed: 300 });

assert(duelMap.width > 0 && duelMap.height > 0, `duel: valid dimensions (${duelMap.width}x${duelMap.height})`);
assert(hugeMap.width > 0 && hugeMap.height > 0, `huge: valid dimensions (${hugeMap.width}x${hugeMap.height})`);
assert(hugeMap.width > duelMap.width, `huge map wider than duel (${hugeMap.width} > ${duelMap.width})`);
assert(hugeMap.height > duelMap.height, `huge map taller than duel (${hugeMap.height} > ${duelMap.height})`);

reportResults('test-settings');
