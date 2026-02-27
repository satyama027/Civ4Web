/**
 * Test: Inland Sea Map Integrity
 *
 * Verifies that Inland Sea maps exhibit the correct structural properties:
 * - No world wrap on either axis (unique among all map types)
 * - Grid dimensions match inlandSea.js getGridSize spec
 * - No SNOW terrain (ISTerrainGenerator lat compression to 0.63 < 0.70 threshold)
 * - No ICE features (ISFeatureGenerator lat compression + no-wrap suppresses all ice)
 * - Ring topology (center ocean > outer band ocean in ≥90% of seeds)
 * - Land percentage in expected range (25–65%)
 * - Template-based starts valid for player counts 2–8 (engine clamps min players to 2)
 * - Custom inland-flowing rivers are generated
 * - Sea level shifts land percentage
 */

import {
  generateTestMap, forEachTile, assert, reportResults,
  PLOT, TERRAIN, FEATURE
} from './_test-utils.js';

import inlandSeaScript from '../src/game/mapgen/scripts/inlandSea.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Flood-fill to find connected landmasses.
 * Uses 4-connectivity (cardinal directions) with NO wrapping.
 * (Inland Sea is unique: wrapX=false, wrapY=false)
 * Returns array of { size, tiles: Set<'x,y'> }, sorted by size descending.
 */
function findLandmasses(map) {
  const W = map.width;
  const H = map.height;
  const visited = Array.from({ length: H }, () => new Uint8Array(W));
  const landmasses = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y][x]) continue;
      const tile = map.getTile(x, y);
      if (!tile.isLand) continue;

      const tiles = new Set();
      const queue = [[x, y]];
      visited[y][x] = 1;

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        tiles.add(`${cx},${cy}`);
        const neighbors = [
          [cx - 1, cy], [cx + 1, cy],
          [cx, cy - 1], [cx, cy + 1]
        ];
        for (const [nx, ny] of neighbors) {
          // No wrapping on either axis
          if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          if (visited[ny][nx]) continue;
          const nt = map.getTile(nx, ny);
          if (!nt.isLand) continue;
          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }

      landmasses.push({ size: tiles.size, tiles });
    }
  }

  landmasses.sort((a, b) => b.size - a.size);
  return landmasses;
}

/**
 * Compute land percentage (non-ocean tiles / total tiles).
 */
function getLandPct(map) {
  let land = 0;
  const total = map.width * map.height;
  forEachTile(map, tile => { if (tile.isLand) land++; });
  return land / total;
}

/**
 * Count tiles with at least one river edge mark (isNOfRiver || isWOfRiver).
 */
function countRiverEdges(map) {
  let count = 0;
  forEachTile(map, tile => {
    if (tile.isNOfRiver || tile.isWOfRiver) count++;
  });
  return count;
}

// =============================================================================
// Cache maps (default inland_sea, seeds 1-20, small size, for reuse in Tests 3-6, 8)
// =============================================================================

const REUSE_SEEDS = 20;
const cachedMaps = new Map();

function getCachedMap(seed) {
  if (!cachedMaps.has(seed)) {
    cachedMaps.set(seed, generateTestMap('inland_sea', { seed }));
  }
  return cachedMaps.get(seed);
}

// Pre-warm cache before first test
for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
  getCachedMap(seed);
}

// =============================================================================
// Test 1: No World Wrap (Hard Invariant, static)
// =============================================================================

console.log('\n=== Test 1: No World Wrap (static) ===');
{
  assert(inlandSeaScript.getWrapX() === false,
    'inlandSea: getWrapX() returns false (no east-west wrap)');
  assert(inlandSeaScript.getWrapY() === false,
    'inlandSea: getWrapY() returns false (no north-south wrap)');
}

// =============================================================================
// Test 2: Grid Dimensions Match Spec (Hard, all 6 sizes)
// =============================================================================

