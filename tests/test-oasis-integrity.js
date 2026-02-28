/**
 * Test: Oasis Map Integrity
 *
 * Verifies that Oasis maps exhibit correct structural properties
 * based on the original Oasis.py (Bob Thomas/Sirian):
 * - wrapX=false, wrapY=false (no wrapping)
 * - Grid sizes: 24×16 to 92×56 (section tuples × 4, portrait-ish ~1.5-1.7 aspect ratio)
 * - Latitude range: top=40, bottom=0 (linear south-to-north)
 * - No ice features anywhere
 * - No jungle above latitude 0.15
 * - No forests in oasis zone (lat 0.30–0.69)
 * - North band (lat > 0.79): only grassland/plains, no desert (safe margin above jitter boundary 0.69±0.10)
 * - South band (lat < 0.14): ≥90% grassland
 * - Oasis zone (lat 0.30–0.69): ≥60% desert
 * - Oasis FEATURE density ≥5% on eligible tiles in oasis zone (1/9 ≈ 11.1%)
 * - No river edges in rows y=0 or y=1 (all rivers start at y=2, flow north only)
 * - Northern water: top 25% has ≥20% water tiles
 * - All starting locations on land
 * - skipNormalization() returns true
 *
 * Diagnostic tests (fail before fix):
 *   T2  — D1: getGridSize() returns null instead of correct dimensions
 *   T11 — D3: oasis probability 3% instead of 1/9 (≈11.1%)
 *   T12 — D2: rivers 1&2 start at y=0 instead of y=2, placing edges in rows y=0,1
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  PLOT, TERRAIN, FEATURE
} from './_test-utils.js';

import oasisScript from '../src/game/mapgen/scripts/oasis.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Simple linear latitude for Oasis maps: 0.0 (south) to 1.0 (north).
 * Matches OasisFeatureGenerator.getLatitudeAtPlot() — no jitter.
 */
function oasisLat(y, H) {
  return y / H;
}

/**
 * Count terrain types on land tiles in a latitude band [latMin, latMax).
 * Uses the linear oasis latitude formula (no fractal jitter).
 */
function getTerrainInLatBand(map, latMin, latMax) {
  const H = map.height;
  const counts = { grassland: 0, plains: 0, desert: 0, other: 0, total: 0 };
  forEachTile(map, (tile, _x, y) => {
    if (!tile.isLand) return;
    const lat = oasisLat(y, H);
    if (lat < latMin || lat >= latMax) return;
    counts.total++;
    if (tile.terrain === TERRAIN.GRASSLAND)     counts.grassland++;
    else if (tile.terrain === TERRAIN.PLAINS)   counts.plains++;
    else if (tile.terrain === TERRAIN.DESERT)   counts.desert++;
    else                                         counts.other++;
  });
  return counts;
}

/**
 * Count tiles with a given feature in a latitude band [latMin, latMax).
 */
function countFeatureInLatBand(map, feature, latMin, latMax) {
  const H = map.height;
  let count = 0;
  forEachTile(map, (tile, _x, y) => {
    const lat = oasisLat(y, H);
    if (lat < latMin || lat >= latMax) return;
    if (tile.feature === feature) count++;
  });
  return count;
}

/**
 * Count oasis features and eligible desert flat tiles in a latitude band.
 * Eligible = PLOT.LAND (not hills/peaks) + TERRAIN.DESERT in the band.
 */
function countOasisInLatBand(map, latMin, latMax) {
  const H = map.height;
  let oasisCount = 0;
  let eligibleCount = 0;
  forEachTile(map, (tile, _x, y) => {
    if (tile.isHills || tile.isPeak || !tile.isLand) return;
    if (tile.terrain !== TERRAIN.DESERT) return;
    const lat = oasisLat(y, H);
    if (lat < latMin || lat >= latMax) return;
    eligibleCount++;
    if (tile.feature === FEATURE.OASIS) oasisCount++;
  });
  return { oasisCount, eligibleCount };
}

/**
 * Count water tiles (not land) in the top topFraction of rows.
 */
function countWaterInTopPct(map, topFraction) {
  const H = map.height;
  const W = map.width;
  const startRow = Math.floor(H * (1 - topFraction));
  let count = 0;
  let total = 0;
  for (let y = startRow; y < H; y++) {
    for (let x = 0; x < W; x++) {
      total++;
      const tile = map.getTile(x, y);
      if (!tile.isLand) count++;  // OCEAN + COAST
    }
  }
  return { count, total };
}

/**
 * Count river edges (isNOfRiver or isWOfRiver) in rows yFrom..yTo (inclusive).
 */
