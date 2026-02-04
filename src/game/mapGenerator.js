/**
 * Civilization IV: Beyond the Sword - Map Generation Algorithm
 *
 * Replicates Civ4 BTS default map generation using:
 * - CyFractal-equivalent fractal generator with grain control, FRAC_POLAR, FRAC_CENTER_RIFT
 * - FractalWorld three-fractal plot type generation (continent, hills, peaks)
 * - TerrainGenerator latitude-band model with desert/plains fractals
 * - FeatureGenerator fractal-threshold placement (jungle, forest, ice)
 * - Edge-based river model (isNOfRiver, isWOfRiver)
 * - Resource placement following Civ4 XML rules
 *
 * References:
 * - CvMapGeneratorUtil.py (FractalWorld, TerrainGenerator, FeatureGenerator)
 * - Continents.py, Pangaea.py map scripts
 * - CvMapGenerator.cpp (DLL river generation)
 */

import {
  getMapTypeConfig,
  getMapSizeConfig,
  getClimateConfig,
  getSeaLevelConfig
} from '../data/gameOptions';

// Import CyFractal and utilities from new modular structure
import { createFractal, FRAC_POLAR } from './mapgen/CyFractal.js';
import { SeededRandom, create2DArray, clamp } from './mapgen/utils.js';
// Import FractalWorld for plot type generation (Milestone 2)
import { createFractalWorld } from './mapgen/FractalWorld.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TERRAIN = {
  OCEAN: 'ocean',
  COAST: 'coast',
  GRASSLAND: 'grassland',
  PLAINS: 'plains',
  DESERT: 'desert',
  TUNDRA: 'tundra',
  SNOW: 'snow'
};

export const FEATURE = {
  NONE: null,
  FOREST: 'forest',
  JUNGLE: 'jungle',
  OASIS: 'oasis',
  FLOODPLAINS: 'floodplains',
  ICE: 'ice'
};

export const ELEVATION = {
  FLAT: 'flat',
  HILLS: 'hills',
  PEAKS: 'peaks'
};

const PLOT = {
  OCEAN: 0,
  COAST: 1,
  LAND: 2,
  HILLS: 3,
  PEAK: 4
};

// Note: Fractal utilities (CyFractal, FRAC_POLAR) and helpers (SeededRandom, etc.)
// are now imported from ./mapgen/ modules.
// FractalWorld handles plot type generation using Civ4's three-fractal algorithm.

// ============================================================================
// COAST DETECTION (called after FractalWorld plot generation)
// ============================================================================

/**
 * Marks ocean tiles adjacent to land as coast.
 */
function addCoastTiles(plots, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] !== PLOT.OCEAN) continue;

      let nearLand = false;
      for (let dy = -1; dy <= 1 && !nearLand; dy++) {
        for (let dx = -1; dx <= 1 && !nearLand; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = (x + dx + width) % width;
          let ny = y + dy;
          if (ny >= 0 && ny < height && plots[ny][nx] >= PLOT.LAND) {
            nearLand = true;
          }
        }
      }
      if (nearLand) plots[y][x] = PLOT.COAST;
    }
  }
}

// ============================================================================
// TERRAIN GENERATOR (Civ4's TerrainGenerator class)
// ============================================================================

/**
 * Assigns terrain types using Civ4's TerrainGenerator algorithm:
 * latitude bands + desert/plains fractals.
 *
 * @param {number[][]} plots - Plot types
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {SeededRandom} rng - RNG
 * @param {Object} climateConfig - Climate settings from gameOptions
 * @returns {string[][]} - Terrain type IDs
 */
