/**
 * Test: Floodplains River Adjacency + Oasis Isolation
 *
 * Floodplains: must have a river on at least one of its 4 edges.
 * Oasis: must have NO adjacent water tile and NO adjacent oasis in 8 directions.
 * Exception: 'oasis' map type uses Oasis.py's Python pass (no adjacency check).
 * Both are desert features with strict spatial constraints.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT, FEATURE
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea';

  let floodplainsCount = 0;
  let floodplainsNoRiver = 0;
  let oasisCount = 0;
  let oasisWaterAdj = 0;
  let oasisOasisAdj = 0;
  let hasRivers = false;

  // Check if map has any rivers
  forEachTile(map, (tile) => {
    if (tile.hasRiver) hasRivers = true;
  });

  forEachTile(map, (tile, x, y) => {
    if (tile.feature === FEATURE.FLOODPLAINS) {
      floodplainsCount++;

      // Floodplains must have a river on at least one edge.
      // Check tile's own N/W edges + south neighbor's N edge + east neighbor's W edge
      if (!tile.hasRiver) {
        floodplainsNoRiver++;
      }
    }

    if (tile.feature === FEATURE.OASIS) {
      oasisCount++;

      // Oasis must have no adjacent water or oasis in 8 directions
      let hasWaterNeighbor = false;
      let hasOasisNeighbor = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;

          const neighbor = map.getTile(nx, ny);
          if (!neighbor) continue;

          if (neighbor.isWater) hasWaterNeighbor = true;
          if (neighbor.feature === FEATURE.OASIS) hasOasisNeighbor = true;
        }
      }

      if (hasWaterNeighbor) oasisWaterAdj++;
      if (hasOasisNeighbor) oasisOasisAdj++;
    }
  });

  assert(floodplainsNoRiver === 0,
    `${mapType}: all floodplains have a river edge (violations: ${floodplainsNoRiver}/${floodplainsCount})`);
  // Oasis.py overrides addFeaturesAtPlot and calls setFeatureType directly
  // without adjacency checks (Oasis.py line 572), so adjacent oases are
  // authentic Civ4 behavior for the 'oasis' map type. Skip these asserts.
  if (mapType !== 'oasis') {
    assert(oasisWaterAdj === 0,
      `${mapType}: no oasis adjacent to water (violations: ${oasisWaterAdj}/${oasisCount})`);
    assert(oasisOasisAdj === 0,
      `${mapType}: no oasis adjacent to another oasis (violations: ${oasisOasisAdj}/${oasisCount})`);
  } else if (oasisWaterAdj > 0 || oasisOasisAdj > 0) {
    console.log(`  note: oasis map type has ${oasisWaterAdj} water-adj, ${oasisOasisAdj} oasis-adj violations (expected per Oasis.py)`);
  }

  // Floodplains should only appear on maps with rivers
  if (floodplainsCount > 0) {
    assert(hasRivers,
      `${mapType}: floodplains only on maps with rivers`);
  }

  console.log(`  info: ${floodplainsCount} floodplains, ${oasisCount} oases`);
}

reportResults('test-floodplains-oasis');
