/**
 * Test: Goody Hut Placement Rules
 *
 * GoodyGenerator places tribal villages with strict eligibility and spacing rules:
 * - Only on LAND or HILLS (not ocean, coast, peaks)
 * - Not on tiles with resources
 * - Not on ICE or FLOODPLAINS features
 * - Manhattan distance ≥ minSpacing (4) between huts
 * - Manhattan distance ≥ startExclusion (3) from starting locations
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

  const goodyPositions = [];
  let plotViolations = 0;
  let resourceViolations = 0;
  let featureViolations = 0;

  forEachTile(map, (tile, x, y) => {
    if (!tile.hasGoodyHut) return;
    goodyPositions.push({ x, y });

    // Must be on LAND or HILLS
    if (tile.plot !== PLOT.LAND && tile.plot !== PLOT.HILLS) {
      plotViolations++;
    }

    // Must not have a resource
    if (tile.resource !== null) {
      resourceViolations++;
    }

    // Must not have ICE or FLOODPLAINS
    if (tile.feature === FEATURE.ICE || tile.feature === FEATURE.FLOODPLAINS) {
      featureViolations++;
    }
  });

  // Manhattan distance with wrap support
  function manhattanDist(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2);
    if (wrapX) dx = Math.min(dx, W - dx);
    const dy = Math.abs(y1 - y2);
    return dx + dy;
  }

  // Check spacing between goody huts (minSpacing = 4)
  let spacingViolations = 0;
  for (let i = 0; i < goodyPositions.length; i++) {
    for (let j = i + 1; j < goodyPositions.length; j++) {
      const dist = manhattanDist(
        goodyPositions[i].x, goodyPositions[i].y,
        goodyPositions[j].x, goodyPositions[j].y
      );
      if (dist < 4) spacingViolations++;
    }
  }

  // Check distance from starting locations (startExclusion = 3)
  let startViolations = 0;
  for (const g of goodyPositions) {
    for (const s of map.startingLocations) {
      const dist = manhattanDist(g.x, g.y, s.x, s.y);
      if (dist < 3) startViolations++;
    }
  }

  assert(plotViolations === 0,
    `${mapType}: all goodies on LAND/HILLS (violations: ${plotViolations})`);
  assert(resourceViolations === 0,
    `${mapType}: no goody on resource tile (violations: ${resourceViolations})`);
  assert(featureViolations === 0,
    `${mapType}: no goody on ICE/FLOODPLAINS (violations: ${featureViolations})`);
  assert(spacingViolations === 0,
    `${mapType}: goody spacing ≥ 4 Manhattan (violations: ${spacingViolations})`);
  assert(startViolations === 0,
    `${mapType}: goody distance from starts ≥ 3 (violations: ${startViolations})`);

  // Should have at least some goody huts on maps with land
  let landCount = 0;
  forEachTile(map, (tile) => { if (tile.isLand) landCount++; });
  if (landCount > 50) {
    assert(goodyPositions.length > 0,
      `${mapType}: has goody huts on map with ${landCount} land tiles (found ${goodyPositions.length})`);
  }

  console.log(`  info: ${goodyPositions.length} goody huts found`);
}

reportResults('test-goodies');
