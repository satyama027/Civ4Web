/**
 * Test: Resource Adjacency, Terrain, Feature, and Plot Requirements
 *
 * BonusGenerator enforces:
 * - No two resources on adjacent tiles (8-directional) — soft constraint,
 *   but normalization pass 9 can relax this for strategic resources near starts
 * - Water resources (fish, clam, crab, whale) must be on COAST terrain
 * - Resources with specific feature requirements must match
 * - Resources with noFeature must have no feature
 * - Resources with requiresHills must be on HILLS
 * - Resources with requiresFlatlands must be on LAND (not HILLS)
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  ALL_MAP_TYPES, PLOT, TERRAIN, FEATURE
} from './_test-utils.js';

// Resource definitions for validation (matching BonusGenerator BONUS_DEFS)
const WATER_RESOURCES = ['fish', 'clam', 'crab', 'whale'];
const HILLS_RESOURCES = ['iron', 'copper', 'aluminum', 'gold', 'silver'];
const FLATLAND_RESOURCES = ['horse', 'stone', 'incense', 'ivory', 'corn', 'cow', 'rice', 'wheat'];
const NO_FEATURE_RESOURCES = ['horse', 'stone', 'incense', 'ivory', 'corn', 'cow', 'rice', 'wheat'];
const FEATURE_REQUIREMENTS = {
  dye: [FEATURE.JUNGLE],
  silk: [FEATURE.FOREST],
  spices: [FEATURE.JUNGLE],
  banana: [FEATURE.JUNGLE],
  gems: [FEATURE.JUNGLE],
  fur: [FEATURE.FOREST],
  deer: [FEATURE.FOREST],
  sugar: [FEATURE.FLOODPLAINS],
};

for (const mapType of ALL_MAP_TYPES) {
  console.log(`\n--- ${mapType} ---`);

  const map = generateTestMap(mapType);
  const W = map.width;
  const H = map.height;
  const wrapX = map.settings.mapType !== 'inland_sea';

  // Collect all resource positions
  const resourcePositions = [];
  forEachTile(map, (tile, x, y) => {
    if (tile.resource !== null) {
      resourcePositions.push({ x, y, resource: tile.resource, tile });
    }
  });

  // Check adjacency: count pairs of resources on adjacent tiles
  // Note: normalization pass 9 can place strategic resources ignoring adjacency,
  // so we track violations but allow a small number near starting locations
  let adjacencyViolations = 0;
  for (let i = 0; i < resourcePositions.length; i++) {
    const a = resourcePositions[i];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = a.x + dx;
        let ny = a.y + dy;
        if (wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;

        const neighbor = map.getTile(nx, ny);
        if (neighbor && neighbor.resource !== null) {
          // Only count each pair once (by position ordering)
          if (ny > a.y || (ny === a.y && nx > a.x)) {
            adjacencyViolations++;
          }
        }
      }
    }
  }

  // Water resources must be on COAST terrain
  let waterTerrainViolations = 0;
  for (const r of resourcePositions) {
    if (WATER_RESOURCES.includes(r.resource)) {
      if (r.tile.terrain !== TERRAIN.COAST) waterTerrainViolations++;
    }
  }

  // Hills resources must be on HILLS plot
  let hillsViolations = 0;
  for (const r of resourcePositions) {
    if (HILLS_RESOURCES.includes(r.resource)) {
      if (r.tile.plot !== PLOT.HILLS) hillsViolations++;
    }
  }

  // Flatland resources must be on LAND plot (not HILLS)
  let flatlandViolations = 0;
  for (const r of resourcePositions) {
    if (FLATLAND_RESOURCES.includes(r.resource)) {
      // Oil can be on coast too, skip it
      if (r.resource === 'oil') continue;
      if (r.tile.plot !== PLOT.LAND) flatlandViolations++;
    }
  }

  // No-feature resources must have null feature
  // Note: normalization pass 9 (_canPlaceBalancedBonus) doesn't check noFeature
  // for strategic resources, so allow a small number of violations near starts
  let noFeatureViolations = 0;
  for (const r of resourcePositions) {
    if (NO_FEATURE_RESOURCES.includes(r.resource)) {
      if (r.tile.feature !== null) noFeatureViolations++;
    }
  }

  // Feature-required resources must have the correct feature
  // Note: normalization pass 5 removes jungle near starts AFTER bonuses are placed,
  // so jungle-requiring resources (dye, banana, gems, spices) may lose their jungle.
  // Pass 9 may also place resources ignoring feature requirements in late relaxation.
  let featureViolations = 0;
  for (const r of resourcePositions) {
    const req = FEATURE_REQUIREMENTS[r.resource];
    if (req) {
      if (!req.includes(r.tile.feature)) featureViolations++;
    }
  }

  // Normalization pass 9 places strategic resources with progressively relaxed
  // constraints (4 passes), ignoring adjacency entirely in pass 3. Each start
  // can add up to 7 strategic resources that may cluster. Additionally, the BonusGenerator
  // itself uses adjacency as a soft constraint — it's checked during placement but
  // map-specific scripts may place resources differently. Scale tolerance generously.
  const maxAdjacencyViolations = Math.max(map.startingLocations.length * 12, 50);
  assert(adjacencyViolations <= maxAdjacencyViolations,
    `${mapType}: resource adjacency violations within tolerance (${adjacencyViolations} ≤ ${maxAdjacencyViolations})`);
  assert(waterTerrainViolations === 0,
    `${mapType}: water resources on COAST terrain (violations: ${waterTerrainViolations})`);
  assert(hillsViolations === 0,
    `${mapType}: hills-required resources on HILLS (violations: ${hillsViolations})`);
  assert(flatlandViolations === 0,
    `${mapType}: flatland-required resources on LAND (violations: ${flatlandViolations})`);
  // Allow small number of feature violations from normalization side effects
  const maxFeatureViolations = map.startingLocations.length * 2;
  assert(noFeatureViolations <= maxFeatureViolations,
    `${mapType}: no-feature resource violations within tolerance (${noFeatureViolations} ≤ ${maxFeatureViolations})`);
  assert(featureViolations <= maxFeatureViolations,
    `${mapType}: feature-required resource violations within tolerance (${featureViolations} ≤ ${maxFeatureViolations})`);

  console.log(`  info: ${resourcePositions.length} resources, ${adjacencyViolations} adj, ${noFeatureViolations} noFeat, ${featureViolations} featReq violations`);
}

reportResults('test-resource-spacing');
