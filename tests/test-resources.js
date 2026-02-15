/**
 * Test: Resource Placement Rules
 * Validates bonus/resource placement invariants.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

const KNOWN_RESOURCES = new Set([
  null,
  // Strategic
  'aluminum', 'coal', 'copper', 'horse', 'iron', 'marble', 'oil', 'stone', 'uranium',
  // Luxury
  'dye', 'fur', 'gems', 'gold', 'incense', 'ivory', 'silk', 'silver', 'spices', 'sugar', 'wine', 'whale',
  // Food
  'banana', 'clam', 'corn', 'cow', 'crab', 'deer', 'fish', 'pig', 'rice', 'sheep', 'wheat'
]);

const WATER_RESOURCES = new Set(['fish', 'clam', 'crab', 'whale', 'oil']);

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);

  let unknownResources = 0;
  let resourceOnPeak = 0;
  let totalResources = 0;
  let waterResourceOnLand = 0;
  let landResourceOnWater = 0;

  forEachTile(map, (tile) => {
    const r = tile.resource;

    if (!KNOWN_RESOURCES.has(r)) {
      unknownResources++;
      return;
    }

    if (r === null) return;
    totalResources++;

    // No resources on peaks
    if (tile.isPeak) resourceOnPeak++;

    // Water/land resource consistency
    if (tile.isWater && !WATER_RESOURCES.has(r)) {
      // Oil can appear on both water and land
      landResourceOnWater++;
    }
    if (!tile.isWater && WATER_RESOURCES.has(r) && r !== 'oil') {
      waterResourceOnLand++;
    }
  });

  assert(unknownResources === 0, `${mapType}: all resources are known IDs (${unknownResources} unknown)`);
  assert(resourceOnPeak === 0, `${mapType}: no resources on peaks (${resourceOnPeak})`);
  assert(totalResources > 0, `${mapType}: at least some resources exist (${totalResources})`);
  assert(waterResourceOnLand === 0,
    `${mapType}: no water-only resources on land (${waterResourceOnLand})`);
  assert(landResourceOnWater === 0,
    `${mapType}: no land-only resources on water (${landResourceOnWater})`);
}

reportResults('test-resources');
