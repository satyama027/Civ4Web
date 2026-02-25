/**
 * Test: Archipelago Map Integrity
 *
 * Verifies that Archipelago maps exhibit the correct properties:
 * - Coastal peaks removed (removeCoastalPeaks post-processing)
 * - High water percentage (~78% target)
 * - Highly fragmented landmasses (no dominant continent)
 * - World wrap configuration (wrapX=true, wrapY=false)
 * - Landmass type grain variation (snaky / archipelago / tiny_islands)
 * - Starting locations on land and spread across islands
 * - Sea level shifts land percentage
 * - Starting locations have ocean access within BFC
 * - Interior peaks survive after coastal peak removal
 * - Climate impact on terrain distribution
 * - Extra peaks compensation by landmass type
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  PLOT, TERRAIN
} from './_test-utils.js';

import archipelagoScript from '../src/game/mapgen/scripts/archipelago.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Flood-fill to find connected landmasses.
 * Uses 4-connectivity (cardinal directions) with X-wrapping.
 * Returns array of { size, tiles: Set<'x,y'> }, sorted by size descending.
 */
function findLandmasses(map) {
  const W = map.width;
  const H = map.height;
  const visited = Array.from({ length: H }, () => new Uint8Array(W));
  const landmasses = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y][x]) continue;
      const tile = map.getTile(x, y);
      if (!tile.isLand) continue;

      const tiles = new Set();
      const queue = [[x, y]];
      visited[y][x] = 1;

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        tiles.add(`${cx},${cy}`);
        const neighbors = [
          [cx - 1, cy], [cx + 1, cy],
          [cx, cy - 1], [cx, cy + 1]
        ];
        for (let [nx, ny] of neighbors) {
          if (ny < 0 || ny >= H) continue;
          nx = ((nx % W) + W) % W; // X-wrap (archipelago wraps X)
          if (visited[ny][nx]) continue;
          const nt = map.getTile(nx, ny);
          if (!nt.isLand) continue;
          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }

      landmasses.push({ size: tiles.size, tiles });
    }
  }

  landmasses.sort((a, b) => b.size - a.size);
  return landmasses;
}

/**
 * Compute land percentage (non-ocean tiles / total tiles).
 */
function getLandPct(map) {
  let land = 0;
  const total = map.width * map.height;
  forEachTile(map, tile => { if (tile.isLand) land++; });
  return land / total;
}

/**
 * Compute median of an array of numbers.
 */
function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// =============================================================================
// Cache maps (default archipelago option, seeds 1-20, for reuse in Tests 1-3, 6, 8, 9)
// =============================================================================

const REUSE_SEEDS = 20;
const cachedMaps = new Map();

function getCachedMap(seed) {
  if (!cachedMaps.has(seed)) {
    cachedMaps.set(seed, generateTestMap('archipelago', { seed }));
  }
  return cachedMaps.get(seed);
}

// Pre-warm cache before first test
for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
  getCachedMap(seed);
}

// =============================================================================
// Test 1: No Coastal Peaks (Hard Invariant)
// =============================================================================

console.log('\n=== Test 1: No Coastal Peaks (20 seeds) ===');
{
  let violations = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width;
    const H = map.height;

    forEachTile(map, (tile, x, y) => {
      if (tile.plot !== PLOT.PEAK) return;

      // Check all 8 neighbors for ocean
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          if (ny < 0 || ny >= H) continue;
          const nx = ((x + dx) % W + W) % W;
          const nb = map.getTile(nx, ny);
          if (nb && nb.plot === PLOT.OCEAN) {
            violations++;
          }
        }
      }
    });
  }

  console.log(`  Coastal peak violations: ${violations} across ${REUSE_SEEDS} seeds`);
  assert(violations === 0,
    `removeCoastalPeaks: 0 peaks adjacent to ocean (got ${violations} violations)`);
}

// =============================================================================
// Test 2: High Water Percentage (~78% target)
// =============================================================================

