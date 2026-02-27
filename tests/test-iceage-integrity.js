/**
 * Test: Ice Age Map Integrity
 *
 * Verifies that Ice Age maps exhibit the correct structural properties
 * based on the original Ice_Age.py (Sirian, Firaxis 2005):
 * - wrapX=true, wrapY=false (east-west wrap only)
 * - Extra-wide, short grid (aspect ratio >= 2.2 for all sizes)
 * - Edge rows (y=0, y=H-1) are all-ocean → always get FEATURE.ICE
 * - Significant total ice coverage (>= 12% of all tiles)
 * - Ice concentrated at polar quarters (>= 60% of all ice in top+bottom quarters)
 * - No jungle tiles (jungleLatitude=0.00)
 * - Land percentage in 28–42% range (water target 65%, bounds 60–72%)
 * - Snow/tundra more prevalent at poles than equator
 * - Plains-heavy terrain (iPlainsPercent=50 → >= 20% of land tiles)
 * - Desert-sparse terrain (iDesertPercent=20 → <= 15% of land tiles)
 * - Sea level shifts land percentage (low > high)
 * - All starting locations on land tiles
 * - Polar rows have much higher ice density than center rows
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  PLOT, TERRAIN, FEATURE
} from './_test-utils.js';

import iceAgeScript from '../src/game/mapgen/scripts/iceAge.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Count tiles with FEATURE.ICE.
 */
function countIceTiles(map) {
  let count = 0;
  forEachTile(map, tile => { if (tile.feature === FEATURE.ICE) count++; });
  return count;
}

/**
 * Count tiles with FEATURE.JUNGLE.
 */
function countJungleTiles(map) {
  let count = 0;
  forEachTile(map, tile => { if (tile.feature === FEATURE.JUNGLE) count++; });
  return count;
}

/**
 * Compute land percentage (LAND/HILLS/PEAK tiles / total tiles).
 */
function getLandPct(map) {
  let land = 0;
  const total = map.width * map.height;
  forEachTile(map, tile => { if (tile.isLand) land++; });
  return land / total;
}

/**
 * Count terrain types on land tiles. Returns { snow, tundra, plains, desert, other }.
 */
function getTerrainCounts(map) {
  const counts = { snow: 0, tundra: 0, plains: 0, desert: 0, other: 0, total: 0 };
  forEachTile(map, tile => {
    if (!tile.isLand) return;
    counts.total++;
    if (tile.terrain === TERRAIN.SNOW)    counts.snow++;
    else if (tile.terrain === TERRAIN.TUNDRA)  counts.tundra++;
    else if (tile.terrain === TERRAIN.PLAINS)  counts.plains++;
    else if (tile.terrain === TERRAIN.DESERT)  counts.desert++;
    else counts.other++;
  });
  return counts;
}

/**
 * For a given row band [rowStart, rowEnd), return ice count and ocean tile count.
 */
function getIceAndOceanInRows(map, rowStart, rowEnd) {
  let ice = 0;
  let ocean = 0;
  const W = map.width;
  for (let y = rowStart; y < rowEnd; y++) {
    for (let x = 0; x < W; x++) {
      const tile = map.getTile(x, y);
      if (tile.isWater) {
        ocean++;
        if (tile.feature === FEATURE.ICE) ice++;
      }
    }
  }
  return { ice, ocean };
}

// =============================================================================
// Cache maps (default ice_age, seeds 1-20, small size, for reuse across tests)
// =============================================================================

const REUSE_SEEDS = 20;
const cachedMaps = new Map();

function getCachedMap(seed) {
  if (!cachedMaps.has(seed)) {
    cachedMaps.set(seed, generateTestMap('ice_age', { seed }));
  }
  return cachedMaps.get(seed);
}

// Pre-warm cache before first test
for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
  getCachedMap(seed);
}

// =============================================================================
// Test 1: World Wrap Config (Hard Invariant, static)
// =============================================================================

console.log('\n=== Test 1: World Wrap Config (static) ===');
{
  // Ice Age wraps east-west (like standard maps) but not north-south (polar compression)
  assert(iceAgeScript.getWrapX() === true,
    'iceAge: getWrapX() returns true (east-west wrap)');
  assert(iceAgeScript.getWrapY() === false,
    'iceAge: getWrapY() returns false (no north-south wrap)');
}

// =============================================================================
// Test 2: Grid Dimensions Match Spec (Hard, all 6 sizes)
// =============================================================================

