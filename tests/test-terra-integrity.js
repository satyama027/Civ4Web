/**
 * Test: Terra Map Integrity
 *
 * Verifies that Terra maps implement the Old World / New World mechanic:
 * - All players start on the largest connected landmass (Old World)
 * - Old World is dominant (≥35% of land)
 * - New World exists as a non-trivial secondary landmass
 * - The two worlds are separated by ocean
 * - Grid dimensions match Terra.py's enlarged sizes
 * - Sea level affects land quantity monotonically
 * - Old World constraint holds across all map sizes
 */

import {
  generateTestMap, assert, reportResults,
  PLOT
} from './_test-utils.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Flood-fill to find connected landmasses.
 * Uses 4-connectivity (cardinal directions) with X-wrapping (terra wraps X).
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
          nx = ((nx % W) + W) % W; // X-wrap (terra always wraps X)

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
 * Compute land stats for a map.
 */
function getLandStats(map) {
  const landmasses = findLandmasses(map);
  const totalLand = landmasses.reduce((s, l) => s + l.size, 0);
  const totalTiles = map.width * map.height;
  const landPct = totalTiles > 0 ? totalLand / totalTiles : 0;
  return { landmasses, totalLand, totalTiles, landPct };
}

/**
 * Measure minimum ocean separation (in tiles) between two landmasses.
 * Scans each row, finding the minimum gap between any pair of columns,
 * accounting for X-wrap.
 */
function measureOceanGap(map, lm1, lm2) {
  const W = map.width;
  const H = map.height;
  let minGap = Infinity;

  for (let y = 0; y < H; y++) {
    const cols1 = [];
    const cols2 = [];
    for (let x = 0; x < W; x++) {
      const key = `${x},${y}`;
      if (lm1.tiles.has(key)) cols1.push(x);
      if (lm2.tiles.has(key)) cols2.push(x);
    }

    if (cols1.length === 0 || cols2.length === 0) continue;

    for (const c1 of cols1) {
      for (const c2 of cols2) {
        const directDist = Math.abs(c1 - c2);
        const wrapDist = W - directDist;
        const gap = Math.min(directDist, wrapDist) - 1; // subtract 1: gap is between tiles
        if (gap < minGap) minGap = gap;
      }
    }
  }

  return minGap === Infinity ? -1 : minGap;
}

// =============================================================================
// Cache — 20 maps at small size, seeds 1–20, reused in Tests 2–5
// =============================================================================

const REUSE_SEEDS = 20;
const cachedMaps = new Map();

function getCachedMap(seed) {
  if (!cachedMaps.has(seed)) {
    cachedMaps.set(seed, generateTestMap('terra', { seed, numPlayers: 4 }));
  }
  return cachedMaps.get(seed);
}

// =============================================================================
// Test 1: Starting Locations on Old World Only (20 seeds, 100% required)
// =============================================================================