function assignTerrainTypes(plots, width, height, rng, climateConfig) {
  const terrain = create2DArray(width, height, TERRAIN.OCEAN);

  // Civ4 TerrainGenerator defaults, adjustable by climate
  let iDesertPercent = 32;
  let iPlainsPercent = 18;
  let fSnowLatitude = 0.7;
  let fTundraLatitude = 0.6;
  let fGrassLatitude = 0.1;
  let fDesertBottomLatitude = 0.2;
  let fDesertTopLatitude = 0.5;

  // Apply climate modifications
  if (climateConfig) {
    if (climateConfig.id === 'tropical') {
      iDesertPercent = 12;
      iPlainsPercent = 20;
      fSnowLatitude = 0.85;
      fTundraLatitude = 0.8;
      fGrassLatitude = 0.15;
      fDesertBottomLatitude = 0.3;
      fDesertTopLatitude = 0.45;
    } else if (climateConfig.id === 'arid') {
      iDesertPercent = 50;
      iPlainsPercent = 25;
      fSnowLatitude = 0.75;
      fTundraLatitude = 0.65;
      fGrassLatitude = 0.05;
      fDesertBottomLatitude = 0.15;
      fDesertTopLatitude = 0.6;
    } else if (climateConfig.id === 'cold') {
      iDesertPercent = 10;
      iPlainsPercent = 20;
      fSnowLatitude = 0.5;
      fTundraLatitude = 0.4;
      fGrassLatitude = 0.05;
      fDesertBottomLatitude = 0.25;
      fDesertTopLatitude = 0.35;
    } else if (climateConfig.id === 'rocky') {
      iDesertPercent = 25;
      iPlainsPercent = 22;
      fSnowLatitude = 0.65;
      fTundraLatitude = 0.55;
    }
  }

  // Generate fractals for desert, plains, and latitude variation
  const desertFrac = createFractal(width, height, 4, rng, 0);
  const plainsFrac = createFractal(width, height, 5, rng, 0);
  const variationFrac = createFractal(width, height, 4, rng, 0);

  // Compute percentile thresholds
  const desertThresholdTop = desertFrac.getHeightFromPercent(iDesertPercent);
  const plainsThresholdTop = plainsFrac.getHeightFromPercent(iPlainsPercent);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const plot = plots[y][x];

      if (plot === PLOT.OCEAN) {
        terrain[y][x] = TERRAIN.OCEAN;
        continue;
      }
      if (plot === PLOT.COAST) {
        terrain[y][x] = TERRAIN.COAST;
        continue;
      }

      // Compute latitude: 0 at equator, 1 at poles
      const latNorm = y / Math.max(1, height - 1); // 0=top, 1=bottom
      const distFromEquator = Math.abs(latNorm - 0.5) * 2; // 0=equator, 1=pole

      // Apply variation fractal: ±10% (Civ4: (128 - variation) / (255 * 5) ≈ ±0.1)
      const variation = (128 - variationFrac.getHeight(x, y)) / (255 * 5);
      const lat = clamp(distFromEquator + variation, 0, 1);

      if (lat >= fSnowLatitude) {
        terrain[y][x] = TERRAIN.SNOW;
      } else if (lat >= fTundraLatitude) {
        terrain[y][x] = TERRAIN.TUNDRA;
      } else if (lat < fGrassLatitude) {
        terrain[y][x] = TERRAIN.GRASSLAND;
      } else if (lat >= fDesertBottomLatitude && lat < fDesertTopLatitude &&
                 desertFrac.getHeight(x, y) <= desertThresholdTop) {
        terrain[y][x] = TERRAIN.DESERT;
      } else if (plainsFrac.getHeight(x, y) <= plainsThresholdTop) {
        terrain[y][x] = TERRAIN.PLAINS;
      } else {
        terrain[y][x] = TERRAIN.GRASSLAND;
      }
    }
  }

  return terrain;
}

// ============================================================================
// FEATURE GENERATOR (Civ4's FeatureGenerator class)
// ============================================================================

/**
 * Places features using Civ4's FeatureGenerator algorithm:
 * fractal-based thresholds for jungle/forest, probability-based ice.
 *
 * @param {string[][]} terrain - Terrain types
 * @param {number[][]} plots - Plot types
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {SeededRandom} rng - RNG
 * @returns {string[][]} - Feature IDs
 */
function placeFeatures(terrain, plots, width, height, rng) {
  const features = create2DArray(width, height, FEATURE.NONE);

  // Generate fractals for jungle and forest (Civ4 grains: jungle=5, forest=6)
  const jungleFrac = createFractal(width, height, 5, rng, 0);
  const forestFrac = createFractal(width, height, 6, rng, 0);

  // Civ4 defaults
  const iJunglePercent = 80;
  const iForestPercent = 60;
  const fJungleLatitude = 0.25; // jungle only within this latitude of equator

  // Compute thresholds
  // Jungle: tiles in the top iJunglePercent of the fractal are eligible
  const jungleLevel = jungleFrac.getHeightFromPercent(100 - iJunglePercent);
  // Forest: tiles in the top iForestPercent are eligible
  const forestLevel = forestFrac.getHeightFromPercent(100 - iForestPercent);

  // Ice placement parameters
  const iceLatitude = 0.9; // ice only at very high latitudes

  // 1. Place ice on polar ocean/coast tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = terrain[y][x];
      if (t !== TERRAIN.OCEAN && t !== TERRAIN.COAST) continue;

      const latNorm = y / Math.max(1, height - 1);
      const lat = Math.abs(latNorm - 0.5) * 2; // 0=equator, 1=pole

      if (lat >= iceLatitude) {
        // Inner ice band: high probability
        if (rng.next() < 8 * (lat - iceLatitude)) {
          features[y][x] = FEATURE.ICE;
        }
      } else if (lat >= iceLatitude - 0.1) {
        // Outer ice band: lower probability
        if (rng.next() < 4 * (lat - (iceLatitude - 0.1))) {
          features[y][x] = FEATURE.ICE;
        }
      }
    }
  }

  // 2. Place jungle (equatorial, fractal-controlled)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (features[y][x] !== FEATURE.NONE) continue;

      const t = terrain[y][x];
      const p = plots[y][x];

      // Jungle only on grassland flat/hills
      if (t !== TERRAIN.GRASSLAND) continue;
      if (p === PLOT.PEAK || p <= PLOT.COAST) continue;

      // Latitude check: jungle only near equator
      const latNorm = y / Math.max(1, height - 1);
      const lat = Math.abs(latNorm - 0.5) * 2;
      if (lat > fJungleLatitude) continue;

      // Fractal check with latitude factor: jungle range shrinks with distance from equator
      const jungleHeight = jungleFrac.getHeight(x, y);
      const latFactor = lat / fJungleLatitude; // 0 at equator, 1 at jungle boundary
      const adjustedLevel = jungleLevel + (255 - jungleLevel) * latFactor * 0.5;

      if (jungleHeight >= adjustedLevel) {
        features[y][x] = FEATURE.JUNGLE;
      }
    }
  }

  // 3. Place forest (any non-polar latitude, fractal-controlled)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (features[y][x] !== FEATURE.NONE) continue;

      const t = terrain[y][x];
      const p = plots[y][x];

      // Forest on grassland, plains, or tundra; flat or hills
      if (t !== TERRAIN.GRASSLAND && t !== TERRAIN.PLAINS && t !== TERRAIN.TUNDRA) continue;
      if (p === PLOT.PEAK || p <= PLOT.COAST) continue;

      const forestHeight = forestFrac.getHeight(x, y);
      if (forestHeight >= forestLevel) {
        features[y][x] = FEATURE.FOREST;
      }
    }
  }

  // 4. Place oasis on desert flat tiles (Civ4 XML appearance probability)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (features[y][x] !== FEATURE.NONE) continue;

      const t = terrain[y][x];
      const p = plots[y][x];

      if (t !== TERRAIN.DESERT || p !== PLOT.LAND) continue;

      // Check no adjacent water or oasis (Civ4 rule)
      let hasAdjacentWaterOrOasis = false;
      for (let dy = -1; dy <= 1 && !hasAdjacentWaterOrOasis; dy++) {
        for (let dx = -1; dx <= 1 && !hasAdjacentWaterOrOasis; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + width) % width;
          const ny = y + dy;
          if (ny >= 0 && ny < height) {
            if (plots[ny][nx] <= PLOT.COAST) hasAdjacentWaterOrOasis = true;
            if (features[ny][nx] === FEATURE.OASIS) hasAdjacentWaterOrOasis = true;
          }
        }
      }

      if (!hasAdjacentWaterOrOasis && rng.next() < 0.03) {
        features[y][x] = FEATURE.OASIS;
      }
    }
  }

  return features;
}