console.log('\n=== Test 2: Grid Dimensions Match Spec (6 sizes) ===');
{
  // From Ice_Age.py: [cols, rows] × 4 per size
  const expected = {
    duel:     { width: 40,  height: 16 },
    tiny:     { width: 52,  height: 20 },
    small:    { width: 64,  height: 28 },
    standard: { width: 84,  height: 36 },
    large:    { width: 104, height: 44 },
    huge:     { width: 128, height: 52 }
  };

  for (const [mapSize, exp] of Object.entries(expected)) {
    const size = iceAgeScript.getGridSize(mapSize);
    const wOk = size.width  === exp.width;
    const hOk = size.height === exp.height;
    console.log(`  ${mapSize}: ${size.width}×${size.height} (expected ${exp.width}×${exp.height}) ${wOk && hOk ? '' : '<-- FAIL'}`);
    assert(wOk,
      `${mapSize}: getGridSize width = ${exp.width} (got ${size.width})`);
    assert(hOk,
      `${mapSize}: getGridSize height = ${exp.height} (got ${size.height})`);
  }
}

// =============================================================================
// Test 3: High Aspect Ratio >= 2.2 (Hard, all 6 sizes)
// =============================================================================

console.log('\n=== Test 3: High Aspect Ratio >= 2.2 (6 sizes) ===');
{
  // Ice Age grids are deliberately extra-wide/short (aspect ratio ~2.29–2.60)
  const sizes = ['duel', 'tiny', 'small', 'standard', 'large', 'huge'];
  for (const mapSize of sizes) {
    const size = iceAgeScript.getGridSize(mapSize);
    const aspect = size.width / size.height;
    console.log(`  ${mapSize}: ${size.width}/${size.height} = ${aspect.toFixed(2)}`);
    assert(aspect >= 2.2,
      `${mapSize}: aspect ratio ${aspect.toFixed(2)} >= 2.2 (Ice Age extra-wide grid)`);
  }
}

// =============================================================================
// Test 4: Edge Rows Are All-Ocean → Always ICE (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 4: Edge Rows: Ocean Tiles Always Have ICE (20 seeds) ===');
{
  // iceAge addIceAtPlot: y===0 || y===H-1 && plotType===OCEAN → always FEATURE.ICE
  // polar=true in fractal init pushes water to edges, so these rows are nearly all ocean.
  let totalViolations = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const H = map.height;
    const W = map.width;
    let violations = 0;

    for (const y of [0, H - 1]) {
      for (let x = 0; x < W; x++) {
        const tile = map.getTile(x, y);
        // Only PLOT.OCEAN (isWater) gets edge-row ice — coast tiles are excluded
        if (tile.isWater && tile.feature !== FEATURE.ICE) {
          violations++;
          if (violations <= 3) {
            console.log(`    seed ${seed}: ocean tile (${x},${y}) on edge row missing ICE`);
          }
        }
      }
    }

    totalViolations += violations;
  }

  console.log(`  Edge-row ocean-without-ICE violations: ${totalViolations} across ${REUSE_SEEDS} seeds`);
  assert(totalViolations === 0,
    `ice edge rows: 0 ocean tiles on y=0/H-1 missing FEATURE.ICE across ${REUSE_SEEDS} seeds (got ${totalViolations})`);
}

// =============================================================================
// Test 5: Significant Total Ice Coverage >= 12% (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 5: Significant Total Ice Coverage >= 12% (20 seeds) ===');
{
  // Aggressive ice bands + edge rows → at least 12% of all tiles are ice
  let inRange = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const total = map.width * map.height;
    const icePct = countIceTiles(map) / total;
    if (icePct >= 0.12) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: ice coverage ${(icePct * 100).toFixed(1)}% < 12%`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  >= 12% ice coverage: ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 16 / 20,
    `ice coverage: >= 12% of all tiles are ice in >= 16/20 seeds (got ${inRange}/20)`);
}

// =============================================================================
// Test 6: Ice Concentrated at Poles — Top+Bottom Quarters >= 60% of All Ice (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 6: Ice Concentrated at Poles (top+bottom quarters >= 60%) (20 seeds) ===');
{
  // Polar ice bands dominate: most ice should be in top and bottom 25% of rows
  let polarConcentrated = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const H = map.height;
    const W = map.width;
    const quarterH = Math.floor(H / 4);

    let polarIce = 0;
    let totalIce = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = map.getTile(x, y);
        if (tile.feature === FEATURE.ICE) {
          totalIce++;
          if (y < quarterH || y >= H - quarterH) {
            polarIce++;
          }
        }
      }
    }

    if (totalIce === 0) {
      console.log(`    seed ${seed}: no ice tiles at all`);
      continue;
    }

    const polarFrac = polarIce / totalIce;
    if (polarFrac >= 0.60) {
      polarConcentrated++;
    } else {
      console.log(`    seed ${seed}: polar ice = ${(polarFrac * 100).toFixed(1)}% of total ice (< 60%)`);
    }
  }

  const rate = polarConcentrated / REUSE_SEEDS;
  console.log(`  Polar quarters >= 60% of ice: ${polarConcentrated}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 17 / 20,
    `polar ice concentration: top+bottom quarters >= 60% of all ice in >= 17/20 seeds (got ${polarConcentrated}/20)`);
}

