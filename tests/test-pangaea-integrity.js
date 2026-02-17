/**
 * Test: Pangaea Map Integrity
 *
 * Verifies that Pangaea maps produce a single dominant continent across
 * subtypes, map sizes, sea levels, and seeds. Mirrors the Civ4 BTS
 * Pangaea.py guarantees:
 * - Largest landmass contains >=80% (natural/pressed) or >=90% (solid) of land
 * - Cohesion repair bridges fragmentation when thresholds fail
 * - Starting plots are restricted to the largest landmass
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
          nx = ((nx % W) + W) % W; // X-wrap (pangaea always wraps X)

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
 * Compute cohesion stats for a map.
 */
function getCohesionStats(map) {
  const landmasses = findLandmasses(map);
  const totalLand = landmasses.reduce((s, l) => s + l.size, 0);
  const totalTiles = map.width * map.height;
  const largestPct = totalLand > 0 ? landmasses[0].size / totalLand : 0;
  const landPct = totalTiles > 0 ? totalLand / totalTiles : 0;
  const secondPct = landmasses.length >= 2 ? landmasses[1].size / totalLand : 0;
  return { landmasses, totalLand, totalTiles, largestPct, landPct, secondPct };
}

/**
 * Shared runner: generate maps across seeds and check cohesion threshold.
 */
