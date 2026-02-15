/**
 * Test: Feature Placement Invariants
 * Validates Civ4's feature eligibility rules.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT, TERRAIN, FEATURE
} from './_test-utils.js';

const VALID_FEATURES = new Set([null, FEATURE.ICE, FEATURE.JUNGLE, FEATURE.FOREST, FEATURE.OASIS, FEATURE.FLOODPLAINS]);

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);

  let invalidFeature = 0;
  let featureOnPeak = 0;
  let forestErrors = 0;
  let jungleErrors = 0;
  let iceErrors = 0;
  let oasisErrors = 0;
  let floodplainsErrors = 0;

  forEachTile(map, (tile) => {
    const f = tile.feature;

    if (!VALID_FEATURES.has(f)) {
      invalidFeature++;
      return;
    }

    if (f === null) return;

    // No features on peaks
    if (tile.plot === PLOT.PEAK) {
      featureOnPeak++;
      return;
    }

    switch (f) {
      case FEATURE.FOREST:
        // Forest: land or hills, grassland/plains/tundra/snow
        if (tile.plot !== PLOT.LAND && tile.plot !== PLOT.HILLS) forestErrors++;
        else if (![TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.TUNDRA, TERRAIN.SNOW].includes(tile.terrain))
          forestErrors++;
        break;

      case FEATURE.JUNGLE:
        // Jungle: land or hills, grassland only (Civ4 rule)
        if (tile.plot !== PLOT.LAND && tile.plot !== PLOT.HILLS) jungleErrors++;
        else if (tile.terrain !== TERRAIN.GRASSLAND) jungleErrors++;
        break;

      case FEATURE.ICE:
        // Ice: only on water tiles
        if (tile.plot !== PLOT.OCEAN) iceErrors++;
        break;

      case FEATURE.OASIS:
        // Oasis: flat land, desert only
        if (tile.plot !== PLOT.LAND) oasisErrors++;
        else if (tile.terrain !== TERRAIN.DESERT) oasisErrors++;
        break;

      case FEATURE.FLOODPLAINS:
        // Floodplains: flat land, desert only
        if (tile.plot !== PLOT.LAND) floodplainsErrors++;
        else if (tile.terrain !== TERRAIN.DESERT) floodplainsErrors++;
        break;
    }
  });

  assert(invalidFeature === 0, `${mapType}: all features valid (${invalidFeature} invalid)`);
  assert(featureOnPeak === 0, `${mapType}: no features on peaks (${featureOnPeak})`);
  assert(forestErrors === 0, `${mapType}: forest placement valid (${forestErrors} errors)`);
  assert(jungleErrors === 0, `${mapType}: jungle placement valid (${jungleErrors} errors)`);
  assert(iceErrors === 0, `${mapType}: ice placement valid (${iceErrors} errors)`);
  assert(oasisErrors === 0, `${mapType}: oasis placement valid (${oasisErrors} errors)`);
  assert(floodplainsErrors === 0, `${mapType}: floodplains placement valid (${floodplainsErrors} errors)`);
}

reportResults('test-features');