// =============================================================================
// Test 7: No Jungle Features (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 7: No Jungle Features (20 seeds) ===');
{
  // IceAgeFeatureGenerator sets jungleLatitude=0.00 → ice age suppresses all jungle
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const jungleCount = countJungleTiles(map);
    if (jungleCount > 0) {
      console.log(`    seed ${seed}: found ${jungleCount} jungle tiles (should be 0)`);
    }
    assert(jungleCount === 0,
      `seed ${seed}: 0 jungle tiles (jungleLatitude=0.00 suppresses all jungle, got ${jungleCount})`);
  }
}

// =============================================================================
// Test 8: Land Percentage 28–42% (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 8: Land Percentage 28–42% (20 seeds) ===');
{
  // water_percent=65, seaLevelMin=60, seaLevelMax=72 → land ~28–40%
  let inRange = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const landPct = getLandPct(map) * 100;
    if (landPct >= 28 && landPct <= 42) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: land = ${landPct.toFixed(1)}% (outside 28–42%)`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  In range (28–42% land): ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 16 / 20,
    `land percentage: 28–42% land in >= 16/20 seeds (water_percent=65, bounds 60–72, got ${inRange}/20)`);
}

// =============================================================================
// Test 9: Snow/Tundra Higher at Poles Than Equator (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 9: Snow/Tundra Higher at Poles Than Equator (20 seeds) ===');
{
  // fSnowLatitude=0.4, fTundraLatitude=0.3 → cold terrain starts much closer to center
  // Top and bottom thirds should have significantly more snow/tundra than center third
  let polarColderCount = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const H = map.height;
    const W = map.width;
    const thirdH = Math.floor(H / 3);

    let poleLandTiles = 0;
    let poleColdTiles = 0;
    let centerLandTiles = 0;
    let centerColdTiles = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = map.getTile(x, y);
        if (!tile.isLand) continue;
        const isCold = tile.terrain === TERRAIN.SNOW || tile.terrain === TERRAIN.TUNDRA;
        if (y < thirdH || y >= H - thirdH) {
          poleLandTiles++;
          if (isCold) poleColdTiles++;
        } else {
          centerLandTiles++;
          if (isCold) centerColdTiles++;
        }
      }
    }

    const poleColdPct   = poleLandTiles   > 0 ? poleColdTiles   / poleLandTiles   : 0;
    const centerColdPct = centerLandTiles > 0 ? centerColdTiles / centerLandTiles : 0;

    if (poleColdPct > centerColdPct) {
      polarColderCount++;
    } else {
      console.log(`    seed ${seed}: polar cold ${(poleColdPct * 100).toFixed(1)}% <= center ${(centerColdPct * 100).toFixed(1)}%`);
    }
  }

  const rate = polarColderCount / REUSE_SEEDS;
  console.log(`  Polar snow/tundra > center: ${polarColderCount}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 16 / 20,
    `terrain gradient: snow+tundra% at poles > equator in >= 16/20 seeds (fSnowLat=0.4, fTundraLat=0.3, got ${polarColderCount}/20)`);
}