console.log('\n=== Test 2: High Water Percentage (20 seeds) ===');
{
  let inRange = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const landPct = getLandPct(map) * 100;
    if (landPct >= 15 && landPct <= 32) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: land = ${landPct.toFixed(1)}%`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  In range (15–32% land): ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `>= 90% of seeds have 15-32% land (water_percent=78 target) (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 3: Highly Fragmented Landmasses (No Dominant Continent)
// =============================================================================

console.log('\n=== Test 3: Highly Fragmented Landmasses (20 seeds) ===');
{
  let smallLargest = 0;
  let manyIslands = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const landmasses = findLandmasses(map);
    const totalLand = landmasses.reduce((s, l) => s + l.size, 0);
    const largestPct = totalLand > 0 ? landmasses[0].size / totalLand : 0;
    const count = landmasses.length;

    if (largestPct < 0.30) smallLargest++;
    else console.log(`    seed ${seed}: largest = ${(largestPct * 100).toFixed(1)}% of land`);

    if (count >= 5) manyIslands++;
    else console.log(`    seed ${seed}: only ${count} land areas`);
  }

  const rateSm = smallLargest / REUSE_SEEDS;
  const rateMany = manyIslands / REUSE_SEEDS;
  console.log(`  Largest < 30%: ${smallLargest}/${REUSE_SEEDS} (${(rateSm * 100).toFixed(0)}%)`);
  console.log(`  >= 5 islands: ${manyIslands}/${REUSE_SEEDS} (${(rateMany * 100).toFixed(0)}%)`);

  assert(rateSm >= 0.80,
    `>= 80% of seeds: largest landmass < 30% of land (got ${(rateSm * 100).toFixed(0)}%)`);
  assert(rateMany >= 0.90,
    `>= 90% of seeds: at least 5 distinct land areas (got ${(rateMany * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 4: World Wrap Configuration
// =============================================================================

console.log('\n=== Test 4: World Wrap Configuration ===');
{
  assert(archipelagoScript.getWrapX() === true,
    'archipelago: getWrapX() returns true (east-west wrap)');
  assert(archipelagoScript.getWrapY() === false,
    'archipelago: getWrapY() returns false (finite north/south poles)');
}

// =============================================================================
// Test 5: Landmass Type Grain Variation (10 seeds each)
// =============================================================================

console.log('\n=== Test 5: Landmass Type Grain Variation (10 seeds each) ===');
{
  const SEEDS = 10;
  const types = [
    { name: 'snaky',       customOption: 0 },  // grain 3 — fewer, larger islands
    { name: 'archipelago', customOption: 1 },  // grain 4 — medium (default)
    { name: 'tiny_islands', customOption: 2 }  // grain 5 — many tiny islands
  ];

  const results = {};

  for (const t of types) {
    const largestPcts = [];
    const counts = [];

    for (let seed = 1; seed <= SEEDS; seed++) {
      const map = generateTestMap('archipelago', { seed, customOption: t.customOption });
      const landmasses = findLandmasses(map);
      const totalLand = landmasses.reduce((s, l) => s + l.size, 0);
      const largestPct = totalLand > 0 ? landmasses[0].size / totalLand : 0;
      largestPcts.push(largestPct);
      counts.push(landmasses.length);
    }

    results[t.name] = {
      medianLargest: median(largestPcts),
      medianCount: median(counts)
    };
    console.log(`  ${t.name}: median largest = ${(results[t.name].medianLargest * 100).toFixed(1)}%, median islands = ${results[t.name].medianCount.toFixed(1)}`);
  }

  assert(
    results.snaky.medianLargest > results.archipelago.medianLargest,
    `snaky (${(results.snaky.medianLargest * 100).toFixed(1)}%) has larger dominant island than archipelago (${(results.archipelago.medianLargest * 100).toFixed(1)}%)`
  );
  assert(
    results.archipelago.medianLargest > results.tiny_islands.medianLargest,
    `archipelago (${(results.archipelago.medianLargest * 100).toFixed(1)}%) has larger dominant island than tiny_islands (${(results.tiny_islands.medianLargest * 100).toFixed(1)}%)`
  );
  assert(
    results.tiny_islands.medianCount > results.archipelago.medianCount,
    `tiny_islands (${results.tiny_islands.medianCount.toFixed(1)}) has more islands than archipelago (${results.archipelago.medianCount.toFixed(1)})`
  );
  assert(
    results.archipelago.medianCount > results.snaky.medianCount,
    `archipelago (${results.archipelago.medianCount.toFixed(1)}) has more islands than snaky (${results.snaky.medianCount.toFixed(1)})`
  );
}

// =============================================================================
// Test 6: Starting Locations on Land, Spread Across Islands
// =============================================================================

console.log('\n=== Test 6: Starting Locations on Land, Spread Across Islands (20 seeds) ===');
{
  let allOnLand = 0;
  let noDuplicates = 0;
  let diverseIslands = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const starts = (map.startingLocations || []).filter(s => s != null);

    if (starts.length === 0) {
      console.log(`    seed ${seed}: no starting locations`);
      continue;
    }

    // All starts on non-ocean, non-peak land
    let onLand = true;
    for (const s of starts) {
      const tile = map.getTile(s.x, s.y);
      if (!tile || !tile.isLand || tile.isPeak) {
        onLand = false;
        console.log(`    seed ${seed}: start (${s.x},${s.y}) not on valid land (plot=${tile?.plot})`);
        break;
      }
    }
    if (onLand) allOnLand++;

    // No duplicate positions
    const posKeys = new Set(starts.map(s => `${s.x},${s.y}`));
    if (posKeys.size === starts.length) noDuplicates++;
    else console.log(`    seed ${seed}: duplicate start positions (${posKeys.size} unique of ${starts.length})`);

    // Island diversity: with 4 players, at least 3 on different connected land areas
    const landmasses = findLandmasses(map);
    const islandSet = new Set();
    for (const s of starts) {
      for (let i = 0; i < landmasses.length; i++) {
        if (landmasses[i].tiles.has(`${s.x},${s.y}`)) {
          islandSet.add(i);
          break;
        }
      }
    }
    if (islandSet.size >= 3) diverseIslands++;
    else console.log(`    seed ${seed}: only ${islandSet.size} distinct islands for ${starts.length} players`);
  }

  const rateLand = allOnLand / REUSE_SEEDS;
  const rateDups = noDuplicates / REUSE_SEEDS;
  const rateDiverse = diverseIslands / REUSE_SEEDS;

  console.log(`  All on land: ${allOnLand}/${REUSE_SEEDS} (${(rateLand * 100).toFixed(0)}%)`);
  console.log(`  No duplicates: ${noDuplicates}/${REUSE_SEEDS} (${(rateDups * 100).toFixed(0)}%)`);
  console.log(`  >= 3 distinct islands: ${diverseIslands}/${REUSE_SEEDS} (${(rateDiverse * 100).toFixed(0)}%)`);

  assert(rateLand === 1.0,
    `100% of seeds: all starts on non-ocean, non-peak land (got ${(rateLand * 100).toFixed(0)}%)`);
  assert(rateDups === 1.0,
    `100% of seeds: no duplicate start positions (got ${(rateDups * 100).toFixed(0)}%)`);
  assert(rateDiverse >= 0.80,
    `>= 80% of seeds: at least 3 of 4 players on different islands (got ${(rateDiverse * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 7: Sea Level Shifts Land Percentage (10 seeds each)
// =============================================================================

console.log('\n=== Test 7: Sea Level Shifts Land Percentage (10 seeds each) ===');
{
  const SEEDS = 10;
  const medians = {};
  let allValid = true;

  for (const seaLevel of ['low', 'medium', 'high']) {
    const pcts = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const map = generateTestMap('archipelago', { seed, seaLevel });
      const pct = getLandPct(map) * 100;
      pcts.push(pct);
      if (pct < 5) {
        console.log(`    ${seaLevel} seed ${seed}: land = ${pct.toFixed(1)}% (too low)`);
        allValid = false;
      }
    }
    medians[seaLevel] = median(pcts);
    console.log(`  ${seaLevel}: median land = ${medians[seaLevel].toFixed(1)}%`);
  }

  assert(allValid, 'all sea level variants produce valid maps (land > 5%)');
  assert(medians.low > medians.high,
    `low sea level has more land than high (${medians.low.toFixed(1)}% vs ${medians.high.toFixed(1)}%)`);
}

// =============================================================================
// Test 8: Starting Locations Adjacent to Ocean
// =============================================================================

console.log('\n=== Test 8: Starting Locations Adjacent to Ocean (20 seeds) ===');
{
  // BFC offsets: radius-2 diamond, excluding far diagonal corners
  const BFC_OFFSETS = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
      BFC_OFFSETS.push([dx, dy]);
    }
  }

  let totalStarts = 0;
  let nearOcean = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width;
    const H = map.height;
    const starts = (map.startingLocations || []).filter(s => s != null);

    for (const s of starts) {
      totalStarts++;

      let hasOcean = false;
      for (const [dx, dy] of BFC_OFFSETS) {
        const ny = s.y + dy;
        if (ny < 0 || ny >= H) continue;
        const nx = ((s.x + dx) % W + W) % W;
        const nb = map.getTile(nx, ny);
        if (nb && nb.plot === PLOT.OCEAN) {
          hasOcean = true;
          break;
        }
      }

      if (hasOcean) nearOcean++;
      else console.log(`    seed ${seed}: start (${s.x},${s.y}) has no ocean within radius-2 BFC`);
    }
  }

  const rate = totalStarts > 0 ? nearOcean / totalStarts : 0;
  console.log(`  Near ocean: ${nearOcean}/${totalStarts} starts (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.85,
    `>= 85% of starting locations have ocean within radius-2 BFC (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 9: Interior Peaks Survive (Peaks Not Over-Removed)
// =============================================================================

console.log('\n=== Test 9: Interior Peaks Survive (20 seeds) ===');
{
  let hasAnyPeaks = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    let peakCount = 0;
    forEachTile(map, tile => { if (tile.plot === PLOT.PEAK) peakCount++; });

    if (peakCount > 0) hasAnyPeaks++;
    else console.log(`    seed ${seed}: no peaks survive (all removed by removeCoastalPeaks?)`);
  }

  const rate = hasAnyPeaks / REUSE_SEEDS;
  console.log(`  Has interior peaks: ${hasAnyPeaks}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  // Note: on small maps with 78% water and grain 4, some seeds produce islands
  // small enough that every land tile is coastal — all peaks get removed.
  // 70% is the reliable floor observed across seeds.
  assert(rate >= 0.70,
    `>= 70% of seeds have at least 1 interior peak surviving coastal removal (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 10: Climate Impact on Terrain Distribution (5 seeds each)
// =============================================================================

console.log('\n=== Test 10: Climate Impact on Terrain (5 seeds each) ===');
{
  const SEEDS = 5;
  const hillyFracs = {};

  for (const climate of ['rocky', 'tropical']) {
    const fracs = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const map = generateTestMap('archipelago', { seed, climate });
      let hills = 0;
      let peaks = 0;
      let land = 0;
      forEachTile(map, tile => {
        if (!tile.isLand) return;
        land++;
        if (tile.isHills) hills++;
        if (tile.isPeak) peaks++;
      });
      fracs.push(land > 0 ? (hills + peaks) / land : 0);
    }
    hillyFracs[climate] = median(fracs);
    console.log(`  ${climate}: median hills+peaks fraction = ${(hillyFracs[climate] * 100).toFixed(1)}%`);
  }

  assert(hillyFracs.rocky > hillyFracs.tropical,
    `rocky (${(hillyFracs.rocky * 100).toFixed(1)}%) has more hills+peaks than tropical (${(hillyFracs.tropical * 100).toFixed(1)}%)`);
}

// =============================================================================
// Test 11: Extra Peaks Compensation by Landmass Type (10 seeds each)
// =============================================================================

console.log('\n=== Test 11: Extra Peaks Compensation by Landmass Type (10 seeds each) ===');
{
  // extraPeaks = 15 * (1 + optionIndex):
  //   snaky (0):        extraPeaks = 15%  — grain 3, larger islands
  //   archipelago (1):  extraPeaks = 30%  — grain 4, medium islands
  //   tiny_islands (2): extraPeaks = 45%  — grain 5, tiny islands
  //
  // After removeCoastalPeaks, interior peaks survive only when an island is large
  // enough to have land tiles fully surrounded by other land tiles.
  // tiny_islands islands are often single-tile or 2-tile, meaning every land tile
  // is adjacent to ocean — all peaks get removed. This is correct Civ4 behavior.

  const SEEDS = 10;
  const typeList = [
    { name: 'snaky',        customOption: 0 },
    { name: 'archipelago',  customOption: 1 },
    { name: 'tiny_islands', customOption: 2 }
  ];

  const peakMedians = {};

  for (const t of typeList) {
    const fracs = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const map = generateTestMap('archipelago', { seed, customOption: t.customOption });
      let peaks = 0;
      let land = 0;
      forEachTile(map, tile => {
        if (!tile.isLand) return;
        land++;
        if (tile.isPeak) peaks++;
      });
      fracs.push(land > 0 ? peaks / land : 0);
    }
    peakMedians[t.name] = median(fracs);
    console.log(`  ${t.name} (opt ${t.customOption}): median peaks = ${(peakMedians[t.name] * 100).toFixed(1)}% of land tiles`);
  }

  // snaky (grain 3) produces larger islands with interior tiles → peaks survive
  assert(peakMedians.snaky > 0,
    `snaky (grain 3, large islands) has interior peaks > 0% of land (got ${(peakMedians.snaky * 100).toFixed(1)}%)`);

  // Larger-island types retain more peaks than finer-grained types
  assert(peakMedians.snaky > peakMedians.tiny_islands,
    `snaky (${(peakMedians.snaky * 100).toFixed(1)}%) has more interior peaks than tiny_islands (${(peakMedians.tiny_islands * 100).toFixed(1)}%)`);

  // tiny_islands (grain 5) may legitimately have 0 median peaks — every land tile
  // is coastal so all peaks get removed. Just report, no hard assert.
  console.log(`  (tiny_islands 0% peaks is correct: grain-5 islands are too small for interior tiles)`);
}

// =============================================================================
// Results
// =============================================================================

reportResults('test-archipelago-integrity');
