/**
 * Test: Continents Shift (shiftPlotTypes centering)
 *
 * Verifies that after shiftPlotTypes, continents are centered in the map
 * and the wrap seam (column 0 / width-1) is mostly ocean.
 */

import {
  generateTestMap, assert, reportResults
} from './_test-utils.js';
import { FractalWorld, PLOT } from '../src/game/mapgen/FractalWorld.js';
import { SeededRandom } from '../src/game/mapgen/utils.js';

// =============================================================================
// Test 9: shiftPlotTypes centers continents (wrap seam is ocean)
// =============================================================================

console.log('\n=== Test 9: Shift Centers Continents ===');
{
  const NUM_SEEDS = 10;
  let goodSeeds = 0;

  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const map = generateTestMap('continents', { seed });
    const W = map.width;
    const H = map.height;

    // Count land at wrap seam (columns 0 and W-1 are adjacent due to X-wrap)
    let seam0Land = 0;
    let seamWLand = 0;
    for (let y = 0; y < H; y++) {
      if (map.getTile(0, y).isLand) seam0Land++;
      if (map.getTile(W - 1, y).isLand) seamWLand++;
    }

    const seamLandPct = ((seam0Land + seamWLand) / (2 * H)) * 100;

    // Count land at center columns
    const centerX = Math.floor(W / 2);
    let centerLand = 0;
    for (let y = 0; y < H; y++) {
      if (map.getTile(centerX, y).isLand) centerLand++;
    }
    const centerLandPct = (centerLand / H) * 100;

    const good = seamLandPct < 30; // Wrap seam should be mostly ocean
    if (good) goodSeeds++;

    console.log(`  seed ${seed}: seam land=${seamLandPct.toFixed(0)}%, center land=${centerLandPct.toFixed(0)}% ${good ? '' : '<-- SEAM NOT OCEAN'}`);
  }

  const rate = goodSeeds / NUM_SEEDS;
  assert(rate >= 0.70,
    `shift: at least 70% of seeds have wrap seam < 30% land (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 10: findBestSplitX finds ocean column
// =============================================================================

console.log('\n=== Test 10: findBestSplitX Finds Ocean Column ===');
{
  const NUM_SEEDS = 10;
  let goodSeeds = 0;

  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const rng = new SeededRandom(seed);
    const W = 52;
    const H = 32;

    const fw = new FractalWorld(W, H, { climate: 'temperate', seaLevel: 'medium' });
    fw.initFractal(rng, { polar: true });
    fw.generatePlotTypes(rng, { water_percent: 75, shift_plot_types: false });

    // Find best split BEFORE shifting
    const bestX = fw.findBestSplitX();

    // Count land at the split column
    let landAtSplit = 0;
    for (let y = 0; y < H; y++) {
      if (fw.getPlotType(bestX, y) !== PLOT.OCEAN) landAtSplit++;
    }

    const splitLandPct = (landAtSplit / H) * 100;
    const good = splitLandPct <= 30; // Split should be through mostly ocean
    if (good) goodSeeds++;

    console.log(`  seed ${seed}: bestSplitX=${bestX}, land at split=${splitLandPct.toFixed(0)}% ${good ? '' : '<-- NOT OCEAN'}`);
  }

  const rate = goodSeeds / NUM_SEEDS;
  assert(rate >= 0.70,
    `findBestSplitX: at least 70% of seeds split through ocean (got ${(rate * 100).toFixed(0)}%)`);
}

reportResults('test-continents-shift');
