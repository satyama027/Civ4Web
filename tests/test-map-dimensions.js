/**
 * test-map-dimensions.js
 *
 * Verifies that each map type × world size produces the exact grid dimensions
 * documented in the original Civ4 BTS Python scripts.
 *
 * Reference:
 *   continents/fractal/archipelago — CIV4WorldInfo.xml default (no override)
 *   pangaea     — Pangaea.py    (8,5)→(26,16) × 4
 *   lakes       — Lakes.py      (6,4)→(21,13) × 4
 *   inland_sea  — Inland_Sea.py (6,4)→(21,13) × 4
 *   ice_age     — Ice_Age.py    (10,4)→(32,13) × 4  (wide, short)
 *   terra       — Terra.py      (13,8)→(38,24) × 4
 *   mirror      — Mirror.py     (6,4)→(21,13) × 4   (same as Lakes)
 *   oasis       — Oasis.py      (6,4)→(23,14) × 4
 *
 * 10 types × 6 sizes × 2 assertions (width + height) = 120 assertions.
 */

import { generateMap } from '../src/game/mapGenerator.js';
import { assert, reportResults } from './_test-utils.js';

// ---------------------------------------------------------------------------
// Expected dimensions table (from Python source files)
// ---------------------------------------------------------------------------

const EXPECTED = {
  continents: {
    duel:     { w: 40,  h: 24 },
    tiny:     { w: 52,  h: 32 },
    small:    { w: 64,  h: 40 },
    standard: { w: 84,  h: 52 },
    large:    { w: 104, h: 64 },
    huge:     { w: 128, h: 80 },
  },
  fractal: {
    duel:     { w: 40,  h: 24 },
    tiny:     { w: 52,  h: 32 },
    small:    { w: 64,  h: 40 },
    standard: { w: 84,  h: 52 },
    large:    { w: 104, h: 64 },
    huge:     { w: 128, h: 80 },
  },
  archipelago: {
    duel:     { w: 40,  h: 24 },
    tiny:     { w: 52,  h: 32 },
    small:    { w: 64,  h: 40 },
    standard: { w: 84,  h: 52 },
    large:    { w: 104, h: 64 },
    huge:     { w: 128, h: 80 },
  },
  pangaea: {
    duel:     { w: 32,  h: 20 },
    tiny:     { w: 40,  h: 24 },
    small:    { w: 52,  h: 32 },
    standard: { w: 64,  h: 40 },
    large:    { w: 84,  h: 52 },
    huge:     { w: 104, h: 64 },
  },
  lakes: {
    duel:     { w: 24,  h: 16 },
    tiny:     { w: 32,  h: 20 },
    small:    { w: 40,  h: 24 },
    standard: { w: 52,  h: 32 },
    large:    { w: 64,  h: 40 },
    huge:     { w: 84,  h: 52 },
  },
  inland_sea: {
    duel:     { w: 24,  h: 16 },
    tiny:     { w: 32,  h: 20 },
    small:    { w: 40,  h: 24 },
    standard: { w: 52,  h: 32 },
    large:    { w: 64,  h: 40 },
    huge:     { w: 84,  h: 52 },
  },
  ice_age: {
    duel:     { w: 40,  h: 16 },
    tiny:     { w: 52,  h: 20 },
    small:    { w: 64,  h: 28 },
    standard: { w: 84,  h: 36 },
    large:    { w: 104, h: 44 },
    huge:     { w: 128, h: 52 },
  },
  terra: {
    duel:     { w: 52,  h: 32 },
    tiny:     { w: 64,  h: 40 },
    small:    { w: 84,  h: 52 },
    standard: { w: 104, h: 64 },
    large:    { w: 128, h: 80 },
    huge:     { w: 152, h: 96 },
  },
  // Mirror.py uses Lakes-scale grid: (6,4)→(21,13) × 4
  mirror: {
    duel:     { w: 24,  h: 16 },
    tiny:     { w: 32,  h: 20 },
    small:    { w: 40,  h: 24 },
    standard: { w: 52,  h: 32 },
    large:    { w: 64,  h: 40 },
    huge:     { w: 84,  h: 52 },
  },
  // Oasis.py grid sections (6,4)→(23,14) × 4 = actual tile dimensions
  oasis: {
    duel:     { w: 24,  h: 16 },
    tiny:     { w: 32,  h: 20 },
    small:    { w: 40,  h: 24 },
    standard: { w: 56,  h: 36 },
    large:    { w: 72,  h: 44 },
    huge:     { w: 92,  h: 56 },
  },
};

const MAP_SIZES = ['duel', 'tiny', 'small', 'standard', 'large', 'huge'];

// ---------------------------------------------------------------------------
// Run assertions
// ---------------------------------------------------------------------------

let totalTests = 0;

for (const [mapType, sizeTable] of Object.entries(EXPECTED)) {
  console.log(`\n=== ${mapType} ===`);
  for (const mapSize of MAP_SIZES) {
    const exp = sizeTable[mapSize];
    const map = generateMap({
      mapType,
      mapSize,
      seed: 42,
      climate: 'temperate',
      seaLevel: 'medium',
      numPlayers: 2
    });

    const wOk = map.width  === exp.w;
    const hOk = map.height === exp.h;
    const tag = (wOk && hOk) ? '' : '  <-- FAIL';
    console.log(`  ${mapSize}: ${map.width}×${map.height} (expected ${exp.w}×${exp.h})${tag}`);

    assert(wOk, `${mapType}/${mapSize}: width  = ${exp.w} (got ${map.width})`);
    assert(hOk, `${mapType}/${mapSize}: height = ${exp.h} (got ${map.height})`);
    totalTests += 2;
  }
}

console.log(`\nTotal assertions: ${totalTests}`);
reportResults('test-map-dimensions');