/**
 * Places floodplains along rivers in desert.
 * Checks edge-based river adjacency.
 */
function placeFloodplains(terrain, rivers, features, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrain[y][x] === TERRAIN.DESERT && tileHasRiver(rivers, x, y, width, height)) {
        features[y][x] = FEATURE.FLOODPLAINS;
      }
    }
  }
}

// ============================================================================
// EDGE-BASED RIVER GENERATION
// ============================================================================

/**
 * Checks if a tile has any river on its edges.
 */
function tileHasRiver(rivers, x, y, width, height) {
  const r = rivers[y][x];
  if (r.isNOfRiver || r.isWOfRiver) return true;
  // Check east neighbor's west edge
  const ex = (x + 1) % width;
  if (rivers[y][ex].isWOfRiver) return true;
  // Check south neighbor's north edge
  if (y + 1 < height && rivers[y + 1][x].isNOfRiver) return true;
  return false;
}

/**
 * Generates rivers with edge-based flow model matching Civ4.
 *
 * Rivers flow along tile edges, not through tile centers.
 * Each tile stores:
 *   isNOfRiver: river along north edge (between this tile and tile above)
 *   isWOfRiver: river along west edge (between this tile and tile to the left)
 *   riverFlowN: direction of flow along north edge (EAST or WEST)
 *   riverFlowW: direction of flow along west edge (NORTH or SOUTH)
 *
 * @param {number[][]} plots - Plot types
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {SeededRandom} rng - RNG
 * @returns {Object[][]} - River edge data for each tile
 */
function generateRivers(plots, width, height, rng) {
  const rivers = create2DArray(width, height, () => ({
    isNOfRiver: false,
    isWOfRiver: false,
    riverFlowN: null, // 'E' or 'W'
    riverFlowW: null  // 'N' or 'S'
  }));

  // Generate an elevation fractal for river flow (rivers need height data)
  const elevFrac = createFractal(width, height, 2, rng, FRAC_POLAR);

  // Build elevation map from plots + fractal
  // Peaks > Hills > Land > Coast > Ocean
  const elevation = create2DArray(width, height, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let base;
      switch (plots[y][x]) {
        case PLOT.PEAK: base = 4; break;
        case PLOT.HILLS: base = 3; break;
        case PLOT.LAND: base = 2; break;
        case PLOT.COAST: base = 1; break;
        default: base = 0;
      }
      // Add fractal variation within each elevation band
      elevation[y][x] = base + (elevFrac.getHeight(x, y) / 255) * 0.8;
    }
  }

  // Find river sources: land tiles with high elevation
  const sources = [];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] >= PLOT.HILLS) {
        sources.push({ x, y, priority: elevation[y][x] + rng.next() * 0.5 });
      }
    }
  }
  sources.sort((a, b) => b.priority - a.priority);

  const numRivers = Math.floor(Math.sqrt(width * height) * 0.3);
  const usedEdges = new Set();

  for (let i = 0; i < Math.min(numRivers, sources.length); i++) {
    // Pick from top candidates with some randomness
    const sourceIdx = Math.min(
      Math.floor(rng.next() * Math.min(10, sources.length)),
      sources.length - 1
    );
    const source = sources.splice(sourceIdx, 1)[0];

    // Trace river from source downhill along tile edges
    traceRiver(source.x, source.y, elevation, plots, rivers, width, height, rng, usedEdges);
  }

  return rivers;
}