console.log('\n=== Test 1: Starting Locations on Old World Only (20 seeds) ===');
{
  // Pre-cache maps for seeds 1–20 (reused in Tests 2–5)
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    getCachedMap(seed);
  }

  let allOnOldWorld = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landmasses } = getLandStats(map);

    if (landmasses.length === 0) {
      console.log(`    seed ${seed}: no landmasses found`);
      continue;
    }

    const oldWorld = landmasses[0]; // biggest = Old World
    const starts = map.startingLocations || [];

    if (starts.length === 0) {
      console.log(`    seed ${seed}: no starting locations`);
      continue;
    }

    let allOnOldWorldThisSeed = true;
    for (const start of starts) {
      const key = `${start.x},${start.y}`;
      if (!oldWorld.tiles.has(key)) {
        allOnOldWorldThisSeed = false;
        console.log(`    seed ${seed}: start (${start.x},${start.y}) NOT on Old World`);
        break;
      }
    }
    if (allOnOldWorldThisSeed) allOnOldWorld++;
  }

  const rate = allOnOldWorld / REUSE_SEEDS;
  console.log(`  All starts on Old World: ${allOnOldWorld}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 1.0,
    `all starting locations on Old World: 100% of seeds required (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 2: Old World Dominance — Largest Landmass (20 cached seeds)
// =============================================================================

console.log('\n=== Test 2: Old World Dominance — Largest Landmass >= 35% of Land (20 seeds) ===');
{
  let passed = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landmasses, totalLand } = getLandStats(map);

    if (landmasses.length === 0 || totalLand === 0) {
      console.log(`    seed ${seed}: no land tiles`);
      continue;
    }

    const largestPct = landmasses[0].size / totalLand;
    if (largestPct >= 0.35) {
      passed++;
    } else {
      console.log(`    seed ${seed}: largest = ${(largestPct * 100).toFixed(1)}% (< 35%)`);
    }
  }

  const rate = passed / REUSE_SEEDS;
  console.log(`  Passed: ${passed}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `Old World dominance: >= 90% of seeds have largest landmass >= 35% of land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 3: New World Exists as Non-trivial Secondary Landmass (20 cached seeds)
// =============================================================================

console.log('\n=== Test 3: New World Exists — Second Landmass >= 5% of Land (20 seeds) ===');
{
  let passed = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landmasses, totalLand } = getLandStats(map);

    if (landmasses.length < 2 || totalLand === 0) {
      console.log(`    seed ${seed}: fewer than 2 landmasses`);
      continue;
    }

    const secondPct = landmasses[1].size / totalLand;
    if (secondPct >= 0.05) {
      passed++;
    } else {
      console.log(`    seed ${seed}: 2nd landmass = ${(secondPct * 100).toFixed(1)}% (< 5%)`);
    }
  }

  const rate = passed / REUSE_SEEDS;
  console.log(`  Passed: ${passed}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.85,
    `New World exists: >= 85% of seeds have second landmass >= 5% of land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 4: Old/New World Ocean Separation (20 cached seeds)
// =============================================================================

console.log('\n=== Test 4: Old/New World Ocean Separation >= 2 Tiles (20 seeds) ===');
{
  let passed = 0;
  let tested = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landmasses } = getLandStats(map);

    if (landmasses.length < 2) {
      console.log(`    seed ${seed}: fewer than 2 landmasses, skipping`);
      continue;
    }

    tested++;
    const gap = measureOceanGap(map, landmasses[0], landmasses[1]);
    if (gap >= 2) {
      passed++;
    } else {
      console.log(`    seed ${seed}: ocean gap = ${gap} tiles (< 2)`);
    }
  }

  const rate = tested > 0 ? passed / tested : 0;
  console.log(`  Gap >= 2: ${passed}/${tested} valid seeds (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.80,
    `Old/New World separation: >= 80% of valid seeds have ocean gap >= 2 tiles (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 5: Land Percentage in Expected Range (20 cached seeds)
// =============================================================================

console.log('\n=== Test 5: Land Percentage 20–55% (20 seeds) ===');
{
  let inRange = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landPct } = getLandStats(map);
    const pct = landPct * 100;

    if (pct >= 20 && pct <= 55) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: land = ${pct.toFixed(1)}%`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  In range (20–55%): ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `land percentage: >= 90% of seeds have 20–55% land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 6: Terra Grid Dimensions Match Specification (all 6 map sizes)
// =============================================================================

console.log('\n=== Test 6: Grid Dimensions Match Terra Specification (6 sizes) ===');
{
  const expected = {
    duel:     { width: 52,  height: 32 },
    tiny:     { width: 64,  height: 40 },
    small:    { width: 84,  height: 52 },
    standard: { width: 104, height: 64 },
    large:    { width: 128, height: 80 },
    huge:     { width: 152, height: 96 }
  };

  for (const [mapSize, exp] of Object.entries(expected)) {
    const map = generateTestMap('terra', { mapSize, numPlayers: 2 });
    const wOk = map.width === exp.width;
    const hOk = map.height === exp.height;
    console.log(`  ${mapSize}: ${map.width}×${map.height} (expected ${exp.width}×${exp.height}) ${wOk && hOk ? '' : '<-- FAIL'}`);
    assert(wOk,
      `${mapSize}: map width = ${exp.width} (got ${map.width})`);
    assert(hOk,
      `${mapSize}: map height = ${exp.height} (got ${map.height})`);
  }
}

// =============================================================================
// Test 7: Sea Level Effect on Land Quantity (3 levels × 5 seeds)
// =============================================================================

console.log('\n=== Test 7: Sea Level Effect on Land Quantity (3 levels × 5 seeds) ===');
{
  const seaLevels = ['low', 'medium', 'high'];
  const avgLand = {};
  let startsOnOldWorldAll = 0;
  let startsTotal = 0;

  for (const seaLevel of seaLevels) {
    let totalLandPct = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const map = generateTestMap('terra', { seaLevel, seed, numPlayers: 4 });
      const { landmasses, totalLand, totalTiles } = getLandStats(map);
      totalLandPct += totalLand / totalTiles;

      // Check starts on Old World
      const oldWorld = landmasses[0];
      const starts = map.startingLocations || [];
      for (const start of starts) {
        startsTotal++;
        if (oldWorld && oldWorld.tiles.has(`${start.x},${start.y}`)) {
          startsOnOldWorldAll++;
        }
      }
    }
    avgLand[seaLevel] = totalLandPct / 5;
    console.log(`  ${seaLevel}: avg land = ${(avgLand[seaLevel] * 100).toFixed(1)}%`);
  }

  console.log(`  low(${(avgLand.low * 100).toFixed(1)}%) > high(${(avgLand.high * 100).toFixed(1)}%)?`);
  assert(avgLand['low'] > avgLand['high'],
    `sea level: low sea level produces more land than high sea level`);

  const startsOnOldWorldRate = startsTotal > 0 ? startsOnOldWorldAll / startsTotal : 0;
  console.log(`  Starts on Old World: ${startsOnOldWorldAll}/${startsTotal} (${(startsOnOldWorldRate * 100).toFixed(0)}%)`);
  assert(startsOnOldWorldRate >= 1.0,
    `sea level variation: 100% of starts are on Old World across all sea levels (got ${(startsOnOldWorldRate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 8: Map Size Variation Maintains Old World Mechanic (6 sizes × 5 seeds)
// =============================================================================

console.log('\n=== Test 8: Old World Mechanic Across Map Sizes (6 sizes × 5 seeds) ===');
{
  const mapSizes = ['duel', 'tiny', 'small', 'standard', 'large', 'huge'];
  let overallPassed = 0;
  let overallTotal = 0;

  for (const mapSize of mapSizes) {
    let sizePassed = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const map = generateTestMap('terra', { mapSize, numPlayers: 4, seed });
      const { landmasses } = getLandStats(map);
      const oldWorld = landmasses[0];
      const starts = map.startingLocations || [];

      const correctCount = starts.length === 4;
      let allOnOldWorld = true;
      for (const start of starts) {
        if (!oldWorld || !oldWorld.tiles.has(`${start.x},${start.y}`)) {
          allOnOldWorld = false;
          console.log(`    ${mapSize} seed ${seed}: start (${start.x},${start.y}) NOT on Old World`);
          break;
        }
      }

      if (allOnOldWorld && correctCount) {
        sizePassed++;
      } else if (!correctCount) {
        console.log(`    ${mapSize} seed ${seed}: expected 4 starts, got ${starts.length}`);
      }
    }

    overallPassed += sizePassed;
    overallTotal += 5;
    const sizeRate = sizePassed / 5;
    console.log(`  ${mapSize}: ${sizePassed}/5 (${(sizeRate * 100).toFixed(0)}%)`);
    assert(sizeRate >= 0.80,
      `${mapSize}: >= 80% of seeds have all starts on Old World with correct count (got ${(sizeRate * 100).toFixed(0)}%)`);
  }

  const overallRate = overallPassed / overallTotal;
  console.log(`  Overall: ${overallPassed}/${overallTotal} (${(overallRate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Results
// =============================================================================

reportResults('test-terra-integrity');
