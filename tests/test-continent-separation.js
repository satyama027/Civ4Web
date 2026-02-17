/**
 * Test: Continent Separation and Balance
 *
 * The "continents" map type should produce exactly 2 major, roughly balanced
 * continents separated by ocean channels. This test uses flood-fill to identify
 * distinct landmasses and checks their count, relative size, ocean separation,
 * and water percentage.
 */

import {
  generateTestMap, assert, reportResults,
  PLOT
} from './_test-utils.js';

/**
 * Flood-fill to find connected landmasses.
 * Uses 4-connectivity (cardinal directions) with X-wrapping.
 * Returns array of { size, tiles: Set<'x,y'> }, sorted by size descending.
 */
function findLandmasses(map) {
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea';

  const visited = Array.from({ length: H }, () => new Uint8Array(W));
  const landmasses = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y][x]) continue;
      const tile = map.getTile(x, y);
      if (!tile.isLand) continue;

      // BFS flood fill
      const tiles = new Set();
      const queue = [[x, y]];
      visited[y][x] = 1;

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        tiles.add(`${cx},${cy}`);

        // 4-connected neighbors
        const neighbors = [
          [cx - 1, cy], [cx + 1, cy],
          [cx, cy - 1], [cx, cy + 1]
        ];

        for (let [nx, ny] of neighbors) {
          if (ny < 0 || ny >= H) continue;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;

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
 * Find the X-extent of a landmass (accounting for wrap).
 * Returns { minX, maxX } of the bounding box.
 */
function getLandmassXRange(landmass, mapWidth) {
  const xs = new Set();
  for (const key of landmass.tiles) {
    xs.add(parseInt(key.split(',')[0]));
  }
  return xs;
}

/**
 * Check if two landmasses are separated by ocean in every row.
 * Returns minimum ocean gap width (in tiles) between the two landmasses.
 */
function measureOceanSeparation(map, landmass1, landmass2) {
  const W = map.width;
  const H = map.height;
  let minGap = Infinity;

  for (let y = 0; y < H; y++) {
    // Find land tiles in this row for each landmass
    const cols1 = [];
    const cols2 = [];
    for (let x = 0; x < W; x++) {
      const key = `${x},${y}`;
      if (landmass1.tiles.has(key)) cols1.push(x);
      if (landmass2.tiles.has(key)) cols2.push(x);
    }

    if (cols1.length === 0 || cols2.length === 0) continue;

    // Find minimum ocean gap between any pair of columns (with X-wrap)
    for (const c1 of cols1) {
      for (const c2 of cols2) {
        const directDist = Math.abs(c1 - c2);
        const wrapDist = W - directDist;
        const gap = Math.min(directDist, wrapDist) - 1; // -1 since gap is between tiles
        if (gap < minGap) minGap = gap;
      }
    }
  }

  return minGap;
}

// =============================================================================
// Test 1: Continents map type across multiple seeds — continent count
// =============================================================================

console.log('\n=== Test 1: Continent Count (20 seeds) ===');

const NUM_SEEDS = 20;
let validSeeds = 0;
const seedResults = [];

for (let seed = 1; seed <= NUM_SEEDS; seed++) {
  const map = generateTestMap('continents', { seed });
  const landmasses = findLandmasses(map);
  const sizes = landmasses.map(l => l.size);

  const totalLand = sizes.reduce((a, b) => a + b, 0);
  const totalTiles = map.width * map.height;

  // "Major" continent = at least 10% of total land tiles
  const threshold = totalLand * 0.10;
  const majorContinents = sizes.filter(s => s >= threshold);

  const hasTwoPlus = majorContinents.length >= 2;
  const ratio = majorContinents.length >= 2
    ? majorContinents[0] / majorContinents[1]
    : Infinity;
  const balanced = ratio <= 3.0;

  const valid = hasTwoPlus && balanced;
  if (valid) validSeeds++;

  seedResults.push({
    seed,
    majors: majorContinents.length,
    sizes: majorContinents.slice(0, 3),
    ratio: ratio === Infinity ? 'N/A' : ratio.toFixed(1),
    valid,
    landmasses
  });

  console.log(`  seed ${seed}: ${majorContinents.length} major continents, ratio=${ratio === Infinity ? 'N/A' : ratio.toFixed(1)}, land=${(totalLand / totalTiles * 100).toFixed(0)}% ${valid ? '' : '<-- INVALID'}`);
}

const successRate = validSeeds / NUM_SEEDS;
console.log(`\n  Valid seeds: ${validSeeds}/${NUM_SEEDS} (${(successRate * 100).toFixed(0)}%)`);

assert(successRate >= 0.85,
  `continents: at least 85% of seeds produce 2+ balanced continents (got ${(successRate * 100).toFixed(0)}%)`);

// =============================================================================
// Test 2: Ocean channel width between top 2 continents
// =============================================================================

console.log('\n=== Test 2: Ocean Channel Width ===');
{
  let seedsWithGap = 0;
  let seedsTested = 0;

  for (const result of seedResults) {
    if (result.landmasses.length < 2) continue;
    const map = generateTestMap('continents', { seed: result.seed });
    const gap = measureOceanSeparation(map, result.landmasses[0], result.landmasses[1]);
    seedsTested++;

    if (gap >= 2) seedsWithGap++;
    console.log(`  seed ${result.seed}: min ocean gap = ${gap} tiles`);
  }

  const gapRate = seedsTested > 0 ? seedsWithGap / seedsTested : 0;
  assert(gapRate >= 0.75,
    `continents: at least 75% of seeds have ocean gap >= 2 tiles (got ${(gapRate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 3: Continent balance (largest vs second-largest ratio)
// =============================================================================

console.log('\n=== Test 3: Continent Balance ===');
{
  let balancedCount = 0;
  let tested = 0;

  for (const result of seedResults) {
    if (result.majors < 2) continue;
    tested++;
    const ratio = parseFloat(result.ratio);
    if (ratio <= 3.0) balancedCount++;
  }

  const balanceRate = tested > 0 ? balancedCount / tested : 0;
  assert(balanceRate >= 0.80,
    `continents: at least 80% of 2-continent seeds have ratio <= 3:1 (got ${(balanceRate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 4: Water percentage
// =============================================================================

console.log('\n=== Test 4: Water Percentage ===');
{
  let withinRange = 0;

  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const map = generateTestMap('continents', { seed });
    let waterCount = 0;
    const totalTiles = map.width * map.height;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!map.getTile(x, y).isLand) waterCount++;
      }
    }

    const waterPct = (waterCount / totalTiles) * 100;
    if (waterPct >= 65 && waterPct <= 85) withinRange++;
  }

  const waterRate = withinRange / NUM_SEEDS;
  assert(waterRate >= 0.80,
    `continents: at least 80% of seeds have water 65-85% (got ${(waterRate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Sanity checks: Pangaea should typically have 1 dominant continent
// =============================================================================

console.log('\n=== Pangaea (control check) ===');
{
  const map = generateTestMap('pangaea', { seed: 42 });
  const landmasses = findLandmasses(map);
  const sizes = landmasses.map(l => l.size);
  const totalLand = sizes.reduce((a, b) => a + b, 0);

  console.log(`  Major continents: ${sizes.filter(s => s >= totalLand * 0.1).length}, largest: ${sizes[0]}, total land: ${totalLand}`);

  const largestPct = sizes[0] / totalLand;
  assert(largestPct >= 0.6,
    `pangaea: largest continent has >= 60% of land (got ${(largestPct * 100).toFixed(0)}%)`);
}

// =============================================================================
// Sanity checks: Archipelago should have many landmasses
// =============================================================================

console.log('\n=== Archipelago (control check) ===');
{
  const map = generateTestMap('archipelago', { seed: 42 });
  const landmasses = findLandmasses(map);
  const sizes = landmasses.map(l => l.size);
  const totalLand = sizes.reduce((a, b) => a + b, 0);

  console.log(`  Total landmasses: ${sizes.length}, largest: ${sizes[0]}, total land: ${totalLand}`);

  assert(sizes.length >= 5,
    `archipelago: has >= 5 separate landmasses (got ${sizes.length})`);
}

reportResults('test-continent-separation');