/**
 * Traces a single river from a source tile along edges downhill.
 *
 * The river moves between tile corners (vertices), and each segment
 * is recorded as an edge on the appropriate tile.
 */
function traceRiver(startX, startY, elevation, plots, rivers, width, height, rng, usedEdges) {
  // Start at a corner of the source tile
  // Corner (cx, cy) is the top-left corner of tile (cx, cy)
  // We start at the corner closest to highest ground
  let cx = startX;
  let cy = startY;

  const maxSteps = Math.floor(Math.sqrt(width * height));
  const visited = new Set();

  for (let step = 0; step < maxSteps; step++) {
    const key = `${cx},${cy}`;
    if (visited.has(key)) break;
    visited.add(key);

    // Check if we've reached water - look at tiles around this corner
    const cornerTiles = getCornerTiles(cx, cy, width, height);
    const allWater = cornerTiles.every(([tx, ty]) =>
      ty < 0 || ty >= height || plots[ty][tx] <= PLOT.COAST
    );
    if (allWater) break;

    // Find the lowest adjacent corner
    const neighbors = [
      { ncx: cx + 1, ncy: cy, edgeDir: 'N', edgeTileX: cx, edgeTileY: cy },     // east along top edge
      { ncx: cx - 1, ncy: cy, edgeDir: 'N', edgeTileX: cx - 1, edgeTileY: cy },  // west along top edge
      { ncx: cx, ncy: cy + 1, edgeDir: 'W', edgeTileX: cx, edgeTileY: cy },      // south along left edge
      { ncx: cx, ncy: cy - 1, edgeDir: 'W', edgeTileX: cx, edgeTileY: cy - 1 },  // north along left edge
    ];

    let bestNeighbor = null;
    let lowestElev = Infinity;

    rng.shuffle(neighbors);

    for (const n of neighbors) {
      let ncx = n.ncx;
      let ncy = n.ncy;

      // World wrap x
      if (ncx < 0) ncx = width;
      if (ncx > width) ncx = 0;
      // Y bounds
      if (ncy < 0 || ncy > height) continue;

      const edgeKey = `${Math.min(cx, ncx)},${Math.min(cy, ncy)},${n.edgeDir}`;
      if (usedEdges.has(edgeKey)) continue;

      // Elevation at corner = average of surrounding tiles
      const elev = cornerElevation(ncx, ncy, elevation, width, height);
      const jitter = rng.next() * 0.1; // small random factor for meandering

      if (elev + jitter < lowestElev) {
        lowestElev = elev + jitter;
        bestNeighbor = { ...n, ncx, ncy, edgeKey };
      }
    }

    if (!bestNeighbor) break;
    if (lowestElev >= cornerElevation(cx, cy, elevation, width, height) + 0.3) break; // can't flow uphill

    // Mark the edge
    usedEdges.add(bestNeighbor.edgeKey);
    const etx = ((bestNeighbor.edgeTileX % width) + width) % width;
    const ety = bestNeighbor.edgeTileY;

    if (ety >= 0 && ety < height) {
      if (bestNeighbor.edgeDir === 'N') {
        rivers[ety][etx].isNOfRiver = true;
        // Flow direction: which way does water flow along this N edge?
        rivers[ety][etx].riverFlowN = (bestNeighbor.ncx > cx) ? 'E' : 'W';
      } else if (bestNeighbor.edgeDir === 'W') {
        rivers[ety][etx].isWOfRiver = true;
        // Flow direction along W edge
        rivers[ety][etx].riverFlowW = (bestNeighbor.ncy > cy) ? 'S' : 'N';
      }
    }

    cx = bestNeighbor.ncx;
    cy = bestNeighbor.ncy;
  }
}

/**
 * Gets the tiles that share a given corner.
 * Corner (cx, cy) is shared by tiles (cx-1,cy-1), (cx,cy-1), (cx-1,cy), (cx,cy).
 */
// eslint-disable-next-line no-unused-vars
function getCornerTiles(cx, cy, width, height) {
  const tiles = [];
  for (let dy = -1; dy <= 0; dy++) {
    for (let dx = -1; dx <= 0; dx++) {
      const tx = ((cx + dx) % width + width) % width;
      const ty = cy + dy;
      tiles.push([tx, ty]);
    }
  }
  return tiles;
}

/**
 * Computes elevation at a tile corner by averaging surrounding tiles.
 */
