/**
 * Test: World Wrap Behavior
 * Validates getTile() world-wrapping logic.
 */

import { generateTestMap, assert, reportResults } from './_test-utils.js';

console.log('\n--- World wrap tests ---');

const map = generateTestMap('continents');
const W = map.width;
const H = map.height;

// Pick a test Y in the middle of the map
const testY = Math.floor(H / 2);

// X wrapping: getTile(-1, y) should return same tile as getTile(W-1, y)
const tileNeg1 = map.getTile(-1, testY);
const tileWm1 = map.getTile(W - 1, testY);
assert(tileNeg1 !== null, 'getTile(-1, y) is not null (wraps)');
assert(tileNeg1.terrain === tileWm1.terrain && tileNeg1.plot === tileWm1.plot,
  'getTile(-1, y) matches getTile(W-1, y)');

// X wrapping: getTile(W, y) should return same tile as getTile(0, y)
const tileW = map.getTile(W, testY);
const tile0 = map.getTile(0, testY);
assert(tileW !== null, 'getTile(W, y) is not null (wraps)');
assert(tileW.terrain === tile0.terrain && tileW.plot === tile0.plot,
  'getTile(W, y) matches getTile(0, y)');

// X wrapping: large negative/positive values
const tileLargeNeg = map.getTile(-W - 1, testY);
assert(tileLargeNeg !== null && tileLargeNeg.terrain === tileWm1.terrain,
  'getTile(-W-1, y) wraps correctly');

const tileLargePos = map.getTile(2 * W + 1, testY);
const tile1 = map.getTile(1, testY);
assert(tileLargePos !== null && tileLargePos.terrain === tile1.terrain,
  'getTile(2*W+1, y) wraps correctly');

// Y does NOT wrap: returns null
assert(map.getTile(0, -1) === null, 'getTile(x, -1) returns null');
assert(map.getTile(0, H) === null, 'getTile(x, H) returns null');
assert(map.getTile(0, -100) === null, 'getTile(x, -100) returns null');
assert(map.getTile(0, H + 100) === null, 'getTile(x, H+100) returns null');

// ============================================================================
// Non-wrapping maps: Inland Sea, Oasis, Mirror (wrapX: false, wrapY: false)
// ============================================================================

console.log('\n--- Non-wrapping map tests ---');

for (const mapType of ['inland_sea', 'oasis', 'mirror']) {
  console.log(`\n  Testing ${mapType}...`);
  const nwMap = generateTestMap(mapType);
  const nwW = nwMap.width;
  const nwH = nwMap.height;
  const nwTestY = Math.floor(nwH / 2);
  const nwTestX = Math.floor(nwW / 2);

  // Verify settings
  assert(nwMap.settings.wrapX === false, `${mapType}: settings.wrapX === false`);
  assert(nwMap.settings.wrapY === false, `${mapType}: settings.wrapY === false`);

  // getTile: out-of-bounds X should return null (NOT wrap)
  assert(nwMap.getTile(-1, nwTestY) === null, `${mapType}: getTile(-1, y) returns null`);
  assert(nwMap.getTile(nwW, nwTestY) === null, `${mapType}: getTile(W, y) returns null`);
  assert(nwMap.getTile(-5, nwTestY) === null, `${mapType}: getTile(-5, y) returns null`);
  assert(nwMap.getTile(nwW + 5, nwTestY) === null, `${mapType}: getTile(W+5, y) returns null`);

  // getTile: out-of-bounds Y should return null
  assert(nwMap.getTile(nwTestX, -1) === null, `${mapType}: getTile(x, -1) returns null`);
  assert(nwMap.getTile(nwTestX, nwH) === null, `${mapType}: getTile(x, H) returns null`);

  // getElevation: out-of-bounds should return null
  assert(nwMap.getElevation(-1, nwTestY) === null, `${mapType}: getElevation(-1, y) returns null`);
  assert(nwMap.getElevation(nwW, nwTestY) === null, `${mapType}: getElevation(W, y) returns null`);
  assert(nwMap.getElevation(nwTestX, -1) === null, `${mapType}: getElevation(x, -1) returns null`);
  assert(nwMap.getElevation(nwTestX, nwH) === null, `${mapType}: getElevation(x, H) returns null`);

  // In-bounds should still work
  const inBoundsTile = nwMap.getTile(nwTestX, nwTestY);
  assert(inBoundsTile !== null, `${mapType}: getTile(midX, midY) returns a tile`);
  assert(inBoundsTile.terrain != null, `${mapType}: in-bounds tile has terrain`);

  const inBoundsElev = nwMap.getElevation(nwTestX, nwTestY);
  assert(inBoundsElev !== null, `${mapType}: getElevation(midX, midY) returns elevation`);
}

reportResults('test-wrapping');
