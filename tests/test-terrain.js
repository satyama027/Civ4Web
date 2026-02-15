/**
 * Test: Terrain Assignment Invariants
 * Validates terrain-plot compatibility rules from Civ4.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT, TERRAIN
} from './_test-utils.js';

const VALID_TERRAIN = new Set(Object.values(TERRAIN));
const WATER_TERRAIN = new Set([TERRAIN.OCEAN, TERRAIN.COAST]);
const LAND_TERRAIN = new Set([TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.DESERT, TERRAIN.TUNDRA, TERRAIN.SNOW]);

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);

  let invalidTerrain = 0;
  let waterOnLand = 0;
  let landOnWater = 0;
  let coastBoolErrors = 0;
  let coastOnLand = 0;
  const landTerrainSet = new Set();

  forEachTile(map, (tile, x, y) => {
    const t = tile.terrain;
    const plot = tile.plot;

    if (!VALID_TERRAIN.has(t)) {
      invalidTerrain++;
      return;
    }

    if (plot === PLOT.OCEAN) {
      // Water plot should have water terrain
      if (!WATER_TERRAIN.has(t)) landOnWater++;
    } else {
      // Land plot should have land terrain
      if (!LAND_TERRAIN.has(t)) waterOnLand++;
      landTerrainSet.add(t);
    }

    // Coast terrain only on PLOT.OCEAN
    if (t === TERRAIN.COAST && plot !== PLOT.OCEAN) coastOnLand++;

    // isCoast boolean consistency
    if (tile.isCoast !== (t === TERRAIN.COAST)) coastBoolErrors++;
  });

  assert(invalidTerrain === 0, `${mapType}: all terrain values valid (${invalidTerrain} invalid)`);
  assert(waterOnLand === 0, `${mapType}: no water terrain on land plots (${waterOnLand})`);
  assert(landOnWater === 0, `${mapType}: no land terrain on water plots (${landOnWater})`);
  assert(coastOnLand === 0, `${mapType}: no coast terrain on land plots (${coastOnLand})`);
  assert(coastBoolErrors === 0, `${mapType}: isCoast boolean consistent (${coastBoolErrors} errors)`);
  assert(landTerrainSet.size >= 2, `${mapType}: at least 2 distinct land terrain types (${landTerrainSet.size})`);
}

reportResults('test-terrain');