function cornerElevation(cx, cy, elevation, width, height) {
  const tiles = getCornerTiles(cx, cy, width, height);
  let sum = 0, count = 0;
  for (const [tx, ty] of tiles) {
    if (ty >= 0 && ty < height) {
      sum += elevation[ty][tx];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ============================================================================
// RESOURCE PLACEMENT
// ============================================================================

const RESOURCE_RULES = {
  // Strategic
  iron: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.TUNDRA, TERRAIN.DESERT], requiresHills: false, hillsBonus: 2 },
  copper: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.TUNDRA, TERRAIN.DESERT], requiresHills: true },
  horse: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: false, noFeature: true },
  oil: { terrain: [TERRAIN.DESERT, TERRAIN.TUNDRA, TERRAIN.SNOW], requiresHills: false, canBeCoastal: true },
  uranium: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.DESERT, TERRAIN.TUNDRA], requiresHills: false },
  coal: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: true },
  aluminum: { terrain: [TERRAIN.PLAINS, TERRAIN.TUNDRA], requiresHills: true },

  // Luxury
  gold_resource: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.DESERT], requiresHills: true },
  silver: { terrain: [TERRAIN.TUNDRA, TERRAIN.DESERT], requiresHills: true },
  gems: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: false, requiresJungle: true },
  silk: { terrain: [TERRAIN.GRASSLAND], requiresHills: false, requiresForest: true },
  spices: { terrain: [TERRAIN.GRASSLAND], requiresHills: false, requiresJungle: true },
  wine: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: true },
  ivory: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: false },
  furs: { terrain: [TERRAIN.TUNDRA], requiresHills: false, requiresForest: true },
  dyes: { terrain: [TERRAIN.GRASSLAND], requiresHills: false, requiresJungle: true },
  incense: { terrain: [TERRAIN.DESERT], requiresHills: false },

  // Bonus
  wheat: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: false, noFeature: true },
  corn: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: false, noFeature: true },
  rice: { terrain: [TERRAIN.GRASSLAND], requiresHills: false, requiresFloodplains: true },
  cow: { terrain: [TERRAIN.GRASSLAND], requiresHills: false, noFeature: true },
  pig: { terrain: [TERRAIN.GRASSLAND], requiresHills: false, requiresForest: true },
  sheep: { terrain: [TERRAIN.GRASSLAND, TERRAIN.PLAINS], requiresHills: true },
  deer: { terrain: [TERRAIN.TUNDRA], requiresHills: false, requiresForest: true },
  fish: { terrain: [TERRAIN.COAST], isWater: true },
  clam: { terrain: [TERRAIN.COAST], isWater: true },
  crab: { terrain: [TERRAIN.COAST], isWater: true }
};

function placeResources(terrain, plots, features, rng, density = 1.0) {
  const height = terrain.length;
  const width = terrain[0].length;
  const resources = create2DArray(width, height, null);

  const totalTiles = width * height;
  const landTiles = plots.flat().filter(p => p >= PLOT.LAND).length;
  const waterTiles = totalTiles - landTiles;

  const resourceCounts = {
    iron: Math.floor(landTiles * 0.012 * density),
    copper: Math.floor(landTiles * 0.012 * density),
    horse: Math.floor(landTiles * 0.015 * density),
    oil: Math.floor(landTiles * 0.008 * density),
    uranium: Math.floor(landTiles * 0.005 * density),
    coal: Math.floor(landTiles * 0.010 * density),
    aluminum: Math.floor(landTiles * 0.008 * density),
    gold_resource: Math.floor(landTiles * 0.008 * density),
    silver: Math.floor(landTiles * 0.008 * density),
    gems: Math.floor(landTiles * 0.006 * density),
    silk: Math.floor(landTiles * 0.006 * density),
    spices: Math.floor(landTiles * 0.006 * density),
    wine: Math.floor(landTiles * 0.008 * density),
    ivory: Math.floor(landTiles * 0.005 * density),
    furs: Math.floor(landTiles * 0.008 * density),
    dyes: Math.floor(landTiles * 0.006 * density),
    incense: Math.floor(landTiles * 0.006 * density),
    wheat: Math.floor(landTiles * 0.015 * density),
    corn: Math.floor(landTiles * 0.015 * density),
    rice: Math.floor(landTiles * 0.008 * density),
    cow: Math.floor(landTiles * 0.012 * density),
    pig: Math.floor(landTiles * 0.010 * density),
    sheep: Math.floor(landTiles * 0.010 * density),
    deer: Math.floor(landTiles * 0.010 * density),
    fish: Math.floor(waterTiles * 0.020 * density),
    clam: Math.floor(waterTiles * 0.010 * density),
    crab: Math.floor(waterTiles * 0.010 * density)
  };

  for (const [resourceId, count] of Object.entries(resourceCounts)) {
    const rules = RESOURCE_RULES[resourceId];
    if (!rules || count === 0) continue;

    const validTiles = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (resources[y][x] !== null) continue;

        const t = terrain[y][x];
        const p = plots[y][x];
        const f = features[y][x];

        if (!rules.terrain.includes(t)) continue;
        if (rules.isWater && p !== PLOT.COAST) continue;
        if (!rules.isWater && (p === PLOT.OCEAN || p === PLOT.COAST)) continue;
        if (rules.requiresHills && p !== PLOT.HILLS) continue;
        if (rules.noFeature && f !== FEATURE.NONE) continue;
        if (rules.requiresForest && f !== FEATURE.FOREST) continue;
        if (rules.requiresJungle && f !== FEATURE.JUNGLE) continue;
        if (rules.requiresFloodplains && f !== FEATURE.FLOODPLAINS) continue;

        let weight = 1;
        if (rules.hillsBonus && p === PLOT.HILLS) weight = rules.hillsBonus;
        validTiles.push({ x, y, weight });
      }
    }

    if (validTiles.length > 0) {
      rng.shuffle(validTiles);
      let placed = 0;

      for (const tile of validTiles) {
        if (placed >= count) break;

        let tooClose = false;
        const minDist = 3;
        for (let dy = -minDist; dy <= minDist && !tooClose; dy++) {
          for (let dx = -minDist; dx <= minDist && !tooClose; dx++) {
            let nx = ((tile.x + dx) % width + width) % width;
            let ny = tile.y + dy;
            if (ny >= 0 && ny < height && resources[ny][nx] === resourceId) {
              tooClose = true;
            }
          }
        }

        if (!tooClose) {
          resources[tile.y][tile.x] = resourceId;
          placed++;
        }
      }
    }
  }

  return resources;
}

