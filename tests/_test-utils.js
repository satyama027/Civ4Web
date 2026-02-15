/**
 * Shared test utilities for map generation tests.
 *
 * Provides: generateTestMap, forEachTile, assert, reportResults,
 * and re-exported constants from the map generator.
 */

import { generateMap, TERRAIN, FEATURE, ELEVATION } from '../src/game/mapGenerator.js';
import { PLOT } from '../src/game/mapgen/FractalWorld.js';

export { TERRAIN, FEATURE, ELEVATION, PLOT, generateMap };

const ALL_MAP_TYPES = [
  'continents', 'fractal', 'archipelago', 'pangaea', 'terra',
  'inland_sea', 'lakes', 'oasis', 'ice_age', 'mirror'
];

export { ALL_MAP_TYPES };

/**
 * Generate a map with sensible test defaults.
 * @param {string} mapType
 * @param {Object} overrides
 * @returns {Object} map data
 */
export function generateTestMap(mapType, overrides = {}) {
  return generateMap({
    mapType,
    mapSize: 'small',
    climate: 'temperate',
    seaLevel: 'medium',
    numPlayers: 4,
    seed: 42,
    ...overrides
  });
}

/**
 * Iterate every tile on the map.
 * @param {Object} map
 * @param {Function} callback - (tile, x, y) => void
 */
export function forEachTile(map, callback) {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      callback(map.getTile(x, y), x, y);
    }
  }
}

let _passed = 0;
let _failed = 0;
let _failures = [];

/**
 * Assert a condition. Logs PASS/FAIL and tracks results.
 * @param {boolean} condition
 * @param {string} message
 */
export function assert(condition, message) {
  if (condition) {
    _passed++;
    console.log(`  PASS: ${message}`);
  } else {
    _failed++;
    _failures.push(message);
    console.log(`  FAIL: ${message}`);
  }
}

/**
 * Print summary and exit with appropriate code.
 * @param {string} testName
 */
export function reportResults(testName) {
  console.log(`\n========================================`);
  console.log(`${testName}: ${_passed} passed, ${_failed} failed`);
  if (_failures.length > 0) {
    console.log(`Failures:`);
    for (const f of _failures) {
      console.log(`  - ${f}`);
    }
  }
  process.exit(_failed > 0 ? 1 : 0);
}
