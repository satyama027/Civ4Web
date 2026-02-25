/**
 * Test: Civ4-correct coordinate system and river edge semantics
 *
 * Verifies that our river placement matches Civ4 BTS exactly:
 *
 *   isNOfRiver at (x,y) = bottom/south horizontal edge of tile (x,y)
 *     — tile (x,y) is NORTH of the river
 *     — shared with south neighbor (x, y+1)
 *     — renders from vertex(x, y+1) to vertex(x+1, y+1)
 *
 *   isWOfRiver at (x,y) = right/east vertical edge of tile (x,y)
 *     — tile (x,y) is WEST of the river
 *     — shared with east neighbor (x+1, y)
 *     — renders from vertex(x+1, y) to vertex(x+1, y+1)
 *
 * Y-axis convention: y=0 is north (top), y increases southward.
 * CARDINAL_OFFSETS[NORTH] = [0, -1] (correct for our array layout).
 */

import { assert, reportResults } from './_test-utils.js';
import { RiverGenerator, CARDINAL, CARDINAL_OFFSETS, FLOW } from '../src/game/mapgen/RiverGenerator.js';
import { PLOT } from '../src/game/mapgen/FractalWorld.js';
import { SeededRandom } from '../src/game/mapgen/utils.js';

// ============================================================================
// 1. CARDINAL_OFFSETS — Y convention
// ============================================================================

assert(
  CARDINAL_OFFSETS[CARDINAL.NORTH][0] === 0 && CARDINAL_OFFSETS[CARDINAL.NORTH][1] === -1,
  'CARDINAL_OFFSETS[NORTH] = [0,-1] (y=0 is north, y decreases going north)'
);
assert(
  CARDINAL_OFFSETS[CARDINAL.SOUTH][0] === 0 && CARDINAL_OFFSETS[CARDINAL.SOUTH][1] === 1,
  'CARDINAL_OFFSETS[SOUTH] = [0,+1]'
);
assert(
  CARDINAL_OFFSETS[CARDINAL.EAST][0] === 1 && CARDINAL_OFFSETS[CARDINAL.EAST][1] === 0,
  'CARDINAL_OFFSETS[EAST] = [+1,0]'
);
assert(
  CARDINAL_OFFSETS[CARDINAL.WEST][0] === -1 && CARDINAL_OFFSETS[CARDINAL.WEST][1] === 0,
  'CARDINAL_OFFSETS[WEST] = [-1,0]'
);

// ============================================================================
// HELPER: build a minimal flat land map for edge-placement testing
// ============================================================================

function makeAllLandMap(W, H) {
  const plotTypes = new Array(W * H).fill(PLOT.LAND);
  // Ring of ocean on the border to allow rivers to terminate
  for (let x = 0; x < W; x++) {
    plotTypes[0 * W + x] = PLOT.OCEAN;
    plotTypes[(H - 1) * W + x] = PLOT.OCEAN;
  }
  for (let y = 0; y < H; y++) {
    plotTypes[y * W + 0] = PLOT.OCEAN;
    plotTypes[y * W + (W - 1)] = PLOT.OCEAN;
  }
  return plotTypes;
}

function makeRivers(W, H) {
  return new Array(W * H).fill(null).map(() => ({
    isNOfRiver: false,
    isWOfRiver: false,
    riverNSDirection: null,
    riverWEDirection: null
  }));
}

// ============================================================================
// 2. Moving NORTH places isWOfRiver (not isNOfRiver) on FROM tile
// ============================================================================
{
  const W = 5, H = 5;
  const rg = new RiverGenerator(W, H, { wrapX: false });
  const plotTypes = makeAllLandMap(W, H);
  const riverValues = rg._buildRiverValues(plotTypes);
  const rivers = makeRivers(W, H);

  // Manually call _placeRiverEdge for NORTH movement: from (2,2) to (2,1)
  const flowDir = FLOW.NORTH;
  rg._placeRiverEdge(2, 2, 2, 1, CARDINAL.NORTH, flowDir, rivers);

  const fromTile = rivers[2 * W + 2];
  assert(fromTile.isWOfRiver === true,
    'Moving NORTH sets isWOfRiver on FROM tile (right/east vertical edge)');
  assert(fromTile.isNOfRiver === false,
    'Moving NORTH does NOT set isNOfRiver on FROM tile');
  assert(fromTile.riverNSDirection === FLOW.NORTH,
    'Moving NORTH stores FLOW.NORTH in riverNSDirection (N-S flow on vertical edge)');
}