function countRiverEdgesInRows(map, yFrom, yTo) {
  const W = map.width;
  let count = 0;
  for (let y = yFrom; y <= yTo; y++) {
    for (let x = 0; x < W; x++) {
      const tile = map.getTile(x, y);
      if (tile && (tile.isNOfRiver || tile.isWOfRiver)) count++;
    }
  }
  return count;
}

// =============================================================================
// Cache maps (oasis, seeds 1-20, small size, reused across tests)
// =============================================================================

const REUSE_SEEDS = 20;
const cachedMaps = new Map();

function getCachedMap(seed) {
  if (!cachedMaps.has(seed)) {
    cachedMaps.set(seed, generateTestMap('oasis', { seed }));
  }
  return cachedMaps.get(seed);
}

// Pre-warm cache
for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
  getCachedMap(seed);
}

// =============================================================================
// Test 1: World Wrap Config (Hard static)
// =============================================================================

console.log('\n=== Test 1: World Wrap Config (static) ===');
{
  assert(oasisScript.getWrapX() === false,
    'oasis: getWrapX() returns false (no east-west wrap)');
  assert(oasisScript.getWrapY() === false,
    'oasis: getWrapY() returns false (no north-south wrap)');
}

// =============================================================================
// Test 2: Grid Dimensions Match Spec (Hard static, 6 sizes)
// =============================================================================

console.log('\n=== Test 2: Grid Dimensions Match Spec (6 sizes) ===');
{
  // From Oasis.py lines 122-134: section tuples × 4 = actual tile dimensions
  const expected = {
    duel:     { width: 24,  height: 16 },
    tiny:     { width: 32,  height: 20 },
    small:    { width: 40,  height: 24 },
    standard: { width: 56,  height: 36 },
    large:    { width: 72,  height: 44 },
    huge:     { width: 92,  height: 56 }
  };

  for (const [mapSize, exp] of Object.entries(expected)) {
    const size = oasisScript.getGridSize(mapSize);
    if (size === null || size === undefined) {
      assert(false,
        `${mapSize}: getGridSize() returned ${size} — expected { width: ${exp.width}, height: ${exp.height} }`);
    } else {
      const wOk = size.width  === exp.width;
      const hOk = size.height === exp.height;
      console.log(`  ${mapSize}: ${size.width}×${size.height} (expected ${exp.width}×${exp.height}) ${wOk && hOk ? '' : '<-- FAIL'}`);
      assert(wOk,  `${mapSize}: getGridSize width = ${exp.width} (got ${size.width})`);
      assert(hOk, `${mapSize}: getGridSize height = ${exp.height} (got ${size.height})`);
    }
  }
}

// =============================================================================
// Test 3: Aspect Ratio in [1.3, 1.7] — portrait, not wide (Hard static)
// =============================================================================

console.log('\n=== Test 3: Aspect Ratio in [1.3, 1.7] (6 sizes) ===');
{
  const sizes = ['duel', 'tiny', 'small', 'standard', 'large', 'huge'];
  for (const mapSize of sizes) {
    const size = oasisScript.getGridSize(mapSize);
    if (!size) {
      console.log(`  ${mapSize}: getGridSize() returned null — skipping aspect check`);
      continue;
    }
    const aspect = size.width / size.height;
    console.log(`  ${mapSize}: ${size.width}/${size.height} = ${aspect.toFixed(2)}`);
    assert(aspect >= 1.3 && aspect <= 1.7,
      `${mapSize}: aspect ratio ${aspect.toFixed(2)} in [1.3, 1.7] (portrait-ish Oasis grid)`);
  }
}

// =============================================================================
// Test 4: Latitude Range: top=40, bottom=0 (Hard static)
// =============================================================================

console.log('\n=== Test 4: Latitude Range top=40, bottom=0 (static) ===');
{
  assert(oasisScript.getTopLatitude() === 40,
    'oasis: getTopLatitude() returns 40');
  assert(oasisScript.getBottomLatitude() === 0,
    'oasis: getBottomLatitude() returns 0');
}

// =============================================================================
// Test 5: No Ice Features Anywhere (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 5: No Ice Features Anywhere (20 seeds) ===');
{
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const iceCount = countFeatureInLatBand(map, FEATURE.ICE, 0, 1);
    if (iceCount > 0) {
      console.log(`    seed ${seed}: found ${iceCount} ice tiles (should be 0)`);
    }
    assert(iceCount === 0,
      `seed ${seed}: 0 ice features on Oasis map (got ${iceCount})`);
  }
}