console.log('\n=== Test 2: Grid Dimensions Match Spec (6 sizes) ===');
{
  // getGridSize: [blockCols, blockRows] × 4 each
  const expected = {
    duel:     { width: 24,  height: 16 },
    tiny:     { width: 32,  height: 20 },
    small:    { width: 40,  height: 24 },
    standard: { width: 52,  height: 32 },
    large:    { width: 64,  height: 40 },
    huge:     { width: 84,  height: 52 }
  };

  for (const [mapSize, exp] of Object.entries(expected)) {
    const map = generateTestMap('inland_sea', { mapSize, numPlayers: 2 });
    const wOk = map.width === exp.width;
    const hOk = map.height === exp.height;
    console.log(`  ${mapSize}: ${map.width}×${map.height} (expected ${exp.width}×${exp.height}) ${wOk && hOk ? '' : '<-- FAIL'}`);
    assert(wOk,
      `${mapSize}: map width = ${exp.width} (got ${map.width})`);
    assert(hOk,
      `${mapSize}: map height = ${exp.height} (got ${map.height})`);
  }
}

// =============================================================================
// Test 3: No SNOW Terrain (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 3: No SNOW Terrain (20 seeds) ===');
{
  // ISTerrainGenerator overrides getLatitudeAtPlot:
  //   return 0.07 + 0.56 * super.getLatitudeAtPlot(x, y)
  // super clamps to [0, 1] → IS lat ∈ [0.07, 0.63]
  // SNOW threshold (fSnowLatitude) defaults to 0.70 > 0.63 → SNOW impossible
  let snowViolations = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    forEachTile(map, tile => {
      if (tile.terrain === TERRAIN.SNOW) snowViolations++;
    });
  }

  console.log(`  SNOW tile violations: ${snowViolations} across ${REUSE_SEEDS} seeds`);
  assert(snowViolations === 0,
    `ISTerrainGenerator: 0 SNOW tiles across ${REUSE_SEEDS} seeds (lat compression to 0.63 < 0.70 threshold, got ${snowViolations})`);
}

// =============================================================================
// Test 4: No ICE Features (Hard, 20 seeds)
// =============================================================================

console.log('\n=== Test 4: No ICE Features (20 seeds) ===');
{
  // ISFeatureGenerator overrides getLatitudeAtPlot identically.
  // Temperate climate: fRandIceLatitude = 0.25, both ice bands require lat > 0.75.
  // IS max lat 0.63 < 0.75 → ice probability expressions are negative (never fire).
  // Also, wrapX=false && wrapY=false → edge-row automatic ice rule does not apply.
  let iceViolations = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    forEachTile(map, tile => {
      if (tile.feature === FEATURE.ICE) iceViolations++;
    });
  }

  console.log(`  ICE feature violations: ${iceViolations} across ${REUSE_SEEDS} seeds`);
  assert(iceViolations === 0,
    `ISFeatureGenerator: 0 ICE feature tiles across ${REUSE_SEEDS} seeds (lat compression + no-wrap suppresses all ice, got ${iceViolations})`);
}

// =============================================================================
// Test 5: Ring Topology — Center Is Predominantly Ocean (20 seeds)
// =============================================================================