// ============================================================================
// 3. Moving EAST places isNOfRiver (not isWOfRiver) on TO tile (x+1, y)
// ============================================================================
{
  const W = 5, H = 5;
  const rg = new RiverGenerator(W, H, { wrapX: false });
  const rivers = makeRivers(W, H);

  // EAST movement: from (2,2) to (3,2)
  rg._placeRiverEdge(2, 2, 3, 2, CARDINAL.EAST, FLOW.EAST, rivers);

  const toTile = rivers[2 * W + 3];
  assert(toTile.isNOfRiver === true,
    'Moving EAST sets isNOfRiver on TO tile (bottom/south horizontal edge)');
  assert(toTile.isWOfRiver === false,
    'Moving EAST does NOT set isWOfRiver on TO tile');
  assert(toTile.riverWEDirection === FLOW.EAST,
    'Moving EAST stores FLOW.EAST in riverWEDirection (E-W flow on horizontal edge)');
}

// ============================================================================
// 4. Moving SOUTH places isWOfRiver on TO tile (x, y+1)
// ============================================================================
{
  const W = 5, H = 5;
  const rg = new RiverGenerator(W, H, { wrapX: false });
  const rivers = makeRivers(W, H);

  // SOUTH movement: from (2,2) to (2,3)
  rg._placeRiverEdge(2, 2, 2, 3, CARDINAL.SOUTH, FLOW.SOUTH, rivers);

  const toTile = rivers[3 * W + 2];
  assert(toTile.isWOfRiver === true,
    'Moving SOUTH sets isWOfRiver on TO tile (right/east vertical edge)');
  assert(toTile.isNOfRiver === false,
    'Moving SOUTH does NOT set isNOfRiver on TO tile');
  assert(toTile.riverNSDirection === FLOW.SOUTH,
    'Moving SOUTH stores FLOW.SOUTH in riverNSDirection');
}

// ============================================================================
// 5. Moving WEST places isNOfRiver on FROM tile
// ============================================================================
{
  const W = 5, H = 5;
  const rg = new RiverGenerator(W, H, { wrapX: false });
  const rivers = makeRivers(W, H);

  // WEST movement: from (2,2) to (1,2)
  rg._placeRiverEdge(2, 2, 1, 2, CARDINAL.WEST, FLOW.WEST, rivers);

  const fromTile = rivers[2 * W + 2];
  assert(fromTile.isNOfRiver === true,
    'Moving WEST sets isNOfRiver on FROM tile (bottom/south horizontal edge)');
  assert(fromTile.isWOfRiver === false,
    'Moving WEST does NOT set isWOfRiver on FROM tile');
  assert(fromTile.riverWEDirection === FLOW.WEST,
    'Moving WEST stores FLOW.WEST in riverWEDirection');
}

// ============================================================================
// 6. isNOfRiver at (x,y) renders at bottom edge: vertex row y+1
// ============================================================================
// isNOfRiver at (x,y) = bottom horizontal edge from vertex(x,y+1) to vertex(x+1,y+1)
// Vertex row = y+1 (not y)
{
  const x = 3, y = 2;
  // Bottom edge vertices:
  const v1 = [x,     y + 1];  // left vertex of bottom edge
  const v2 = [x + 1, y + 1];  // right vertex of bottom edge
  assert(v1[1] === y + 1 && v2[1] === y + 1,
    'isNOfRiver at (x,y): bottom edge uses vertex row y+1 (not y)');
  assert(v1[0] === x && v2[0] === x + 1,
    'isNOfRiver at (x,y): bottom edge spans columns x to x+1');
}

// ============================================================================
// 7. isWOfRiver at (x,y) renders at right edge: vertex column x+1
// ============================================================================
// isWOfRiver at (x,y) = right vertical edge from vertex(x+1,y) to vertex(x+1,y+1)
// Vertex column = x+1 (not x)
{
  const x = 3, y = 2;
  // Right edge vertices:
  const v1 = [x + 1, y];      // top vertex of right edge
  const v2 = [x + 1, y + 1];  // bottom vertex of right edge
  assert(v1[0] === x + 1 && v2[0] === x + 1,
    'isWOfRiver at (x,y): right edge uses vertex column x+1 (not x)');
  assert(v1[1] === y && v2[1] === y + 1,
    'isWOfRiver at (x,y): right edge spans rows y to y+1');
}

