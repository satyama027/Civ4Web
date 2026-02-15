/**
 * Test: Map Output Structure
 * Validates the shape and types of generateMap() output for all 10 map types.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);

  // Required top-level fields
  assert(typeof map.width === 'number' && map.width > 0, `${mapType}: width is positive integer`);
  assert(typeof map.height === 'number' && map.height > 0, `${mapType}: height is positive integer`);
  assert(Number.isInteger(map.width) && Number.isInteger(map.height), `${mapType}: dimensions are integers`);
  assert(typeof map.seed === 'number', `${mapType}: seed exists`);
  assert(typeof map.settings === 'object' && map.settings !== null, `${mapType}: settings object exists`);

  // 2D arrays exist and have correct dimensions
  const arrays2D = ['plots', 'terrain', 'features', 'resources', 'rivers'];
  for (const field of arrays2D) {
    assert(Array.isArray(map[field]), `${mapType}: ${field} is array`);
    assert(map[field].length === map.height, `${mapType}: ${field} has ${map.height} rows`);
    if (map[field].length > 0) {
      assert(map[field][0].length === map.width, `${mapType}: ${field}[0] has ${map.width} cols`);
    }
  }

  // goodies may exist
  if (map.goodies) {
    assert(Array.isArray(map.goodies), `${mapType}: goodies is array`);
    assert(map.goodies.length === map.height, `${mapType}: goodies has correct rows`);
  }

  // startingLocations
  assert(Array.isArray(map.startingLocations), `${mapType}: startingLocations is array`);
  for (const loc of map.startingLocations) {
    assert(typeof loc.x === 'number' && typeof loc.y === 'number',
      `${mapType}: starting location has x,y`);
  }

  // getTile returns object with expected fields
  const tile = map.getTile(0, 0);
  assert(tile !== null && typeof tile === 'object', `${mapType}: getTile(0,0) returns object`);
  const expectedFields = ['x', 'y', 'plot', 'terrain', 'feature', 'resource',
    'isWater', 'isLand', 'isCoast', 'isHills', 'isPeak', 'hasRiver'];
  for (const f of expectedFields) {
    assert(f in tile, `${mapType}: getTile has field '${f}'`);
  }

  // getTile out-of-bounds Y returns null
  assert(map.getTile(0, -1) === null, `${mapType}: getTile(0,-1) is null`);
  assert(map.getTile(0, map.height) === null, `${mapType}: getTile(0,height) is null`);

  // getElevation returns valid values (legacy pipelines may return uppercase)
  const elev = map.getElevation(0, 0);
  const validElevations = ['flat', 'hills', 'peaks', 'FLAT', 'HILLS', 'PEAKS'];
  assert(validElevations.includes(elev), `${mapType}: getElevation returns valid value (got '${elev}')`);
}

reportResults('test-structure');