// ============================================================================
// STARTING LOCATION SELECTION
// ============================================================================

function findStartingLocations(mapData, numPlayers) {
  const { terrain, plots, resources, rivers, width, height } = mapData;

  const scores = [];

  for (let y = 2; y < height - 2; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] < PLOT.LAND) continue;
      if (plots[y][x] === PLOT.PEAK) continue;

      let score = 0;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          let nx = ((x + dx) % width + width) % width;
          let ny = y + dy;
          if (ny < 0 || ny >= height) continue;

          if (terrain[ny][nx] === TERRAIN.GRASSLAND) score += 3;
          if (terrain[ny][nx] === TERRAIN.PLAINS) score += 2;
          if (terrain[ny][nx] === TERRAIN.COAST) score += 1;
          if (plots[ny][nx] === PLOT.HILLS) score += 2;
          if (resources[ny][nx]) score += 5;
          if (tileHasRiver(rivers, nx, ny, width, height)) score += 4;
        }
      }

      let hasCoast = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let nx = ((x + dx) % width + width) % width;
          let ny = y + dy;
          if (ny >= 0 && ny < height && terrain[ny][nx] === TERRAIN.COAST) {
            hasCoast = true;
          }
        }
      }
      if (hasCoast) score += 5;

      scores.push({ x, y, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  const startLocs = [];
  const minDist = Math.floor(Math.sqrt(width * height) / Math.sqrt(numPlayers) * 0.7);

  for (const candidate of scores) {
    if (startLocs.length >= numPlayers) break;

    let tooClose = false;
    for (const existing of startLocs) {
      const dx = Math.abs(candidate.x - existing.x);
      const wrapDx = Math.min(dx, width - dx);
      const dy = Math.abs(candidate.y - existing.y);
      const dist = Math.sqrt(wrapDx * wrapDx + dy * dy);
      if (dist < minDist) { tooClose = true; break; }
    }

    if (!tooClose) {
      startLocs.push({ x: candidate.x, y: candidate.y });
    }
  }

  return startLocs;
}

// ============================================================================
// SHIFT PLOT TYPES (Civ4's shiftPlotTypes)
// ============================================================================

function shiftPlotTypes(mapData) {
  const { width, height, plots } = mapData;
  const stripWidth = Math.max(5, Math.floor(width * 0.15));

  let bestOffset = 0;
  let minLand = Infinity;

  for (let offset = 0; offset < width; offset++) {
    let landCount = 0;
    for (let y = 0; y < height; y++) {
      for (let s = 0; s < stripWidth; s++) {
        const x = (offset + s) % width;
        if (plots[y][x] >= PLOT.LAND) landCount++;
      }
    }
    if (landCount < minLand) {
      minLand = landCount;
      bestOffset = offset;
    }
  }

  if (bestOffset === 0) return;

  const arrayKeys = ['heightmap', 'plots', 'terrain', 'features', 'resources', 'rivers'];

  for (const key of arrayKeys) {
    const arr = mapData[key];
    if (!arr || !Array.isArray(arr) || !Array.isArray(arr[0])) continue;
    for (let y = 0; y < height; y++) {
      const row = arr[y];
      const shifted = new Array(width);
      for (let x = 0; x < width; x++) {
        shifted[x] = row[(x + bestOffset) % width];
      }
      arr[y] = shifted;
    }
  }

  if (mapData.startingLocations) {
    for (const loc of mapData.startingLocations) {
      loc.x = (loc.x - bestOffset + width) % width;
    }
  }
}

// ============================================================================
// MAP TYPE CONFIGURATIONS
// ============================================================================

/**
 * Returns fractal parameters for each map type, matching Civ4 map scripts.
 */
function getMapTypeParams(mapType, mapTypeConfig) {
  const defaults = {
    waterPercent: 75,
    continentGrain: 2,
    grainAmount: 3,
    polar: true,
    centerRift: false,
    hillGroupOneBase: 25,
    hillGroupOneRange: 9,
    hillGroupTwoBase: 75,
    hillGroupTwoRange: 9,
    peakPercent: 4,
    doShift: false
  };

  switch (mapType) {
    case 'pangaea':
      return {
        ...defaults,
        waterPercent: 58,
        continentGrain: 1,
        polar: true,
        centerRift: false,
        doShift: false
      };

    case 'continents':
      return {
        ...defaults,
        waterPercent: 75,
        continentGrain: 2,
        polar: true,
        centerRift: true,
        doShift: true
      };

    case 'archipelago':
      return {
        ...defaults,
        waterPercent: 70,
        continentGrain: 4,
        polar: true,
        centerRift: false,
        doShift: false
      };

    case 'terra':
      return {
        ...defaults,
        waterPercent: 55,
        continentGrain: 2,
        polar: true,
        centerRift: true,
        doShift: true
      };

    case 'fractal':
      return {
        ...defaults,
        waterPercent: 50,
        continentGrain: 2,
        polar: true,
        centerRift: false,
        doShift: false
      };

    case 'inland_sea':
      return {
        ...defaults,
        waterPercent: 45,
        continentGrain: 3,
        polar: true,
        centerRift: false,
        doShift: false
      };

    case 'lakes':
      return {
        ...defaults,
        waterPercent: 40,
        continentGrain: 4,
        polar: true,
        centerRift: false,
        doShift: false
      };

    case 'oasis':
      return {
        ...defaults,
        waterPercent: 45,
        continentGrain: 3,
        polar: false,
        centerRift: false,
        doShift: false
      };

    case 'ice_age':
      return {
        ...defaults,
        waterPercent: 65,
        continentGrain: 3,
        polar: true,
        centerRift: false,
        doShift: false
      };

    case 'mirror':
      return {
        ...defaults,
        waterPercent: 50,
        continentGrain: 2,
        polar: true,
        centerRift: true,
        doShift: true
      };

    default:
      return {
        ...defaults,
        waterPercent: Math.round((1 - (mapTypeConfig?.landPercent || 0.29)) * 100),
        doShift: false
      };
  }
}

// ============================================================================
// MAIN MAP GENERATION
// ============================================================================

export function generateMap(settings) {
  const {
    mapType = 'continents',
    mapSize = 'standard',
    climate = 'temperate',
    seaLevel = 'medium',
    numPlayers = 7,
    seed = Date.now()
  } = settings;

  const mapTypeConfig = getMapTypeConfig(mapType);
  const mapSizeConfig = getMapSizeConfig(mapSize);
  const climateConfig = getClimateConfig(climate);
  const seaLevelConfig = getSeaLevelConfig(seaLevel);

  const width = mapSizeConfig.tilesWidth;
  const height = mapSizeConfig.tilesHeight;
  const rng = new SeededRandom(seed);

  console.log(`Generating ${mapType} map (${width}x${height}) with seed ${seed}`);

  // Get map-type-specific fractal parameters
  const params = getMapTypeParams(mapType, mapTypeConfig);

  // Apply sea level adjustment to water percent
  const seaLevelAdjust = (seaLevelConfig?.landAdjustment || 0) * 100;
  params.waterPercent = clamp(params.waterPercent - seaLevelAdjust, 25, 90);

  // Apply climate modifiers for hills/peaks
  if (climateConfig?.id === 'rocky') {
    params.hillGroupOneRange = 12;
    params.hillGroupTwoRange = 12;
    params.peakPercent = 6;
  }

  // Step 1: Generate plot types using FractalWorld class (Milestone 2)
  console.log('Generating plot types (FractalWorld)...');
  const plots = createFractalWorld(width, height, rng, {
    waterPercent: params.waterPercent,
    continentGrain: params.continentGrain,
    grainAmount: params.grainAmount,
    polar: params.polar,
    centerRift: params.centerRift,
    hillGroupOneRange: params.hillGroupOneRange,
    hillGroupTwoRange: params.hillGroupTwoRange,
    peakPercent: params.peakPercent,
    // Note: doShift is handled in post-processing step below
    doShift: false
  });
  // Add coast tiles (ocean adjacent to land becomes coast)
  addCoastTiles(plots, width, height);

  // Generate a heightmap for the 3D renderer (visual elevation variation)
  // This is NOT used for game logic — purely for rendering smooth terrain
  const renderFrac = createFractal(width, height, 3, rng, 0);
  const heightmap = create2DArray(width, height, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heightmap[y][x] = renderFrac.getHeight(x, y) / 255;
    }
  }

  // Step 2: Assign terrain types using TerrainGenerator model
  console.log('Assigning terrain types (TerrainGenerator)...');
  const terrain = assignTerrainTypes(plots, width, height, rng, climateConfig);

  // Step 3: Generate rivers (edge-based)
  console.log('Generating rivers...');
  const rivers = generateRivers(plots, width, height, rng);

  // Step 4: Place features (FeatureGenerator model)
  console.log('Placing features (FeatureGenerator)...');
  const features = placeFeatures(terrain, plots, width, height, rng);
  placeFloodplains(terrain, rivers, features, width, height);

  // Step 5: Place resources
  console.log('Placing resources...');
  const resourceDensity = mapTypeConfig?.resourceDensity || 1.0;
  const resources = placeResources(terrain, plots, features, rng, resourceDensity);

  // Step 6: Find starting locations
  console.log('Finding starting locations...');
  const mapData = { terrain, plots, features, resources, rivers, width, height };
  const startingLocations = findStartingLocations(mapData, numPlayers);

  // Step 7: Shift map (continents/terra/mirror)
  if (params.doShift) {
    console.log('Shifting map to center continents...');
    const shiftData = { width, height, heightmap, plots, terrain, features, resources, rivers, startingLocations };
    shiftPlotTypes(shiftData);
  }

  console.log('Map generation complete!');

  return {
    width,
    height,
    seed,
    settings: { mapType, mapSize, climate, seaLevel, numPlayers },

    heightmap,
    plots,
    terrain,
    features,
    resources,
    rivers,
    startingLocations,

    // getTile helper with edge-based river support
    getTile(x, y) {
      while (x < 0) x += width;
      while (x >= width) x -= width;
      if (y < 0 || y >= height) return null;

      return {
        x, y,
        plot: plots[y][x],
        terrain: terrain[y][x],
        feature: features[y][x],
        resource: resources[y][x],
        river: rivers[y][x],

        isWater: plots[y][x] <= PLOT.COAST,
        isLand: plots[y][x] >= PLOT.LAND,
        isHills: plots[y][x] === PLOT.HILLS,
        isPeak: plots[y][x] === PLOT.PEAK,
        hasRiver: tileHasRiver(rivers, x, y, width, height),

        // Edge-based river data
        isNOfRiver: rivers[y][x].isNOfRiver,
        isWOfRiver: rivers[y][x].isWOfRiver,
        riverFlowN: rivers[y][x].riverFlowN,
        riverFlowW: rivers[y][x].riverFlowW
      };
    },

    getElevation(x, y) {
      while (x < 0) x += width;
      while (x >= width) x -= width;
      if (y < 0 || y >= height) return null;

      const plot = plots[y][x];
      if (plot === PLOT.PEAK) return ELEVATION.PEAKS;
      if (plot === PLOT.HILLS) return ELEVATION.HILLS;
      return ELEVATION.FLAT;
    }
  };
}