console.log('\n=== Test 5: Ring Topology — Center Predominantly Ocean (20 seeds) ===');
{
  // HintedWorld 4×2 grid:
  //   Corner blocks (cols 0 and 3, i.e. x ∈ [0,W/4) and x ∈ [3W/4,W)): land hints (200+)
  //   Inner blocks (cols 1 and 2, i.e. x ∈ [W/4, 3W/4)):  ocean hints (0)
  // → Center 50% of columns should have significantly higher ocean% than outer 25% bands.
  let innerGtOuter = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width;
    const H = map.height;

    const innerStart = Math.floor(W / 4);
    const innerEnd   = Math.floor(3 * W / 4);

    let innerOcean = 0;
    let innerTotal = 0;
    let outerOcean = 0;
    let outerTotal = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = map.getTile(x, y);
        const isOcean = !tile.isLand;
        if (x >= innerStart && x < innerEnd) {
          innerTotal++;
          if (isOcean) innerOcean++;
        } else {
          outerTotal++;
          if (isOcean) outerOcean++;
        }
      }
    }

    const innerOceanPct = innerTotal > 0 ? innerOcean / innerTotal : 0;
    const outerOceanPct = outerTotal > 0 ? outerOcean / outerTotal : 0;

    if (innerOceanPct > outerOceanPct) {
      innerGtOuter++;
    } else {
      console.log(`    seed ${seed}: inner ocean ${(innerOceanPct * 100).toFixed(1)}% <= outer ${(outerOceanPct * 100).toFixed(1)}%`);
    }
  }

  const rate = innerGtOuter / REUSE_SEEDS;
  console.log(`  Center ocean > outer ocean: ${innerGtOuter}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `ring topology: center 50% of width has higher ocean% than outer 25% bands in >= 90% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 6: Land Percentage in Expected Range 65–90% (20 seeds)
// =============================================================================

console.log('\n=== Test 6: Land Percentage 65–90% (20 seeds) ===');
{
  // Correct ring topology: 5×3 block grid with 12 border (land) blocks and only 3
  // interior (ocean) blocks → ~80% of blocks land-hinted → ~75-85% actual land.
  let inRange = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const landPct = getLandPct(map) * 100;
    if (landPct >= 65 && landPct <= 90) {
      inRange++;
    } else {
      console.log(`    seed ${seed}: land = ${landPct.toFixed(1)}% (outside 65–90%)`);
    }
  }

  const rate = inRange / REUSE_SEEDS;
  console.log(`  In range (65–90% land): ${inRange}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `>= 90% of seeds have 65–90% land (IS ring: 12/15 blocks land-hinted in 5×3 grid, got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 7: Template-Based Starts Valid for Player Counts 1–8 (10 seeds each)
// =============================================================================

console.log('\n=== Test 7: Template-Based Starts Valid for Player Counts 2–8 (10 seeds each) ===');
{
  const SEEDS_PER_COUNT = 10;
  // Note: the map engine clamps numPlayers to minimum 2, so 1-player is excluded.
  const playerCounts = [2, 3, 4, 5, 6, 7, 8];

  for (const n of playerCounts) {
    let validLandCount = 0; // seeds where all starts on valid land
    let correctCount = 0;   // seeds where start count === n

    for (let seed = 1; seed <= SEEDS_PER_COUNT; seed++) {
      const map = generateTestMap('inland_sea', { seed, numPlayers: n });
      const starts = (map.startingLocations || []).filter(s => s != null);

      // Assert correct count
      if (starts.length === n) correctCount++;
      else console.log(`    ${n}-player seed ${seed}: expected ${n} starts, got ${starts.length}`);

      // Assert all on valid land (not OCEAN, not PEAK)
      let allOnLand = true;
      for (const s of starts) {
        const tile = map.getTile(s.x, s.y);
        if (!tile || !tile.isLand || tile.isPeak) {
          allOnLand = false;
          console.log(`    ${n}-player seed ${seed}: start (${s.x},${s.y}) not on valid land (isLand=${tile?.isLand}, isPeak=${tile?.isPeak})`);
          break;
        }
      }
      if (allOnLand) validLandCount++;
    }

    const validRate = validLandCount / SEEDS_PER_COUNT;
    const countRate = correctCount / SEEDS_PER_COUNT;
    console.log(`  ${n}-player: valid land=${validLandCount}/${SEEDS_PER_COUNT}, correct count=${correctCount}/${SEEDS_PER_COUNT}`);

    assert(validRate === 1.0,
      `${n}-player: 100% of starts on valid land (10 seeds, got ${(validRate * 100).toFixed(0)}%)`);
    assert(countRate === 1.0,
      `${n}-player: all 10 seeds produce exactly ${n} starts (got ${(countRate * 100).toFixed(0)}%)`);
  }
}

// =============================================================================
// Test 8: Rivers Exist (20 seeds)
// =============================================================================

console.log('\n=== Test 8: Rivers Exist (20 seeds) ===');
{
  // addInlandSeaRivers: maxRivers = max(4, floor(sqrt(W*H)/6))
  // For small map (40×24): max(4, floor(sqrt(960)/6)) = max(4, floor(5.16)) = 5
  // Rivers counted only when length >= 3; each such river marks >= 3 edge cells.
  // Threshold: >= 5 river edge tiles in >= 90% of seeds.
  const MIN_RIVER_EDGES = 5;
  let enoughRivers = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const edges = countRiverEdges(map);
    if (edges >= MIN_RIVER_EDGES) {
      enoughRivers++;
    } else {
      console.log(`    seed ${seed}: only ${edges} river edge marks (< ${MIN_RIVER_EDGES})`);
    }
  }

  const rate = enoughRivers / REUSE_SEEDS;
  console.log(`  >= ${MIN_RIVER_EDGES} river edges: ${enoughRivers}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.90,
    `addInlandSeaRivers: >= 90% of seeds have >= ${MIN_RIVER_EDGES} river edge marks (custom inward-flowing algorithm, got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 9: Sea Level Effect on Land % (3 levels × 10 seeds)
// =============================================================================

console.log('\n=== Test 9: Sea Level Effect on Land % (3 levels × 10 seeds) ===');
{
  const SEEDS = 10;
  const avgLand = {};

  for (const seaLevel of ['low', 'medium', 'high']) {
    let total = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const map = generateTestMap('inland_sea', { seed, seaLevel });
      total += getLandPct(map);
    }
    avgLand[seaLevel] = total / SEEDS;
    console.log(`  ${seaLevel}: avg land = ${(avgLand[seaLevel] * 100).toFixed(1)}%`);
  }

  console.log(`  low(${(avgLand.low * 100).toFixed(1)}%) > high(${(avgLand.high * 100).toFixed(1)}%)?`);
  assert(avgLand.low > avgLand.high,
    `sea level: low sea level produces more land than high (IS uses seaLevelChange in HintedWorld, low=${(avgLand.low * 100).toFixed(1)}% high=${(avgLand.high * 100).toFixed(1)}%)`);
}

// =============================================================================
// Test 10: Row-Axis Ring Topology (20 seeds)
// =============================================================================

console.log('\n=== Test 10: Row-Axis Ring Topology (20 seeds) ===');
{
  // Fixed ring: top/bottom border rows are fully land-hinted → outer 25% row bands
  // have significantly higher land% than the center 50% row band.
  // Broken JS (two vertical bands): all rows show same left/right pattern → outer ≈ center.
  let outerGtCenter = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width;
    const H = map.height;

    const outerRowEnd   = Math.floor(H / 4);
    const outerRowStart = Math.floor(3 * H / 4);

    let outerLand = 0; let outerTotal = 0;
    let centerLand = 0; let centerTotal = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = map.getTile(x, y);
        if (y < outerRowEnd || y >= outerRowStart) {
          outerTotal++;
          if (tile.isLand) outerLand++;
        } else {
          centerTotal++;
          if (tile.isLand) centerLand++;
        }
      }
    }

    const outerLandPct  = outerTotal  > 0 ? outerLand  / outerTotal  : 0;
    const centerLandPct = centerTotal > 0 ? centerLand / centerTotal : 0;

    if (outerLandPct > centerLandPct) {
      outerGtCenter++;
    } else {
      console.log(`    seed ${seed}: outer row land ${(outerLandPct * 100).toFixed(1)}% <= center ${(centerLandPct * 100).toFixed(1)}%`);
    }
  }

  const rate = outerGtCenter / REUSE_SEEDS;
  console.log(`  Outer row land > center row land: ${outerGtCenter}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.80,
    `ring topology: outer 25% row bands have higher land% than center 50% rows in >= 80% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 11: Largest Landmass Touches All 4 Map Edges (20 seeds)
// =============================================================================

console.log('\n=== Test 11: Largest Landmass Touches All 4 Map Edges (20 seeds) ===');
{
  // Fixed ring: single ring landmass → touches x=0, x=W-1, y=0, y=H-1.
  // Broken JS (two vertical bands): left band doesn't touch x=W-1; right doesn't touch x=0.
  let touchesAll4 = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width;
    const H = map.height;
    const landmasses = findLandmasses(map);

    if (landmasses.length === 0) {
      console.log(`    seed ${seed}: no landmasses found`);
      continue;
    }

    const largest = landmasses[0];
    let touchLeft = false, touchRight = false, touchBottom = false, touchTop = false;

    for (const key of largest.tiles) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx === 0)     touchLeft   = true;
      if (tx === W - 1) touchRight  = true;
      if (ty === 0)     touchBottom = true;
      if (ty === H - 1) touchTop    = true;
    }

    if (touchLeft && touchRight && touchBottom && touchTop) {
      touchesAll4++;
    } else {
      console.log(`    seed ${seed}: largest mass misses edges — left:${touchLeft} right:${touchRight} bottom:${touchBottom} top:${touchTop}`);
    }
  }

  const rate = touchesAll4 / REUSE_SEEDS;
  console.log(`  Largest landmass touches all 4 edges: ${touchesAll4}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.85,
    `ring topology: largest landmass touches all 4 map edges in >= 85% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 12: Land Ring Cohesion — Majority of Land in Single Mass (20 seeds)
// =============================================================================

console.log('\n=== Test 12: Land Ring Cohesion — ≥65% of Land in Single Mass (20 seeds) ===');
{
  // Fixed ring: single connected ring → largest mass ≥ 65% of all land tiles.
  // Broken JS (two bands): each ≈ 50% of total → largest < 65% → FAILS.
  let cohesive = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const landmasses = findLandmasses(map);

    let totalLand = 0;
    for (const lm of landmasses) totalLand += lm.size;

    if (totalLand === 0) { console.log(`    seed ${seed}: no land tiles`); continue; }

    const largestPct = landmasses[0].size / totalLand;

    if (largestPct >= 0.65) {
      cohesive++;
    } else {
      console.log(`    seed ${seed}: largest mass = ${(largestPct * 100).toFixed(1)}% of land (< 65%)`);
    }
  }

  const rate = cohesive / REUSE_SEEDS;
  console.log(`  Largest mass >= 65% of land: ${cohesive}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.80,
    `ring cohesion: largest landmass >= 65% of all land in >= 80% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Helper: findOceanMasses
// =============================================================================

/**
 * Flood-fill to find connected ocean masses (non-land tiles).
 * Uses 4-connectivity with NO wrapping (Inland Sea: wrapX=false, wrapY=false).
 * Returns array of { size, tiles: Set<'x,y'> }, sorted by size descending.
 */
function findOceanMasses(map) {
  const W = map.width, H = map.height;
  const visited = Array.from({ length: H }, () => new Uint8Array(W));
  const masses = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y][x]) continue;
      const tile = map.getTile(x, y);
      if (tile.isLand) continue;
      const tiles = new Set();
      const queue = [[x, y]];
      visited[y][x] = 1;
      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        tiles.add(`${cx},${cy}`);
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (visited[ny][nx]) continue;
          if (map.getTile(nx, ny).isLand) continue;
          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }
      masses.push({ size: tiles.size, tiles });
    }
  }
  masses.sort((a, b) => b.size - a.size);
  return masses;
}

