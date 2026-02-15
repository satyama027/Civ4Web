/**
 * Test: Plot Type Invariants
 * Validates Civ4's plot type rules across all 10 map types.
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT
} from './_test-utils.js';

const VALID_PLOTS = new Set([PLOT.OCEAN, PLOT.LAND, PLOT.HILLS, PLOT.PEAK]);

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);

  let invalidPlots = 0;
  let landCount = 0;
  let waterCount = 0;
  let hillCount = 0;
  let peakCount = 0;
  let boolErrors = 0;
  const total = map.width * map.height;

  forEachTile(map, (tile, x, y) => {
    const plot = map.plots[y][x];

    // Valid plot value
    if (!VALID_PLOTS.has(plot)) invalidPlots++;

    // Count
    if (plot === PLOT.OCEAN) waterCount++;
    else landCount++;
    if (plot === PLOT.HILLS) hillCount++;
    if (plot === PLOT.PEAK) peakCount++;

    // Boolean consistency
    if (tile.isWater !== (tile.plot === PLOT.OCEAN)) boolErrors++;
    if (tile.isLand !== (tile.plot >= PLOT.LAND)) boolErrors++;
    if (tile.isHills !== (tile.plot === PLOT.HILLS)) boolErrors++;
    if (tile.isPeak !== (tile.plot === PLOT.PEAK)) boolErrors++;
  });

  assert(invalidPlots === 0, `${mapType}: all plots are valid PLOT values (${invalidPlots} invalid)`);

  const landPct = (landCount / total) * 100;
  assert(landPct > 5 && landPct < 95,
    `${mapType}: land percentage reasonable (${landPct.toFixed(1)}%)`);

  assert(boolErrors === 0,
    `${mapType}: boolean flags consistent with plot values (${boolErrors} errors)`);

  // At least some hills and peaks on maps with land
  if (landCount > 0) {
    assert(hillCount > 0, `${mapType}: has hills (${hillCount})`);
    assert(peakCount > 0, `${mapType}: has peaks (${peakCount})`);
  }
}

reportResults('test-plot-types');