// =============================================================================
// Test 10: Plains >= 20% of Land Tiles (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 10: Plains >= 20% of Land Tiles (20 seeds) ===');
{
  // iPlainsPercent=50 (vs standard 30%) → unusually plains-heavy terrain
  let inRange = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const tc = getTerrainCounts(map);
    if (tc.total === 0) { console.log(`    seed ${seed}: no land tiles`); continue; }

    const plainsPct = tc.plains / tc.total;
    if (plainsPct >= 0.20) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: plains = ${(plainsPct * 100).toFixed(1)}% of land (< 20%)`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  Plains >= 20% of land: ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 15 / 20,
    `plains-heavy terrain: plains >= 20% of land tiles in >= 15/20 seeds (iPlainsPercent=50, got ${inRange}/20)`);
}

// =============================================================================
// Test 11: Desert <= 15% of Land Tiles (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 11: Desert <= 15% of Land Tiles (20 seeds) ===');
{
  // iDesertPercent=20 + fDesertTopLatitude=0.2 → much less desert than standard
  let inRange = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const tc = getTerrainCounts(map);
    if (tc.total === 0) { console.log(`    seed ${seed}: no land tiles`); continue; }

    const desertPct = tc.desert / tc.total;
    if (desertPct <= 0.15) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: desert = ${(desertPct * 100).toFixed(1)}% of land (> 15%)`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  Desert <= 15% of land: ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 16 / 20,
    `sparse desert: desert <= 15% of land tiles in >= 16/20 seeds (iDesertPercent=20 + compressed lat bands, got ${inRange}/20)`);
}

// =============================================================================
// Test 12: Sea Level Shifts Land Percentage (Soft, 5 seeds each)
// =============================================================================

console.log('\n=== Test 12: Sea Level Shifts Land Percentage (5 seeds each) ===');
{
  // seaLevelMin=60, seaLevelMax=72 → low sea level = more land, high = less land
  const SEEDS = 5;
  const lowLandPcts  = [];
  const highLandPcts = [];

  for (let seed = 1; seed <= SEEDS; seed++) {
    lowLandPcts.push(getLandPct(generateTestMap('ice_age', { seed, seaLevel: 'low' })));
    highLandPcts.push(getLandPct(generateTestMap('ice_age', { seed, seaLevel: 'high' })));
  }

  const avgLow  = lowLandPcts.reduce((a, b) => a + b, 0)  / SEEDS;
  const avgHigh = highLandPcts.reduce((a, b) => a + b, 0) / SEEDS;

  console.log(`  low sea level avg land:  ${(avgLow  * 100).toFixed(1)}%`);
  console.log(`  high sea level avg land: ${(avgHigh * 100).toFixed(1)}%`);
  console.log(`  low(${(avgLow * 100).toFixed(1)}%) > high(${(avgHigh * 100).toFixed(1)}%)?`);

  assert(avgLow > avgHigh,
    `sea level effect: low sea level produces more land than high (low=${(avgLow * 100).toFixed(1)}%, high=${(avgHigh * 100).toFixed(1)}%)`);
}

// =============================================================================
// Test 13: All Starting Locations on Land (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 13: All Starting Locations on Land (20 seeds) ===');
{
  // StartingPlots should never place a player on water, coast, or peaks
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
      `seed ${seed}: all ${starts.length} starting locations on land (got ${violations} off-land starts)`);
  }
}

// =============================================================================
// Test 14: Polar Rows Have Higher Ice Density Than Center Rows (Soft, 20 seeds)
// =============================================================================

console.log('\n=== Test 14: Polar Ice Density >> Center Ice Density (20 seeds) ===');
{
  // Polar quarter rows should have ice density at least 3× the center band density
  // (edge rows always ice + aggressive polar bands dominate)
  let polarDenseCount = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const H = map.height;
    const quarterH = Math.floor(H / 4);

    const topPolar    = getIceAndOceanInRows(map, 0, quarterH);
    const bottomPolar = getIceAndOceanInRows(map, H - quarterH, H);
    const center      = getIceAndOceanInRows(map, quarterH, H - quarterH);

    const polarOcean  = topPolar.ocean  + bottomPolar.ocean;
    const polarIce    = topPolar.ice    + bottomPolar.ice;
    const centerOcean = center.ocean;
    const centerIce   = center.ice;

    const polarDensity  = polarOcean  > 0 ? polarIce  / polarOcean  : 0;
    const centerDensity = centerOcean > 0 ? centerIce / centerOcean : 0;

    if (polarDensity > centerDensity * 3) {
      polarDenseCount++;
    } else {
      console.log(`    seed ${seed}: polar ice density ${(polarDensity * 100).toFixed(1)}% vs center ${(centerDensity * 100).toFixed(1)}% (ratio ${centerDensity > 0 ? (polarDensity / centerDensity).toFixed(1) : 'inf'}×)`);
    }
  }

  const rate = polarDenseCount / REUSE_SEEDS;
  console.log(`  Polar ice density > 3× center: ${polarDenseCount}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 17 / 20,
    `polar ice density: polar quarter ice density > 3× center band in >= 17/20 seeds (edge rows always ice + aggressive polar bands, got ${polarDenseCount}/20)`);
}

// =============================================================================
// Results
// =============================================================================

reportResults('test-iceage-integrity');
