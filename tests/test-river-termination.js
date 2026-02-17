/**
 * Test: River Termination at Water
 *
 * In Civ4 BTS, rivers always terminate when they reach an ocean tile, a lake,
 * or the map edge. They never end "dangling" in the middle of land.
 *
 * This test traces each river as a connected graph of edges, identifies
 * degree-1 endpoints, and checks that each endpoint touches water or the map edge.
 *
 * Expected: FAIL (our rivers currently terminate mid-land due to missing
 * hasCoastAtSECorner() checks and visited-set / maxSteps cutoffs).
 */

import {
  generateTestMap, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

/**
 * Build a graph of river edges and find degree-1 endpoints.
 * Each river edge connects two "corners" (intersections of 4 tiles).
 *
 * isNOfRiver at (x,y): horizontal edge along the north side of tile (x,y).
 *   Connects corner (x, y) to corner (x+1, y).
 *
 * isWOfRiver at (x,y): vertical edge along the west side of tile (x,y).
 *   Connects corner (x, y) to corner (x, y+1).
 *
 * A river endpoint is a corner with exactly 1 edge (degree 1).
 * A "dangling" endpoint is one where none of the 4 tiles sharing that corner
 * is water (ocean or lake) and it's not on the map boundary.
 */
function analyzeRiverEndpoints(map) {
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea';

  // Corner key: corners are at integer coordinates from (0,0) to (W, H).
  // With X-wrapping, corner x=W is the same as corner x=0.
  function cornerKey(cx, cy) {
    const wcx = wrapX ? ((cx % W) + W) % W : cx;
    return `${wcx},${cy}`;
  }

  // Count edges per corner
  const cornerDegree = new Map();
  function addEdge(cx1, cy1, cx2, cy2) {
    const k1 = cornerKey(cx1, cy1);
    const k2 = cornerKey(cx2, cy2);
    cornerDegree.set(k1, (cornerDegree.get(k1) || 0) + 1);
    cornerDegree.set(k2, (cornerDegree.get(k2) || 0) + 1);
  }

  let totalEdges = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = map.getTile(x, y);

      // isNOfRiver at (x,y): horizontal edge from corner (x,y) to (x+1,y)
      if (tile.isNOfRiver) {
        addEdge(x, y, x + 1, y);
        totalEdges++;
      }

      // isWOfRiver at (x,y): vertical edge from corner (x,y) to (x,y+1)
      if (tile.isWOfRiver) {
        addEdge(x, y, x, y + 1);
        totalEdges++;
      }
    }
  }

  // Find degree-1 corners (endpoints)
  const endpoints = [];
  for (const [key, degree] of cornerDegree) {
    if (degree === 1) {
      const [cx, cy] = key.split(',').map(Number);
      endpoints.push({ cx, cy, key });
    }
  }

  // Check if an endpoint touches water or map edge.
  // A corner at (cx, cy) is shared by up to 4 tiles:
  //   (cx-1, cy-1), (cx, cy-1), (cx-1, cy), (cx, cy)
  let danglingCount = 0;
  const danglingEndpoints = [];

  for (const ep of endpoints) {
    const { cx, cy } = ep;

    // Check map boundary — corners at y=0 or y=H are on the top/bottom edge
    if (cy === 0 || cy === H) continue;

    // For non-wrapping maps, corners at x=0 or x=W are on the side edges
    if (!wrapX && (cx === 0 || cx === W)) continue;

    // Check if any of the 4 tiles sharing this corner is water
    let touchesWater = false;
    const offsets = [
      [cx - 1, cy - 1], [cx, cy - 1],
      [cx - 1, cy],     [cx, cy]
    ];

    for (const [tx, ty] of offsets) {
      if (ty < 0 || ty >= H) continue;
      let wx = tx;
      if (wrapX) wx = ((tx % W) + W) % W;
      else if (tx < 0 || tx >= W) continue;

      const t = map.getTile(wx, ty);
      if (t && (t.isWater || t.isLake)) {
        touchesWater = true;
        break;
      }
    }

    if (!touchesWater) {
      danglingCount++;
      danglingEndpoints.push(ep);
    }
  }

  return { totalEdges, endpointCount: endpoints.length, danglingCount, danglingEndpoints };
}

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const result = analyzeRiverEndpoints(map);

  console.log(`  River edges: ${result.totalEdges}, endpoints: ${result.endpointCount}, dangling: ${result.danglingCount}`);

  if (result.totalEdges === 0) {
    // Some map types might legitimately have no rivers (unlikely but skip)
    console.log(`  (no rivers — skipping endpoint checks)`);
    continue;
  }

  assert(result.danglingCount === 0,
    `${mapType}: all river endpoints reach water or map edge (${result.danglingCount} dangling of ${result.endpointCount} endpoints)`);
}

reportResults('test-river-termination');
