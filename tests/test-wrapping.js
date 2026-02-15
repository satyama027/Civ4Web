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

reportResults('test-wrapping');