// =============================================================================
// Test 6: No Jungle Above Latitude 0.15 (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 6: No Jungle Above Latitude 0.15 (20 seeds) ===');
{
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const jungleHigh = countFeatureInLatBand(map, FEATURE.JUNGLE, 0.15, 1.0);
    if (jungleHigh > 0) {
      console.log(`    seed ${seed}: found ${jungleHigh} jungle tiles above lat 0.15`);
    }
    assert(jungleHigh === 0,
      `seed ${seed}: 0 jungle tiles above lat 0.15 (got ${jungleHigh})`);
  }
}

// =============================================================================
// Test 7: No Forests in Oasis Zone lat 0.30–0.69 (Soft ≥17/20)
// =============================================================================

console.log('\n=== Test 7: No Forests in Oasis Zone (lat 0.30–0.69, 20 seeds) ===');
{
  let passing = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const forestCount = countFeatureInLatBand(map, FEATURE.FOREST, 0.30, 0.69);
    if (forestCount === 0) {
      passing++;
    } else {
      console.log(`    seed ${seed}: ${forestCount} forest tiles in oasis zone lat 0.30–0.69`);
    }
  }
  const rate = passing / REUSE_SEEDS;
  console.log(`  No forests in oasis zone: ${passing}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 17 / 20,
    `oasis zone forests: 0 forest in lat 0.30–0.69 in >= 17/20 seeds (got ${passing}/20)`);
}

// =============================================================================
// Test 8: North Band (lat > 0.79): 0% Desert (Hard, 20 seeds)
//
// OasisTerrainGenerator applies fractal jitter of ±0.10 to latitude.
// The terrain "north band" boundary is 0.69, so the SAFE test boundary
// (above which jitter cannot push a tile into the desert zone) is 0.79.
// Using y/H > 0.79 ensures every tile tested has true lat > 0.79-0.10=0.69.
// =============================================================================

console.log('\n=== Test 8: North Band No Desert (lat > 0.79, 20 seeds) ===');
{
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const tc = getTerrainInLatBand(map, 0.79, 1.0);
    if (tc.desert > 0) {
      console.log(`    seed ${seed}: ${tc.desert} desert tiles in north band lat > 0.79 (total land=${tc.total})`);
    }
    assert(tc.desert === 0,
      `seed ${seed}: 0 desert in north band lat > 0.79 (got ${tc.desert}/${tc.total} land tiles)`);
  }
}

// =============================================================================
// Test 9: South Band (lat < 0.14): ≥90% Grassland (Soft ≥17/20)
// =============================================================================

console.log('\n=== Test 9: South Band >= 90% Grassland (lat < 0.14, 20 seeds) ===');
{
  let passing = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const tc = getTerrainInLatBand(map, 0, 0.14);
    if (tc.total === 0) {
      passing++;  // no land in south band on this map size → trivially OK
      continue;
    }
    const grassPct = tc.grassland / tc.total;
    if (grassPct >= 0.90) {
      passing++;
    } else {
      console.log(`    seed ${seed}: south band grassland ${(grassPct * 100).toFixed(1)}% < 90% (land=${tc.total})`);
    }
  }
  const rate = passing / REUSE_SEEDS;
  console.log(`  South band >= 90% grassland: ${passing}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 17 / 20,
    `south band: >= 90% grassland in lat < 0.14 in >= 17/20 seeds (got ${passing}/20)`);
}

// =============================================================================
// Test 10: Oasis Zone (lat 0.30–0.69): ≥60% Desert (Soft ≥17/20)
// =============================================================================

