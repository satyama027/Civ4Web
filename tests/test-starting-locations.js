/**
 * Test: Starting Plot Validation
 * Validates starting location quality and placement rules.
 */

import {
  generateTestMap, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const starts = map.startingLocations;

  assert(starts.length > 0,
    `${mapType}: at least 1 starting location (got ${starts.length})`);

  let outOfBounds = 0;
  let onWater = 0;
  let onPeak = 0;
  const seen = new Set();
  let duplicates = 0;

  for (const loc of starts) {
    // Bounds check
    if (loc.x < 0 || loc.x >= map.width || loc.y < 0 || loc.y >= map.height) {
      outOfBounds++;
      continue;
    }

    // Duplicate check
    const key = `${loc.x},${loc.y}`;
    if (seen.has(key)) duplicates++;
    seen.add(key);

    // Must be on land
    const tile = map.getTile(loc.x, loc.y);
    if (tile.isWater) onWater++;
    if (tile.isPeak) onPeak++;
  }

  assert(outOfBounds === 0,
    `${mapType}: all starts within bounds (${outOfBounds} out of bounds)`);
  assert(onWater === 0,
    `${mapType}: no starts on water (${onWater})`);
  assert(onPeak === 0,
    `${mapType}: no starts on peaks (${onPeak})`);
  assert(duplicates === 0,
    `${mapType}: no duplicate start locations (${duplicates})`);
}

reportResults('test-starting-locations');
