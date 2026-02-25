/**
 * Test: Lake Detection Unit Tests
 *
 * Directly exercises RiverGenerator.addLakes() with controlled inputs.
 * Tests the 8-neighbor enclosed-OCEAN detection logic:
 *   - A PLOT.OCEAN tile is a lake iff ALL in-bounds 8-neighbors are non-OCEAN.
 *   - Off-map neighbors (no wrap) are skipped and do not block detection.
 *   - wrapX=true connects x=0 and x=W-1.
 *   - Only PLOT.OCEAN (0) blocks lake detection; PLOT.LAND/HILLS/PEAK do not.
 */

import { assert, reportResults, PLOT } from './_test-utils.js';
import { RiverGenerator } from '../src/game/mapgen/RiverGenerator.js';

function idx(W, x, y) { return y * W + x; }
function makePlots(W, H, fill = PLOT.LAND) { return new Array(W * H).fill(fill); }

// ============================================================================
// Test 1: Enclosed single ocean tile (3×3, no wrap)
// ============================================================================
{
  const W = 3, H = 3;
  const plots = makePlots(W, H, PLOT.LAND);
  plots[idx(W, 1, 1)] = PLOT.OCEAN; // center

  const lakes = new RiverGenerator(W, H, { wrapX: false }).addLakes(plots);

  assert(lakes[idx(W, 1, 1)] === true,
    'test1: enclosed single ocean tile is a lake');
  assert(!lakes.filter((v, i) => i !== idx(W, 1, 1)).some(Boolean),
    'test1: all non-center tiles are not lakes');
}

// ============================================================================
// Test 2: Two adjacent ocean tiles (4×3, no wrap) — see each other, neither is a lake
// ============================================================================
{
  const W = 4, H = 3;
  const plots = makePlots(W, H, PLOT.LAND);
  plots[idx(W, 1, 1)] = PLOT.OCEAN;
  plots[idx(W, 2, 1)] = PLOT.OCEAN;

  const lakes = new RiverGenerator(W, H, { wrapX: false }).addLakes(plots);

  assert(!lakes[idx(W, 1, 1)],
    'test2: left of two adjacent ocean tiles is not a lake');
  assert(!lakes[idx(W, 2, 1)],
    'test2: right of two adjacent ocean tiles is not a lake');
}

// ============================================================================
// Test 3: 2×2 ocean block (4×4, no wrap) — all 4 tiles see ocean neighbors → 0 lakes
// ============================================================================
{
  const W = 4, H = 4;
  const plots = makePlots(W, H, PLOT.LAND);
  plots[idx(W, 1, 1)] = PLOT.OCEAN;
  plots[idx(W, 2, 1)] = PLOT.OCEAN;
  plots[idx(W, 1, 2)] = PLOT.OCEAN;
  plots[idx(W, 2, 2)] = PLOT.OCEAN;

  const lakes = new RiverGenerator(W, H, { wrapX: false }).addLakes(plots);

  assert(lakes.filter(Boolean).length === 0,
    'test3: 2×2 ocean block → 0 lakes');
}

// ============================================================================
// Test 4: Corner tile (0,0), no wrap — off-map neighbors skipped → still a lake
// ============================================================================
{
  const W = 3, H = 3;
  const plots = makePlots(W, H, PLOT.LAND);
  plots[idx(W, 0, 0)] = PLOT.OCEAN;

  const lakes = new RiverGenerator(W, H, { wrapX: false }).addLakes(plots);

  assert(lakes[idx(W, 0, 0)] === true,
    'test4: corner ocean tile (no wrap) qualifies as a lake');
}

// ============================================================================
// Test 5: wrapX=true — ocean at x=0 and x=W-1 are diagonal neighbors across seam
//         → each sees the other → neither is a lake
// ============================================================================
{
  const W = 4, H = 3;
  const plots = makePlots(W, H, PLOT.LAND);
  plots[idx(W, 0, 1)] = PLOT.OCEAN; // x=0 sees x=W-1 as diagonal wrap neighbor
  plots[idx(W, 3, 1)] = PLOT.OCEAN;

  const lakes = new RiverGenerator(W, H, { wrapX: true }).addLakes(plots);

  assert(!lakes[idx(W, 0, 1)],
    'test5: wrapX — ocean at x=0 sees ocean at x=W-1 (not a lake)');
  assert(!lakes[idx(W, 3, 1)],
    'test5: wrapX — ocean at x=W-1 sees ocean at x=0 (not a lake)');
}

// ============================================================================
// Test 6: wrapX=true — only x=0 is ocean, x=W-1 is land → IS a lake
// ============================================================================
{
  const W = 4, H = 3;
  const plots = makePlots(W, H, PLOT.LAND);
  plots[idx(W, 0, 1)] = PLOT.OCEAN;

  const lakes = new RiverGenerator(W, H, { wrapX: true }).addLakes(plots);

  assert(lakes[idx(W, 0, 1)] === true,
    'test6: wrapX — ocean at x=0 with land at x=W-1 is a lake');
}

// ============================================================================
// Test 7: All-land map → 0 lakes
// ============================================================================
{
  const W = 4, H = 4;
  const plots = makePlots(W, H, PLOT.LAND);

  const lakes = new RiverGenerator(W, H, { wrapX: false }).addLakes(plots);

  assert(lakes.filter(Boolean).length === 0,
    'test7: all-land map → 0 lakes');
}

// ============================================================================
// Test 8: Mixed non-OCEAN neighbors (LAND, HILLS, PEAK) do not block lake detection
//
// In Civ4, PLOT_COAST (1) ≠ PLOT_OCEAN (0), so shallow water tiles do not block
// lake detection. Our addLakes() checks `nPlot === PLOT.OCEAN` (0) only — any
// non-zero plot type (LAND=1, HILLS=2, PEAK=3) also does not block detection.
// ============================================================================
{
  const W = 3, H = 3;
  // All 8 neighbors use a mix of LAND, HILLS, PEAK — none are OCEAN
  const plots = [
    PLOT.HILLS, PLOT.LAND, PLOT.PEAK,   // y=0: top row
    PLOT.PEAK,  PLOT.OCEAN, PLOT.HILLS, // y=1: center tile is ocean
    PLOT.LAND,  PLOT.PEAK,  PLOT.LAND,  // y=2: bottom row
  ];

  const lakes = new RiverGenerator(W, H, { wrapX: false }).addLakes(plots);

  assert(lakes[idx(W, 1, 1)] === true,
    'test8: mixed non-OCEAN (HILLS/PEAK/LAND) neighbors do not block lake detection');
}

reportResults('test-lake-unit');
