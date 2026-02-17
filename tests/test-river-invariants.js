/**
 * Test: River Placement Rules
 * Deeper validation of river data beyond "do they exist".
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);

  let directionErrors = 0;
  let nofRiverConsistency = 0;
  let wofRiverConsistency = 0;
  // N-of-river edge is horizontal → flow direction is E or W
  // W-of-river edge is vertical → flow direction is N or S
  let validFlowN = new Set([null, undefined, 'E', 'W']);
  let validFlowW = new Set([null, undefined, 'N', 'S']);

  forEachTile(map, (tile, x, y) => {
    // isNOfRiver implies riverFlowN is not null (and vice versa)
    if (tile.isNOfRiver && !tile.riverFlowN) nofRiverConsistency++;
    if (!tile.isNOfRiver && tile.riverFlowN) nofRiverConsistency++;

    // isWOfRiver implies riverFlowW is not null (and vice versa)
    if (tile.isWOfRiver && !tile.riverFlowW) wofRiverConsistency++;
    if (!tile.isWOfRiver && tile.riverFlowW) wofRiverConsistency++;

    // Flow directions are valid
    if (!validFlowN.has(tile.riverFlowN)) directionErrors++;
    if (!validFlowW.has(tile.riverFlowW)) directionErrors++;

  });

  assert(directionErrors === 0,
    `${mapType}: all river flow directions valid (${directionErrors} errors)`);
  assert(nofRiverConsistency === 0,
    `${mapType}: isNOfRiver consistent with riverFlowN (${nofRiverConsistency} errors)`);
  assert(wofRiverConsistency === 0,
    `${mapType}: isWOfRiver consistent with riverFlowW (${wofRiverConsistency} errors)`);
}

reportResults('test-river-invariants');