function testCohesion(label, overrides, numSeeds, threshold, requiredRate) {
  let passed = 0;
  for (let seed = 1; seed <= numSeeds; seed++) {
    const map = generateTestMap('pangaea', { seed, ...overrides });
    const { largestPct } = getCohesionStats(map);
    if (largestPct >= threshold) passed++;
  }
  const rate = passed / numSeeds;
  console.log(`  ${label}: ${passed}/${numSeeds} seeds met ${(threshold * 100).toFixed(0)}% threshold (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= requiredRate,
    `${label}: >= ${(requiredRate * 100).toFixed(0)}% of seeds have largest landmass >= ${(threshold * 100).toFixed(0)}% of land (got ${(rate * 100).toFixed(0)}%)`);
  return rate;
}

// =============================================================================
// Cache maps from Test 1 (random subtype) for reuse in Tests 7-9
// =============================================================================

const REUSE_SEEDS = 20;
const cachedMaps = new Map();

function getCachedMap(seed) {
  if (!cachedMaps.has(seed)) {
    cachedMaps.set(seed, generateTestMap('pangaea', { seed }));
  }
  return cachedMaps.get(seed);
}

// =============================================================================
// Test 1: Random subtype dominance (customOption: 0)
// =============================================================================

console.log('\n=== Test 1: Random Subtype Dominance (30 seeds) ===');
{
  // Pre-cache maps for seeds 1-20 (reused in Tests 7-9)
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    getCachedMap(seed);
  }

  let passed = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const map = seed <= REUSE_SEEDS
      ? getCachedMap(seed)
      : generateTestMap('pangaea', { seed });
    const { largestPct } = getCohesionStats(map);
    if (largestPct >= 0.80) passed++;
    else console.log(`    seed ${seed}: largest = ${(largestPct * 100).toFixed(1)}%`);
  }
  const rate = passed / 30;
  console.log(`  Passed: ${passed}/30 (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.85,
    `random subtype: >= 85% of seeds have largest landmass >= 80% of land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 2: Natural subtype (customOption: 1)
// =============================================================================

console.log('\n=== Test 2: Natural Subtype (20 seeds) ===');
testCohesion('natural (opt 1)', { customOption: 1 }, 20, 0.80, 0.85);

// =============================================================================
// Test 3: Pressed subtype (customOption: 2)
// =============================================================================

console.log('\n=== Test 3: Pressed Subtype (20 seeds) ===');
testCohesion('pressed (opt 2)', { customOption: 2 }, 20, 0.80, 0.85);

// =============================================================================
// Test 4: Solid subtype (customOption: 3)
// =============================================================================

console.log('\n=== Test 4: Solid Subtype (20 seeds) ===');
testCohesion('solid (opt 3)', { customOption: 3 }, 20, 0.90, 0.85);

// =============================================================================
// Test 5: Map size variation
// =============================================================================

console.log('\n=== Test 5: Map Size Variation (10 seeds each) ===');
{
  for (const mapSize of ['duel', 'small', 'standard', 'large']) {
    let passed = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const map = generateTestMap('pangaea', { seed, mapSize });
      const { largestPct } = getCohesionStats(map);
      if (largestPct >= 0.75) passed++;
      else console.log(`    ${mapSize} seed ${seed}: largest = ${(largestPct * 100).toFixed(1)}%`);
    }
    const rate = passed / 10;
    console.log(`  ${mapSize}: ${passed}/10 (${(rate * 100).toFixed(0)}%)`);
    assert(rate >= 0.80,
      `${mapSize}: >= 80% of seeds have largest landmass >= 75% of land (got ${(rate * 100).toFixed(0)}%)`);
  }
}

// =============================================================================
// Test 6: Sea level variation
// =============================================================================

console.log('\n=== Test 6: Sea Level Variation (10 seeds each) ===');
{
  for (const seaLevel of ['low', 'medium', 'high']) {
    let passed = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const map = generateTestMap('pangaea', { seed, seaLevel });
      const { largestPct } = getCohesionStats(map);
      if (largestPct >= 0.70) passed++;
      else console.log(`    ${seaLevel} seed ${seed}: largest = ${(largestPct * 100).toFixed(1)}%`);
    }
    const rate = passed / 10;
    console.log(`  ${seaLevel}: ${passed}/10 (${(rate * 100).toFixed(0)}%)`);
    assert(rate >= 0.80,
      `sea level ${seaLevel}: >= 80% of seeds have largest landmass >= 70% of land (got ${(rate * 100).toFixed(0)}%)`);
  }
}

// =============================================================================
// Test 7: Starting locations on main continent (reuses cached maps)
// =============================================================================

console.log('\n=== Test 7: Starting Locations on Main Continent (20 seeds) ===');
{
  let allOnMain = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landmasses } = getCohesionStats(map);
    const mainContinent = landmasses[0];
    const starts = map.startingLocations || [];

    if (starts.length === 0) {
      console.log(`    seed ${seed}: no starting locations`);
      continue;
    }

    let allOnMainThisSeed = true;
    for (const start of starts) {
      const key = `${start.x},${start.y}`;
      if (!mainContinent.tiles.has(key)) {
        allOnMainThisSeed = false;
        console.log(`    seed ${seed}: start (${start.x},${start.y}) NOT on main continent`);
        break;
      }
    }
    if (allOnMainThisSeed) allOnMain++;
  }
  const rate = allOnMain / REUSE_SEEDS;
  console.log(`  All starts on main: ${allOnMain}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 1.0,
    `all starting locations should be on main continent (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 8: Land percentage in range (reuses cached maps)
// =============================================================================

console.log('\n=== Test 8: Land Percentage in Range (20 seeds) ===');
{
  let inRange = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { landPct } = getCohesionStats(map);
    const pct = landPct * 100;
    if (pct >= 25 && pct <= 60) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: land = ${pct.toFixed(1)}%`);
    }
  }
  const rate = inRange / REUSE_SEEDS;
  console.log(`  In range (25-60%): ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `>= 90% of seeds have 25-60% land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 9: No large secondary landmass (reuses cached maps)
// =============================================================================

console.log('\n=== Test 9: No Large Secondary Landmass (20 seeds) ===');
{
  let passed = 0;
  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const { secondPct } = getCohesionStats(map);
    if (secondPct < 0.15) {
      passed++;
    } else {
      console.log(`    seed ${seed}: 2nd landmass = ${(secondPct * 100).toFixed(1)}% of land`);
    }
  }
  const rate = passed / REUSE_SEEDS;
  console.log(`  2nd < 15%: ${passed}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.85,
    `>= 85% of seeds have 2nd landmass < 15% of land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 10: Stress test (high sea level + duel map)
// =============================================================================

console.log('\n=== Test 10: Stress Test — High Sea + Duel (15 seeds) ===');
testCohesion('high sea + duel', { seaLevel: 'high', mapSize: 'duel' }, 15, 0.65, 0.75);

// =============================================================================
// Results
// =============================================================================

reportResults('test-pangaea-integrity');