// =============================================================================
// Test 13: Sea Centroid Within Central 50% of Map (20 seeds)
// =============================================================================

console.log('\n=== Test 13: Sea Centroid Within Central 50% of Map (20 seeds) ===');
{
  // Ocean blocks bx=1,2,3 / by=1 are symmetric about map center in the 5×3 block grid.
  // Grain=1 hint_strength=0.60 → centroid should stay near (W/2, H/2).
  let centeredCount = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width, H = map.height;

    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!map.getTile(x, y).isLand) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count === 0) {
      console.log(`    seed ${seed}: no ocean tiles`);
      continue;
    }

    const cx = (sumX / count) / W;
    const cy = (sumY / count) / H;

    if (cx >= 0.25 && cx <= 0.75 && cy >= 0.25 && cy <= 0.75) {
      centeredCount++;
    } else {
      console.log(`    seed ${seed}: centroid (${cx.toFixed(2)}, ${cy.toFixed(2)}) outside [0.25,0.75]×[0.25,0.75]`);
    }
  }

  const rate = centeredCount / REUSE_SEEDS;
  console.log(`  Sea centroid in central zone: ${centeredCount}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.85,
    `sea centroid within [0.25,0.75] × [0.25,0.75] in >= 85% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 14: Central Sea Cohesive — Largest Ocean Body ≥ 60% of Ocean (20 seeds)
// =============================================================================

console.log('\n=== Test 14: Central Sea Cohesive — Largest Ocean Body ≥ 60% (20 seeds) ===');
{
  // 3 contiguous interior ocean blocks form one connected band.
  // With grain=1 strong hints, ocean should be predominantly one body.
  let cohesiveCount = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const masses = findOceanMasses(map);

    if (masses.length === 0) {
      console.log(`    seed ${seed}: no ocean tiles`);
      continue;
    }

    const totalOcean = masses.reduce((s, m) => s + m.size, 0);
    const largestPct = masses[0].size / totalOcean;

    if (largestPct >= 0.60) {
      cohesiveCount++;
    } else {
      console.log(`    seed ${seed}: largest ocean body = ${(largestPct * 100).toFixed(1)}% of ocean (< 60%)`);
    }
  }

  const rate = cohesiveCount / REUSE_SEEDS;
  console.log(`  Largest ocean body >= 60% of all ocean: ${cohesiveCount}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.80,
    `largest ocean body >= 60% of all ocean tiles in >= 80% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Test 15: Majority of Ocean in Central Zone (20 seeds)
// =============================================================================

console.log('\n=== Test 15: Majority of Ocean in Central Zone (20 seeds) ===');
{
  // Ocean blocks occupy interior x=[25%,75%] × y=[33%,67%] in the 5×3 block grid.
  // Central zone x∈[W/4,3W/4) × y∈[H/4,3H/4) should capture >= 55% of ocean tiles.
  let majorityCount = 0;

  for (let seed = 1; seed <= REUSE_SEEDS; seed++) {
    const map = getCachedMap(seed);
    const W = map.width, H = map.height;

    const xStart = Math.floor(W / 4);
    const xEnd   = Math.floor(3 * W / 4);
    const yStart = Math.floor(H / 4);
    const yEnd   = Math.floor(3 * H / 4);

    let centralOcean = 0, totalOcean = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!map.getTile(x, y).isLand) {
          totalOcean++;
          if (x >= xStart && x < xEnd && y >= yStart && y < yEnd) {
            centralOcean++;
          }
        }
      }
    }

    if (totalOcean === 0) {
      console.log(`    seed ${seed}: no ocean tiles`);
      continue;
    }

    const centralPct = centralOcean / totalOcean;

    if (centralPct >= 0.55) {
      majorityCount++;
    } else {
      console.log(`    seed ${seed}: only ${(centralPct * 100).toFixed(1)}% of ocean in central zone (< 55%)`);
    }
  }

  const rate = majorityCount / REUSE_SEEDS;
  console.log(`  >= 55% of ocean in central zone: ${majorityCount}/${REUSE_SEEDS} (${(rate * 100).toFixed(0)}%)`);
  assert(rate >= 0.80,
    `>= 55% of ocean tiles in central quarter-zone in >= 80% of seeds (got ${(rate * 100).toFixed(0)}%)`);
}

// =============================================================================
// Results
// =============================================================================

reportResults('test-inlandsea-integrity');
