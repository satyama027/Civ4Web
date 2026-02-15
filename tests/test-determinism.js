/**
 * Test: Seed Reproducibility
 * Validates that same seed produces identical maps, different seed produces different maps.
 */

import { generateTestMap, assert, reportResults } from './_test-utils.js';

const TEST_TYPES = ['continents', 'pangaea', 'archipelago'];

function arraysEqual2D(a, b) {
  if (a.length !== b.length) return false;
  for (let y = 0; y < a.length; y++) {
    if (a[y].length !== b[y].length) return false;
    for (let x = 0; x < a[y].length; x++) {
      const av = a[y][x];
      const bv = b[y][x];
      // Handle objects (river data)
      if (typeof av === 'object' && av !== null && typeof bv === 'object' && bv !== null) {
        if (JSON.stringify(av) !== JSON.stringify(bv)) return false;
      } else if (av !== bv) {
        return false;
      }
    }
  }
  return true;
}

for (const mapType of TEST_TYPES) {
  console.log(`\n--- ${mapType}: same seed ---`);

  const map1 = generateTestMap(mapType, { seed: 12345 });
  const map2 = generateTestMap(mapType, { seed: 12345 });

  assert(arraysEqual2D(map1.plots, map2.plots), `${mapType}: plots match with same seed`);
  assert(arraysEqual2D(map1.terrain, map2.terrain), `${mapType}: terrain matches with same seed`);
  assert(arraysEqual2D(map1.features, map2.features), `${mapType}: features match with same seed`);
  assert(arraysEqual2D(map1.resources, map2.resources), `${mapType}: resources match with same seed`);
  assert(arraysEqual2D(map1.rivers, map2.rivers), `${mapType}: rivers match with same seed`);

  // Starting locations match
  const startsMatch = JSON.stringify(map1.startingLocations) === JSON.stringify(map2.startingLocations);
  assert(startsMatch, `${mapType}: startingLocations match with same seed`);

  console.log(`\n--- ${mapType}: different seed ---`);

  const map3 = generateTestMap(mapType, { seed: 99999 });
  const plotsDiffer = !arraysEqual2D(map1.plots, map3.plots);
  assert(plotsDiffer, `${mapType}: plots differ with different seed`);
}

reportResults('test-determinism');