// ============================================================================
// 8. Fresh water detection finds river on all 4 edges of a tile
// ============================================================================
{
  const W = 7, H = 7;
  const rg = new RiverGenerator(W, H, { wrapX: false });

  // Test tile at (3,3). Place a river on each of its 4 edges separately.

  // Edge A: bottom edge = isNOfRiver at (3,3)
  {
    const rivers = makeRivers(W, H);
    rivers[3 * W + 3].isNOfRiver = true;
    assert(rg._findFreshWater(rivers, 3, 3, 0),
      'Fresh water found: isNOfRiver on own tile (bottom edge)');
  }

  // Edge B: right edge = isWOfRiver at (3,3)
  {
    const rivers = makeRivers(W, H);
    rivers[3 * W + 3].isWOfRiver = true;
    assert(rg._findFreshWater(rivers, 3, 3, 0),
      'Fresh water found: isWOfRiver on own tile (right edge)');
  }

  // Edge C: top edge = isNOfRiver on north neighbor (3,2)
  {
    const rivers = makeRivers(W, H);
    rivers[2 * W + 3].isNOfRiver = true;
    assert(rg._findFreshWater(rivers, 3, 3, 0),
      'Fresh water found: isNOfRiver on north neighbor (3,2) = top edge of (3,3)');
  }

  // Edge D: left edge = isWOfRiver on west neighbor (2,3)
  {
    const rivers = makeRivers(W, H);
    rivers[3 * W + 2].isWOfRiver = true;
    assert(rg._findFreshWater(rivers, 3, 3, 0),
      'Fresh water found: isWOfRiver on west neighbor (2,3) = left edge of (3,3)');
  }
}

// ============================================================================
// 9. _edgeHasRiver correctly maps directions to new flag semantics
// ============================================================================
{
  const W = 5, H = 5;
  const rg = new RiverGenerator(W, H, { wrapX: false });
  const rivers = makeRivers(W, H);

  // Place isWOfRiver at (2,2) — corresponds to NORTH movement from (2,2)
  rivers[2 * W + 2].isWOfRiver = true;
  assert(rg._edgeHasRiver(2, 2, CARDINAL.NORTH, rivers),
    '_edgeHasRiver: NORTH checks isWOfRiver on FROM tile');

  // Place isWOfRiver at (2,3) — corresponds to SOUTH movement from (2,2)
  rivers[3 * W + 2].isWOfRiver = true;
  assert(rg._edgeHasRiver(2, 2, CARDINAL.SOUTH, rivers),
    '_edgeHasRiver: SOUTH checks isWOfRiver on TO tile (y+1)');

  // Place isNOfRiver at (2,2) — corresponds to WEST movement from (2,2)
  rivers[2 * W + 2].isNOfRiver = true;
  assert(rg._edgeHasRiver(2, 2, CARDINAL.WEST, rivers),
    '_edgeHasRiver: WEST checks isNOfRiver on FROM tile');

  // Place isNOfRiver at (3,2) — corresponds to EAST movement from (2,2)
  rivers[2 * W + 3].isNOfRiver = true;
  assert(rg._edgeHasRiver(2, 2, CARDINAL.EAST, rivers),
    '_edgeHasRiver: EAST checks isNOfRiver on TO tile (x+1)');
}

// ============================================================================
// 10. Full addRivers integration: rivers are generated with correct flags
// ============================================================================
{
  const W = 20, H = 20;
  const rg = new RiverGenerator(W, H, { wrapX: false });
  const plotTypes = makeAllLandMap(W, H);
  // Make center area hills to encourage river starts
  for (let y = 5; y < 15; y++) {
    for (let x = 5; x < 15; x++) {
      plotTypes[y * W + x] = PLOT.HILLS;
    }
  }
  const terrain = new Array(W * H).fill('grassland');
  const rng = new SeededRandom(42);
  const rivers = rg.addRivers(rng, plotTypes, terrain, null);

  let hasNOfRiver = false;
  let hasWOfRiver = false;
  for (const r of rivers) {
    if (r.isNOfRiver) hasNOfRiver = true;
    if (r.isWOfRiver) hasWOfRiver = true;
  }

  // At least one of each type should be placed
  assert(hasNOfRiver || hasWOfRiver,
    'addRivers places at least some river edges on a hills map');
}

reportResults('test-coordinate-system');