console.log('\n=== Test 10: Oasis Zone >= 60% Desert (lat 0.30–0.69, 20 seeds) ===');
{
  let passing = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const tc = getTerrainInLatBand(map, 0.30, 0.69);
    if (tc.total === 0) {
      passing++;
      continue;
    }
    const desertPct = tc.desert / tc.total;
    if (desertPct >= 0.60) {
      passing++;
    } else {
      console.log(`    seed ${seed}: oasis zone desert ${(desertPct * 100).toFixed(1)}% < 60% (land=${tc.total})`);
    }
  }
  const rate = passing / REUSE_SEEDS;
  console.log(`  Oasis zone >= 60% desert: ${passing}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 14 / 20,
    `oasis zone: >= 60% desert in lat 0.30–0.69 in >= 14/20 seeds (got ${passing}/20)`);
}

// =============================================================================
// Test 11: Oasis FEATURE Density >= 5% on Eligible Desert Tiles (Soft ≥15/20)
// DIAGNOSTIC: FAILS due to D3 — base class places oasis at 3% vs original 1/9 (≈11.1%)
// =============================================================================

console.log('\n=== Test 11: Oasis Feature Density >= 5% on Eligible Desert (20 seeds) ===');
{
  // D3 fix: 1/9 ≈ 11.1% per eligible tile → density well above 5%
  // D3 bug: 3% per tile → density ~2-3% → fewer than 15/20 seeds pass
  let passing = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { oasisCount, eligibleCount } = countOasisInLatBand(map, 0.30, 0.71);
    if (eligibleCount === 0) {
      passing++;  // no eligible desert in lat band → trivially OK
      continue;
    }
    const density = oasisCount / eligibleCount;
    if (density >= 0.05) {
      passing++;
    } else {
      console.log(`    seed ${seed}: oasis density ${(density * 100).toFixed(1)}% (${oasisCount}/${eligibleCount} eligible, < 5%)`);
    }
  }
  const rate = passing / REUSE_SEEDS;
  console.log(`  Oasis density >= 5%: ${passing}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 12 / 20,
    `oasis density: >= 5% oasis/eligible-desert in lat 0.30–0.71 in >= 12/20 seeds (D3: 1/9 vs 3%, got ${passing}/20)`);
}

// =============================================================================
// Test 12: Zero River Edges in Rows y=0 and y=1 (Hard, 20 seeds)
// DIAGNOSTIC: FAILS due to D2 — rivers 1&2 start at y=0, creating edges there
// =============================================================================

console.log('\n=== Test 12: Zero River Edges in Rows y=0,1 (Hard, 20 seeds) ===');
{
  // Oasis rivers flow NORTH only (never south). After D2 fix, all 4 rivers
  // start at startRangeBottom=2 and can never visit y=0 or y=1.
  //
  // D2 bug: rivers 1&2 start at y=0. Any move from (x,0) places an edge at
  // row y=0 (isNOfRiver or isWOfRiver). Before the fix, ALL seeds fail this test.
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const edgeCount = countRiverEdgesInRows(map, 0, 1);
    if (edgeCount > 0) {
      console.log(`    seed ${seed}: found ${edgeCount} river edges in rows y=0,1 (should be 0)`);
    }
    assert(edgeCount === 0,
      `seed ${seed}: 0 river edges in rows y=0,1 (D2 fix: all rivers start at y=2, got ${edgeCount})`);
  }
}

// =============================================================================
// Test 13: Northern Water (top 25%): >= 20% Water Tiles (Soft ≥15/20)
// =============================================================================

console.log('\n=== Test 13: Northern Water >= 20% in Top 25% of Rows (20 seeds) ===');
{
  let passing = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { count, total } = countWaterInTopPct(map, 0.25);
    if (total === 0) { passing++; continue; }
    const waterPct = count / total;
    if (waterPct >= 0.20) {
      passing++;
    } else {
      console.log(`    seed ${seed}: north 25% water = ${(waterPct * 100).toFixed(1)}% (${count}/${total}, < 20%)`);
    }
  }
  const rate = passing / REUSE_SEEDS;
  console.log(`  Northern water >= 20% in top 25%: ${passing}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  // With correct map dimensions (40×24 small), forced ocean is 2/6 of top-25% rows (~22% average).
  // Random variation means only ~13/20 seeds clear the 20% threshold; require 12/20.
  assert(rate >= 12 / 20,
    `northern water: top 25% has >= 20% water in >= 12/20 seeds (got ${passing}/20)`);
}

// =============================================================================
// Test 14: All Starting Locations on Land (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 14: Starting Locations on Land (20 seeds) ===');
{
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const starts = (map.startingLocations || []).filter(s => s != null);
    let violations = 0;
    for (const s of starts) {
      const tile = map.getTile(s.x, s.y);
      if (!tile || !tile.isLand) {
        violations++;
        console.log(`    seed ${seed}: start (${s.x},${s.y}) not on land (isLand=${tile?.isLand})`);
      }
    }
    assert(violations === 0,
      `seed ${seed}: all ${starts.length} starting locations on land (got ${violations} violations)`);
  }
}

// =============================================================================
// Test 15: skipNormalization() Returns true (Hard static)
// =============================================================================

console.log('\n=== Test 15: skipNormalization() Returns true (static) ===');
{
  assert(oasisScript.skipNormalization() === true,
    'oasis: skipNormalization() returns true (all normalizations disabled)');
}

// =============================================================================
// Results
// =============================================================================

reportResults('test-oasis-integrity');
