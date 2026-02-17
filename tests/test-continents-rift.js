/**
 * Test: Continents Rift Mechanics
 *
 * Verifies that the center rift and tectonic action create proper
 * ocean channels in the continent fractal, and that continent separation
 * works across different map sizes and sea levels.
 */

import {
  generateTestMap, assert, reportResults
} from './_test-utils.js';
import { CyFractal, FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_WRAP_X } from '../src/game/mapgen/CyFractal.js';
import { SeededRandom } from '../src/game/mapgen/utils.js';

/**
 * Flood-fill to find connected landmasses (simplified — returns sizes only).
 */
function findLandmassSizes(map) {
  const W = map.width;
  const H = map.height;
  const visited = Array.from({ length: H }, () => new Uint8Array(W));
  const sizes = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y][x]) continue;
      const tile = map.getTile(x, y);
      if (!tile.isLand) continue;

      let size = 0;
      const queue = [[x, y]];
      visited[y][x] = 1;

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        size++;

        const neighbors = [
          [cx - 1, cy], [cx + 1, cy],
          [cx, cy - 1], [cx, cy + 1]
        ];

        for (let [nx, ny] of neighbors) {
          if (ny < 0 || ny >= H) continue;
          nx = ((nx % W) + W) % W;

          if (visited[ny][nx]) continue;
          const nt = map.getTile(nx, ny);
          if (!nt.isLand) continue;

          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }

      sizes.push(size);
    }
  }

  sizes.sort((a, b) => b - a);
  return sizes;
}

/**
 * Check if a map has 2+ major continents with ≤4:1 ratio.
 */
function hasGoodContinents(map) {
  const sizes = findLandmassSizes(map);
  const totalLand = sizes.reduce((a, b) => a + b, 0);
  if (totalLand === 0) return false;

  const threshold = totalLand * 0.10;
  const majors = sizes.filter(s => s >= threshold);

  if (majors.length < 2) return false;
  return majors[0] / majors[1] <= 4.0;
}

// =============================================================================
// Test 5: Center rift creates depression at grid center
// =============================================================================

console.log('\n=== Test 5: Center Rift Creates Depression ===');
{
  const rng = new SeededRandom(42);
  const frac = new CyFractal(7, 6);
  const flags = FRAC_WRAP_X | FRAC_CENTER_RIFT;
  frac.fracInit(52, 32, 2, rng, flags);

  const w = frac.gridWidth;
  const h = frac.gridHeight;
  const fracX = w - 1;

  // Sample heights at center (x = fracX/2) and at quarter (x = fracX/4)
  let sumCenter = 0;
  let sumQuarter = 0;
  const centerX = Math.floor(fracX / 2);
  const quarterX = Math.floor(fracX / 4);

  for (let y = Math.floor(h * 0.2); y < Math.floor(h * 0.8); y++) {
    sumCenter += frac.grid[y * w + centerX];
    sumQuarter += frac.grid[y * w + quarterX];
  }

  const rows = Math.floor(h * 0.8) - Math.floor(h * 0.2);
  const avgCenter = sumCenter / rows;
  const avgQuarter = sumQuarter / rows;

  console.log(`  Avg height at center (x=${centerX}): ${avgCenter.toFixed(1)}`);
  console.log(`  Avg height at quarter (x=${quarterX}): ${avgQuarter.toFixed(1)}`);

  assert(avgCenter < avgQuarter,
    `center rift: avg height at center (${avgCenter.toFixed(1)}) < quarter (${avgQuarter.toFixed(1)})`);
}

// =============================================================================
// Test 6: Tectonic action creates edge rift
// =============================================================================

console.log('\n=== Test 6: Tectonic Action Creates Edge Rift ===');
{
  const rng = new SeededRandom(42);
  const frac = new CyFractal(7, 6);
  const riftFrac = new CyFractal(7, 6);

  const flags = FRAC_WRAP_X | FRAC_CENTER_RIFT | FRAC_POLAR;

  // Initialize rift fractal (plain noise)
  riftFrac.fracInit(52, 32, 2, rng, 0);

  // Initialize continent fractal with rifts
  frac.fracInitRifts(riftFrac, true, 52, 32, 2, rng, flags);

  const w = frac.gridWidth;
  const h = frac.gridHeight;

  // Sample heights near x=0 (wrap seam where tectonicAction carves)
  let sumEdge = 0;
  let sumInterior = 0;
  const interiorX = Math.floor((w - 1) / 4); // x = fracX/4

  // Only sample middle rows (avoid polar zeros)
  const yStart = Math.floor(h * 0.25);
  const yEnd = Math.floor(h * 0.75);
  const rowCount = yEnd - yStart;

  for (let y = yStart; y < yEnd; y++) {
    // Average a few columns near edge
    sumEdge += (frac.grid[y * w + 0] + frac.grid[y * w + 1] + frac.grid[y * w + 2]) / 3;
    sumInterior += frac.grid[y * w + interiorX];
  }

  const avgEdge = sumEdge / rowCount;
  const avgInterior = sumInterior / rowCount;

  console.log(`  Avg height near edge (x≈0): ${avgEdge.toFixed(1)}`);
  console.log(`  Avg height at interior (x=${interiorX}): ${avgInterior.toFixed(1)}`);

  assert(avgEdge < avgInterior,
    `tectonic action: avg height near edge (${avgEdge.toFixed(1)}) < interior (${avgInterior.toFixed(1)})`);
}

// =============================================================================
// Test 7: Rift is present across all map sizes
// =============================================================================

console.log('\n=== Test 7: Continent Separation Across Map Sizes ===');
{
  const mapSizes = ['duel', 'small', 'standard', 'large', 'huge'];
  let goodCount = 0;

  for (const size of mapSizes) {
    // Test 3 seeds per size
    let sizeGood = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const map = generateTestMap('continents', { mapSize: size, seed });
      if (hasGoodContinents(map)) sizeGood++;
    }

    const passed = sizeGood >= 2; // At least 2/3 seeds should produce good continents
    if (passed) goodCount++;
    console.log(`  ${size}: ${sizeGood}/3 seeds with 2+ balanced continents ${passed ? '' : '<-- WEAK'}`);
  }

  assert(goodCount >= 4,
    `continents: at least 4/5 map sizes produce good continents (got ${goodCount}/5)`);
}

// =============================================================================
// Test 8: Sea level doesn't break separation
// =============================================================================

console.log('\n=== Test 8: Sea Level Independence ===');
{
  const seaLevels = ['low', 'medium', 'high'];
  let goodCount = 0;

  for (const seaLevel of seaLevels) {
    let levelGood = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const map = generateTestMap('continents', { seaLevel, seed });
      if (hasGoodContinents(map)) levelGood++;
    }

    const passed = levelGood >= 3; // At least 3/5 seeds should work
    if (passed) goodCount++;
    console.log(`  ${seaLevel}: ${levelGood}/5 seeds with 2+ balanced continents ${passed ? '' : '<-- WEAK'}`);
  }

  assert(goodCount >= 2,
    `continents: at least 2/3 sea levels produce good continents (got ${goodCount}/3)`);
}

reportResults('test-continents-rift');