// ============================================================================
// MAP TYPE SPECIFIC GENERATORS
// ============================================================================

export function generatePangaea(settings) {
  return generateMap({ ...settings, mapType: 'pangaea' });
}

export function generateContinents(settings) {
  return generateMap({ ...settings, mapType: 'continents' });
}

export function generateArchipelago(settings) {
  return generateMap({ ...settings, mapType: 'archipelago' });
}

export function generateTerra(settings) {
  return generateMap({ ...settings, mapType: 'terra' });
}

// ============================================================================
// DEBUG/VISUALIZATION HELPERS
// ============================================================================

export function mapToAscii(mapData) {
  const { width, height, terrain, plots, features, resources } = mapData;
  const lines = [];

  const terrainChars = {
    [TERRAIN.OCEAN]: '~',
    [TERRAIN.COAST]: ',',
    [TERRAIN.GRASSLAND]: 'g',
    [TERRAIN.PLAINS]: 'p',
    [TERRAIN.DESERT]: 'd',
    [TERRAIN.TUNDRA]: 't',
    [TERRAIN.SNOW]: 's'
  };

  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      if (resources[y][x]) {
        line += '*';
      } else if (plots[y][x] === PLOT.PEAK) {
        line += '^';
      } else if (plots[y][x] === PLOT.HILLS) {
        line += 'h';
      } else if (features[y][x] === FEATURE.FOREST) {
        line += 'F';
      } else if (features[y][x] === FEATURE.JUNGLE) {
        line += 'J';
      } else if (features[y][x] === FEATURE.ICE) {
        line += 'I';
      } else {
        line += terrainChars[terrain[y][x]] || '?';
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

export function getMapStats(mapData) {
  const { width, height, plots, terrain, features, resources, startingLocations } = mapData;
  const total = width * height;

  const stats = {
    dimensions: `${width}x${height}`,
    totalTiles: total,
    land: 0,
    water: 0,
    hills: 0,
    peaks: 0,
    terrain: {},
    features: {},
    resources: {},
    startingLocations: startingLocations.length
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] <= PLOT.COAST) stats.water++;
      else stats.land++;
      if (plots[y][x] === PLOT.HILLS) stats.hills++;
      if (plots[y][x] === PLOT.PEAK) stats.peaks++;

      const t = terrain[y][x];
      stats.terrain[t] = (stats.terrain[t] || 0) + 1;

      const f = features[y][x];
      if (f) stats.features[f] = (stats.features[f] || 0) + 1;

      const r = resources[y][x];
      if (r) stats.resources[r] = (stats.resources[r] || 0) + 1;
    }
  }

  stats.landPercent = ((stats.land / total) * 100).toFixed(1) + '%';
  stats.waterPercent = ((stats.water / total) * 100).toFixed(1) + '%';
  stats.hillsPercent = ((stats.hills / Math.max(1, stats.land)) * 100).toFixed(1) + '%';
  stats.peaksPercent = ((stats.peaks / Math.max(1, stats.land)) * 100).toFixed(1) + '%';

  return stats;
}

export default {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra,
  mapToAscii,
  getMapStats,
  TERRAIN,
  FEATURE,
  ELEVATION
};
