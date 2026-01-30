/**
 * Civilization IV: Beyond the Sword - Map Generation Algorithm
 *
 * This module implements Civ4 BTS-accurate map generation using:
 * - Midpoint displacement (diamond-square) for heightmap generation
 * - Plate tectonics simulation for realistic continent shapes
 * - Climate simulation with temperature, prevailing winds, and rainfall
 * - Altitude-based terrain assignment using height *differences* (not absolute)
 * - River generation following accurate drainage paths
 * - Resource placement following Civ4 XML rules
 *
 * References:
 * - PerfectWorld2.py by Cephalo (CivFanatics)
 * - CIV4MapScripts (samboy/misc-civ4-mapscripts)
 * - Original Civ4 BTS game data
 */

import {
  getMapTypeConfig,
  getMapSizeConfig,
  getClimateConfig,
  getSeaLevelConfig
} from '../data/gameOptions';

// ============================================================================
// CONSTANTS
// ============================================================================

// Terrain type IDs (matching terrainTypes.js)
export const TERRAIN = {
  OCEAN: 'ocean',
  COAST: 'coast',
  GRASSLAND: 'grassland',
  PLAINS: 'plains',
  DESERT: 'desert',
  TUNDRA: 'tundra',
  SNOW: 'snow'
};

// Feature type IDs
export const FEATURE = {
  NONE: null,
  FOREST: 'forest',
  JUNGLE: 'jungle',
  OASIS: 'oasis',
  FLOODPLAINS: 'floodplains',
  ICE: 'ice'
};

// Elevation types
export const ELEVATION = {
  FLAT: 'flat',
  HILLS: 'hills',
  PEAKS: 'peaks'
};

// Plot types (internal)
const PLOT = {
  OCEAN: 0,
  COAST: 1,
  LAND: 2,
  HILLS: 3,
  PEAK: 4
};

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Mulberry32 PRNG - Fast, seedable, good distribution
 * Used for reproducible map generation from a seed
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  // Returns float [0, 1)
  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Returns integer [min, max]
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Returns float [min, max)
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  // Gaussian distribution (Box-Muller transform)
  nextGaussian(mean = 0, stdDev = 1) {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Shuffle array in place
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// ============================================================================
// 2D ARRAY UTILITIES
// ============================================================================

function create2DArray(width, height, defaultValue = 0) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () =>
      typeof defaultValue === 'function' ? defaultValue() : defaultValue
    )
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ============================================================================
// HEIGHTMAP GENERATION - MIDPOINT DISPLACEMENT (DIAMOND-SQUARE)
// ============================================================================

/**
 * Generates a heightmap using the diamond-square algorithm (midpoint displacement)
 * This creates natural-looking fractal terrain
 *
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {SeededRandom} rng - Seeded random number generator
 * @param {number} roughness - How rough/varied the terrain is (0.4-0.7 typical)
 * @returns {number[][]} - 2D array of heights [0, 1]
 */
function generateHeightmap(width, height, rng, roughness = 0.55) {
  // Diamond-square requires power of 2 + 1 sized grid
  const size = Math.max(
    Math.pow(2, Math.ceil(Math.log2(Math.max(width, height) - 1))) + 1,
    65 // Minimum size for good detail
  );

  const heightmap = create2DArray(size, size, 0);

  // Initialize corners with random values
  heightmap[0][0] = rng.next();
  heightmap[0][size - 1] = rng.next();
  heightmap[size - 1][0] = rng.next();
  heightmap[size - 1][size - 1] = rng.next();

  let step = size - 1;
  let scale = 1.0;

  while (step > 1) {
    const halfStep = step / 2;

    // Diamond step: Set center points
    for (let y = halfStep; y < size - 1; y += step) {
      for (let x = halfStep; x < size - 1; x += step) {
        const avg = (
          heightmap[y - halfStep][x - halfStep] +
          heightmap[y - halfStep][x + halfStep] +
          heightmap[y + halfStep][x - halfStep] +
          heightmap[y + halfStep][x + halfStep]
        ) / 4;
        heightmap[y][x] = avg + (rng.next() - 0.5) * scale;
      }
    }

    // Square step: Set edge midpoints
    for (let y = 0; y < size; y += halfStep) {
      for (let x = ((y / halfStep) % 2 === 0 ? halfStep : 0); x < size; x += step) {
        let sum = 0;
        let count = 0;

        if (y >= halfStep) { sum += heightmap[y - halfStep][x]; count++; }
        if (y + halfStep < size) { sum += heightmap[y + halfStep][x]; count++; }
        if (x >= halfStep) { sum += heightmap[y][x - halfStep]; count++; }
        if (x + halfStep < size) { sum += heightmap[y][x + halfStep]; count++; }

        heightmap[y][x] = sum / count + (rng.next() - 0.5) * scale;
      }
    }

    step = halfStep;
    scale *= roughness;
  }

  // Normalize to [0, 1]
  let min = Infinity, max = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      min = Math.min(min, heightmap[y][x]);
      max = Math.max(max, heightmap[y][x]);
    }
  }

  const range = max - min || 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heightmap[y][x] = (heightmap[y][x] - min) / range;
    }
  }

  // Resample to target size
  const result = create2DArray(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = (x / (width - 1)) * (size - 1);
      const srcY = (y / (height - 1)) * (size - 1);

      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, size - 1);
      const y1 = Math.min(y0 + 1, size - 1);

      const xFrac = srcX - x0;
      const yFrac = srcY - y0;

      // Bilinear interpolation
      result[y][x] = lerp(
        lerp(heightmap[y0][x0], heightmap[y0][x1], xFrac),
        lerp(heightmap[y1][x0], heightmap[y1][x1], xFrac),
        yFrac
      );
    }
  }

  return result;
}

// ============================================================================
// PLATE TECTONICS SIMULATION
// ============================================================================

/**
 * Simulates plate tectonics to create realistic continent shapes
 * Plates grow from seed points and create mountain ranges at boundaries
 *
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number} numPlates - Number of tectonic plates
 * @param {SeededRandom} rng - Random number generator
 * @returns {Object} - { plates: number[][], boundaries: number[][] }
 */
function generateTectonicPlates(width, height, numPlates, rng) {
  const plates = create2DArray(width, height, -1);
  const boundaries = create2DArray(width, height, 0);

  // Seed plate centers
  const plateCenters = [];
  for (let i = 0; i < numPlates; i++) {
    plateCenters.push({
      x: rng.nextInt(0, width - 1),
      y: rng.nextInt(0, height - 1),
      isOceanic: rng.next() < 0.4 // 40% chance of oceanic plate
    });
  }

  // Grow plates using flood fill with random priority
  const queue = plateCenters.map((center, i) => ({
    x: center.x,
    y: center.y,
    plate: i,
    priority: rng.next()
  }));

  // Sort by priority for varied growth
  queue.sort((a, b) => b.priority - a.priority);

  while (queue.length > 0) {
    const { x, y, plate } = queue.shift();

    if (plates[y][x] !== -1) continue;
    plates[y][x] = plate;

    // Add neighbors with random priority
    const neighbors = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    for (const { dx, dy } of neighbors) {
      let nx = x + dx;
      let ny = y + dy;

      // Handle world wrap (cylindrical)
      if (nx < 0) nx = width - 1;
      if (nx >= width) nx = 0;

      if (ny >= 0 && ny < height && plates[ny][nx] === -1) {
        const insertIndex = Math.floor(rng.next() * queue.length);
        queue.splice(insertIndex, 0, { x: nx, y: ny, plate, priority: rng.next() });
      }
    }
  }

  // Detect plate boundaries and calculate collision strength
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const currentPlate = plates[y][x];
      let boundaryStrength = 0;

      const neighbors = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
      ];

      for (const { dx, dy } of neighbors) {
        let nx = x + dx;
        let ny = y + dy;

        if (nx < 0) nx = width - 1;
        if (nx >= width) nx = 0;

        if (ny >= 0 && ny < height && plates[ny][nx] !== currentPlate) {
          boundaryStrength++;
        }
      }

      boundaries[y][x] = boundaryStrength / 8;
    }
  }

  return { plates, boundaries, plateCenters };
}

// ============================================================================
// HEIGHTMAP MODIFICATION BY TECTONICS
// ============================================================================

/**
 * Modifies heightmap based on plate tectonics
 * Raises terrain at plate boundaries to create mountain ranges
 *
 * @param {number[][]} heightmap - Base heightmap
 * @param {Object} tectonics - Tectonic plates data
 * @param {number} mountainScale - How much to raise mountains (0.2-0.5)
 * @returns {number[][]} - Modified heightmap
 */
function applyTectonicsToHeightmap(heightmap, tectonics, mountainScale = 0.35) {
  const height = heightmap.length;
  const width = heightmap[0].length;
  const { boundaries, plateCenters, plates } = tectonics;

  const result = create2DArray(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let h = heightmap[y][x];

      // Raise at plate boundaries (mountain ranges)
      const boundaryEffect = boundaries[y][x] * mountainScale;
      h += boundaryEffect;

      // Lower oceanic plates slightly
      const plateIndex = plates[y][x];
      if (plateCenters[plateIndex]?.isOceanic) {
        h -= 0.15;
      }

      result[y][x] = clamp(h, 0, 1);
    }
  }

  // Normalize
  let min = Infinity, max = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      min = Math.min(min, result[y][x]);
      max = Math.max(max, result[y][x]);
    }
  }

  const range = max - min || 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = (result[y][x] - min) / range;
    }
  }

  return result;
}

// ============================================================================
// CENTER RIFT (CONTINENT SEPARATION)
// ============================================================================

/**
 * Applies a center rift to the heightmap to split land into separate continents.
 * This is how Civ4's Continents.py creates multiple landmasses:
 * it carves a noisy vertical channel through the center of the map.
 *
 * @param {number[][]} heightmap - Heightmap to modify
 * @param {number} numRifts - Number of rift channels (1 for 2 continents, 2 for 3, etc.)
 * @param {SeededRandom} rng - Random number generator
 * @param {number} riftWidth - Width of the rift as fraction of map width (0.05-0.15)
 * @returns {number[][]} - Modified heightmap
 */
function applyPolarAttenuation(plots, rng, polarSize = 0.20) {
  const mapHeight = plots.length;
  const mapWidth = plots[0].length;

  for (let y = 0; y < mapHeight; y++) {
    // Force the top 3 and bottom 3 rows to always be ocean (deterministic)
    if (y < 3 || y >= mapHeight - 3) {
      for (let x = 0; x < mapWidth; x++) {
        plots[y][x] = PLOT.OCEAN;
      }
      continue;
    }

    const distFromEdge = Math.min(y, mapHeight - 1 - y) / (mapHeight * polarSize);
    // Probability of forcing water: 1 at edge, 0 beyond polar zone
    const t = clamp(distFromEdge, 0, 1);
    const waterProb = 1 - t * t * (3 - 2 * t);

    if (waterProb <= 0) continue;

    for (let x = 0; x < mapWidth; x++) {
      if (plots[y][x] !== PLOT.OCEAN && plots[y][x] !== PLOT.COAST) {
        if (rng.next() < waterProb) {
          plots[y][x] = PLOT.OCEAN;
        }
      }
    }
  }

  return plots;
}

function applyCenterRiftToPlots(plots, numRifts, rng, riftWidth = 0.12) {
  const mapHeight = plots.length;
  const mapWidth = plots[0].length;

  for (let r = 0; r < numRifts; r++) {
    const riftCenterX = Math.floor(mapWidth * (r + 1) / (numRifts + 1));
    const halfWidth = Math.floor(mapWidth * riftWidth / 2);

    // Random walk for jagged rift
    const riftOffsets = [];
    let offset = 0;
    for (let y = 0; y < mapHeight; y++) {
      offset += (rng.next() - 0.5) * 4;
      offset = clamp(offset, -halfWidth * 2, halfWidth * 2);
      riftOffsets.push(Math.round(offset));
    }

    for (let y = 0; y < mapHeight; y++) {
      const center = riftCenterX + riftOffsets[y];

      for (let x = 0; x < mapWidth; x++) {
        let dist = Math.abs(x - center);
        dist = Math.min(dist, mapWidth - dist);

        if (dist < halfWidth) {
          // Core rift: force to ocean
          plots[y][x] = PLOT.OCEAN;
        } else if (dist < halfWidth * 2) {
          // Edge: probabilistic water
          const edgeFactor = 1 - ((dist - halfWidth) / halfWidth);
          if (rng.next() < edgeFactor * 0.6) {
            plots[y][x] = PLOT.OCEAN;
          }
        }
      }
    }
  }

  return plots;
}

/**
 * Shifts all 2D map arrays horizontally so the widest ocean gap sits at the
 * map edge.  This is Civ4's shiftPlotTypes() — it prevents continents from
 * wrapping around the left/right seam.
 *
 * Algorithm: for every candidate x-offset, sum the land tiles in a vertical
 * strip of width ~15.  The offset whose strip has the *least* land becomes
 * the new left edge.
 */
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

  if (bestOffset === 0) return; // no shift needed

  // Shift every 2D array in mapData
  const arrayKeys = ['heightmap', 'plots', 'terrain', 'features', 'resources',
                     'rivers', 'temperature', 'rainfall'];

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

  // Shift starting locations
  if (mapData.startingLocations) {
    for (const loc of mapData.startingLocations) {
      loc.x = (loc.x - bestOffset + width) % width;
    }
  }
}

function applyCenterRift(heightmap, numRifts, rng, riftWidth = 0.12) {
  const mapHeight = heightmap.length;
  const mapWidth = heightmap[0].length;

  for (let r = 0; r < numRifts; r++) {
    // Position rifts evenly across the map
    const riftCenterX = Math.floor(mapWidth * (r + 1) / (numRifts + 1));
    const halfWidth = Math.floor(mapWidth * riftWidth / 2);

    // Generate a noise offset per row to make the rift jagged
    const riftOffsets = [];
    let offset = 0;
    for (let y = 0; y < mapHeight; y++) {
      offset += (rng.next() - 0.5) * 4; // Random walk
      offset = clamp(offset, -halfWidth * 2, halfWidth * 2);
      riftOffsets.push(Math.round(offset));
    }

    // Carve the rift by lowering heightmap values
    for (let y = 0; y < mapHeight; y++) {
      const center = riftCenterX + riftOffsets[y];

      for (let x = 0; x < mapWidth; x++) {
        let nx = x;
        // Handle world wrap
        let dist = Math.abs(nx - center);
        dist = Math.min(dist, mapWidth - dist);

        if (dist < halfWidth) {
          // Full depression in center of rift
          const depthFactor = 1 - (dist / halfWidth);
          heightmap[y][x] -= depthFactor * 0.8;
          heightmap[y][x] = Math.max(0, heightmap[y][x]);
        } else if (dist < halfWidth * 2) {
          // Gradual falloff at edges
          const edgeFactor = 1 - ((dist - halfWidth) / halfWidth);
          heightmap[y][x] -= edgeFactor * 0.25;
          heightmap[y][x] = Math.max(0, heightmap[y][x]);
        }
      }
    }
  }

  return heightmap;
}

// ============================================================================
// PLOT TYPE GENERATION (OCEAN/LAND/HILLS/PEAKS)
// ============================================================================

/**
 * Generates plot types from heightmap
 * Uses altitude DIFFERENCES (not absolute) for peaks/hills - this looks much more natural
 *
 * @param {number[][]} heightmap - Heightmap
 * @param {number} landPercent - Target land percentage
 * @param {number} hillPercent - Percentage of land that's hills (0.15-0.25)
 * @param {number} peakPercent - Percentage of land that's peaks (0.02-0.08)
 * @returns {number[][]} - Plot types
 */
function generatePlotTypes(heightmap, landPercent, hillPercent = 0.20, peakPercent = 0.05) {
  const height = heightmap.length;
  const width = heightmap[0].length;

  // Calculate altitude differences for each tile
  const altitudeDiff = create2DArray(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxDiff = 0;
      const currentHeight = heightmap[y][x];

      // Check all neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          let nx = x + dx;
          let ny = y + dy;

          // World wrap
          if (nx < 0) nx = width - 1;
          if (nx >= width) nx = 0;

          if (ny >= 0 && ny < height) {
            const diff = currentHeight - heightmap[ny][nx];
            maxDiff = Math.max(maxDiff, diff);
          }
        }
      }

      altitudeDiff[y][x] = maxDiff;
    }
  }

  // Find land/water threshold
  const allHeights = heightmap.flat().sort((a, b) => a - b);
  const waterIndex = Math.floor(allHeights.length * (1 - landPercent));
  const waterThreshold = allHeights[waterIndex];

  // Find hill/peak thresholds based on altitude differences for LAND tiles only
  const landDiffs = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (heightmap[y][x] > waterThreshold) {
        landDiffs.push({ diff: altitudeDiff[y][x], x, y });
      }
    }
  }
  landDiffs.sort((a, b) => b.diff - a.diff);

  const peakCount = Math.floor(landDiffs.length * peakPercent);
  const hillCount = Math.floor(landDiffs.length * hillPercent);

  // Generate plot types
  const plots = create2DArray(width, height, PLOT.LAND);

  // Set water
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (heightmap[y][x] <= waterThreshold) {
        plots[y][x] = PLOT.OCEAN;
      }
    }
  }

  // Set peaks (highest altitude differences)
  for (let i = 0; i < peakCount; i++) {
    const { x, y } = landDiffs[i];
    plots[y][x] = PLOT.PEAK;
  }

  // Set hills
  for (let i = peakCount; i < peakCount + hillCount; i++) {
    const { x, y } = landDiffs[i];
    if (plots[y][x] !== PLOT.PEAK) {
      plots[y][x] = PLOT.HILLS;
    }
  }

  // Convert ocean adjacent to land into coast
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] === PLOT.OCEAN) {
        let nearLand = false;

        for (let dy = -1; dy <= 1 && !nearLand; dy++) {
          for (let dx = -1; dx <= 1 && !nearLand; dx++) {
            let nx = x + dx;
            let ny = y + dy;

            if (nx < 0) nx = width - 1;
            if (nx >= width) nx = 0;

            if (ny >= 0 && ny < height && plots[ny][nx] >= PLOT.LAND) {
              nearLand = true;
            }
          }
        }

        if (nearLand) {
          plots[y][x] = PLOT.COAST;
        }
      }
    }
  }

  return plots;
}

// ============================================================================
// NOISE GENERATION UTILITY
// ============================================================================

/**
 * Generates a 2D noise map using diamond-square at a smaller scale
 * Used to add variation to temperature, rainfall, and terrain boundaries
 */
function generateNoiseMap(width, height, rng, roughness = 0.6) {
  return generateHeightmap(width, height, rng, roughness);
}

// ============================================================================
// CLIMATE SIMULATION
// ============================================================================

/**
 * Generates temperature map based on latitude and altitude
 * Uses a noise layer to warp effective latitude (like Civ4's latitude variation fractal)
 *
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number[][]} heightmap - Heightmap for altitude adjustment
 * @param {SeededRandom} rng - Random number generator
 * @returns {number[][]} - Temperature [0, 1] where 1 is hottest
 */
function generateTemperatureMap(width, height, heightmap, rng) {
  const temperature = create2DArray(width, height);

  // Generate latitude variation noise (like Civ4's variation fractal)
  const latNoise = generateNoiseMap(width, height, rng, 0.5);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Base latitude with noise-based warping
      const latitudeNormalized = y / (height - 1);
      // Warp latitude by ±15% using noise - breaks up horizontal bands
      const warpedLat = clamp(latitudeNormalized + (latNoise[y][x] - 0.5) * 0.30, 0, 1);
      const distFromEquator = Math.abs(warpedLat - 0.5) * 2;

      // Parabolic temperature distribution
      let temp = 1 - (distFromEquator * distFromEquator);

      // Altitude reduces temperature
      const altitudeEffect = heightmap[y][x] * 0.3;
      temp -= altitudeEffect;

      temperature[y][x] = clamp(temp, 0, 1);
    }
  }

  return temperature;
}

/**
 * Generates rainfall/moisture map using prevailing wind simulation
 * Wind picks up moisture over water, drops it on land (especially mountains)
 *
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number[][]} plots - Plot types
 * @param {number[][]} heightmap - Heightmap for rain shadows
 * @param {SeededRandom} rng - Random number generator
 * @returns {number[][]} - Rainfall [0, 1] where 1 is wettest
 */
function generateRainfallMap(width, height, plots, heightmap, rng) {
  const rainfall = create2DArray(width, height, 0);

  // Simulate prevailing winds: westerlies in mid-latitudes, trade winds in tropics
  const windPasses = [
    { direction: 'east', latStart: 0.25, latEnd: 0.75 },   // Westerlies (mid-lat)
    { direction: 'west', latStart: 0, latEnd: 0.25 },      // Trade winds (north)
    { direction: 'west', latStart: 0.75, latEnd: 1.0 }     // Trade winds (south)
  ];

  for (const pass of windPasses) {
    const startY = Math.floor(pass.latStart * height);
    const endY = Math.floor(pass.latEnd * height);
    const dx = pass.direction === 'east' ? 1 : -1;

    for (let y = startY; y < endY; y++) {
      let moisture = 0.3; // Start with some moisture

      const startX = dx > 0 ? 0 : width - 1;
      const endX = dx > 0 ? width : -1;

      for (let x = startX; x !== endX; x += dx) {
        const plot = plots[y][x];
        const alt = heightmap[y][x];

        // Pick up moisture over water
        if (plot === PLOT.OCEAN || plot === PLOT.COAST) {
          moisture = Math.min(1, moisture + 0.1);
        } else {
          // Drop rainfall on land
          let drop = moisture * 0.15;

          // More rain on mountains (orographic lift)
          if (alt > 0.6) {
            drop *= 2;
          }

          rainfall[y][x] += drop;
          moisture -= drop;
          moisture = Math.max(0, moisture);
        }
      }
    }
  }

  // Normalize rainfall
  let maxRain = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      maxRain = Math.max(maxRain, rainfall[y][x]);
    }
  }

  if (maxRain > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        rainfall[y][x] /= maxRain;
      }
    }
  }

  // Add moisture noise layer to break up uniform rainfall patterns
  const moistureNoise = generateNoiseMap(width, height, rng, 0.55);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Blend wind-based rainfall with noise (60% wind, 40% noise)
      rainfall[y][x] = rainfall[y][x] * 0.6 + moistureNoise[y][x] * 0.4;
      // Add per-tile randomness
      rainfall[y][x] = clamp(rainfall[y][x] + (rng.next() - 0.5) * 0.15, 0, 1);
    }
  }

  return rainfall;
}

// ============================================================================
// TERRAIN TYPE ASSIGNMENT
// ============================================================================

/**
 * Assigns terrain types matching Civ4's CvMapGeneratorUtil.py TerrainGenerator.
 *
 * Civ4 default parameters:
 *   iDesertPercent=32, iPlainsPercent=18
 *   fSnowLatitude=0.7, fTundraLatitude=0.6, fGrassLatitude=0.1
 *   fDesertBottomLatitude=0.2, fDesertTopLatitude=0.5
 *
 * Algorithm:
 * 1. Compute latitude per tile (0=equator, 1=pole) with fractal variation
 * 2. Snow if lat >= 0.7, Tundra if lat >= 0.6
 * 3. Forced grass if lat < 0.1 (tropics near equator)
 * 4. Desert if fractal noise within desert threshold AND lat in [0.2, 0.5]
 * 5. Plains if fractal noise within plains threshold
 * 6. Default: grassland
 *
 * Uses separate fractal noise maps for desert and plains placement (not rainfall).
 */
function assignTerrainTypes(plots, temperature, rainfall, climateConfig, rng) {
  const height = plots.length;
  const width = plots[0].length;
  const terrain = create2DArray(width, height, TERRAIN.OCEAN);

  // Civ4 TerrainGenerator defaults
  const iDesertPercent = 32;   // 32% of temperate land is desert
  const iPlainsPercent = 18;   // 18% of temperate land is plains
  const fSnowLatitude = 0.7;
  const fTundraLatitude = 0.6;
  const fGrassLatitude = 0.1;  // Forced grass in tropics
  const fDesertBottomLatitude = 0.2;
  const fDesertTopLatitude = 0.5;

  // Generate fractal noise maps for desert and plains placement
  // (Civ4 uses separate fractal objects for each)
  const desertNoise = generateNoiseMap(width, height, rng, 0.5);
  const plainsNoise = generateNoiseMap(width, height, rng, 0.5);
  const latVariation = generateNoiseMap(width, height, rng, 0.45);

  // Compute fractal thresholds: desert noise values below this percentile → desert
  // Collect all noise values and find the threshold
  const allDesertNoise = desertNoise.flat().sort((a, b) => a - b);
  const allPlainsNoise = plainsNoise.flat().sort((a, b) => a - b);
  const desertTop = allDesertNoise[Math.floor(allDesertNoise.length * iDesertPercent / 100)] || 0;
  const plainsTop = allPlainsNoise[Math.floor(allPlainsNoise.length * iPlainsPercent / 100)] || 0;

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
      const latNorm = y / (height - 1);  // 0=top, 1=bottom
      const distFromEquator = Math.abs(latNorm - 0.5) * 2;  // 0=equator, 1=pole
      // Apply fractal variation to latitude (±20%, like Civ4's variation fractal)
      const lat = clamp(distFromEquator + (latVariation[y][x] - 0.5) * 0.4, 0, 1);

      // 1. Snow at high latitudes
      if (lat >= fSnowLatitude) {
        terrain[y][x] = TERRAIN.SNOW;
      }
      // 2. Tundra
      else if (lat >= fTundraLatitude) {
        terrain[y][x] = TERRAIN.TUNDRA;
      }
      // 3. Forced grassland in deep tropics
      else if (lat < fGrassLatitude) {
        terrain[y][x] = TERRAIN.GRASSLAND;
      }
      // 4. Desert: fractal noise check within desert latitude band
      else if (lat >= fDesertBottomLatitude && lat < fDesertTopLatitude &&
               desertNoise[y][x] < desertTop) {
        terrain[y][x] = TERRAIN.DESERT;
      }
      // 5. Plains: fractal noise check
      else if (plainsNoise[y][x] < plainsTop) {
        terrain[y][x] = TERRAIN.PLAINS;
      }
      // 6. Default: grassland
      else {
        terrain[y][x] = TERRAIN.GRASSLAND;
      }
    }
  }

  return terrain;
}

// ============================================================================
// FEATURE PLACEMENT (FORESTS, JUNGLES, OASES, ETC.)
// ============================================================================

/**
 * Places terrain features based on terrain type, temperature, and rainfall
 *
 * @param {string[][]} terrain - Terrain types
 * @param {number[][]} plots - Plot types
 * @param {number[][]} temperature - Temperature map
 * @param {number[][]} rainfall - Rainfall map
 * @param {SeededRandom} rng - Random number generator
 * @returns {string[][]} - Feature IDs (null for no feature)
 */
function placeFeatures(terrain, plots, temperature, rainfall, rng) {
  const height = terrain.length;
  const width = terrain[0].length;
  const features = create2DArray(width, height, FEATURE.NONE);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = terrain[y][x];
      const p = plots[y][x];
      const temp = temperature[y][x];
      const rain = rainfall[y][x];

      // Skip water
      if (t === TERRAIN.OCEAN || t === TERRAIN.COAST) continue;

      // Skip peaks (no features)
      if (p === PLOT.PEAK) continue;

      // Jungle in hot, wet areas on grassland
      if (t === TERRAIN.GRASSLAND && temp > 0.65 && rain > 0.6) {
        if (rng.next() < 0.7) {
          features[y][x] = FEATURE.JUNGLE;
        }
        continue;
      }

      // Forest on grassland, plains, or tundra
      if ((t === TERRAIN.GRASSLAND || t === TERRAIN.PLAINS || t === TERRAIN.TUNDRA)) {
        // Forest probability based on rainfall
        const forestChance = rain * 0.6;
        if (rng.next() < forestChance) {
          features[y][x] = FEATURE.FOREST;
        }
        continue;
      }

      // Oasis in desert (rare)
      if (t === TERRAIN.DESERT && p === PLOT.LAND) {
        if (rng.next() < 0.03) {
          features[y][x] = FEATURE.OASIS;
        }
      }
    }
  }

  return features;
}

/**
 * Places floodplains along rivers in desert
 * Should be called after river generation
 *
 * @param {string[][]} terrain - Terrain types
 * @param {Object[][]} rivers - River data
 * @param {string[][]} features - Current features (modified in place)
 */
function placeFloodplains(terrain, rivers, features) {
  const height = terrain.length;
  const width = terrain[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrain[y][x] === TERRAIN.DESERT && rivers[y][x]?.hasRiver) {
        features[y][x] = FEATURE.FLOODPLAINS;
      }
    }
  }
}

// ============================================================================
// RIVER GENERATION
// ============================================================================

/**
 * Generates rivers following drainage paths from high to low elevation
 * Rivers start in highlands and flow to the sea
 *
 * @param {number[][]} heightmap - Heightmap
 * @param {number[][]} plots - Plot types
 * @param {number[][]} rainfall - Rainfall map (affects river sources)
 * @param {SeededRandom} rng - Random number generator
 * @returns {Object[][]} - River data for each tile
 */
function generateRivers(heightmap, plots, rainfall, rng) {
  const height = heightmap.length;
  const width = heightmap[0].length;

  // Initialize river data
  const rivers = create2DArray(width, height, () => ({
    hasRiver: false,
    flowDirection: null,
    riverSize: 0
  }));

  // Find potential river sources (hills/peaks in high rainfall areas)
  const sources = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] >= PLOT.HILLS && rainfall[y][x] > 0.4) {
        sources.push({ x, y, priority: heightmap[y][x] * rainfall[y][x] });
      }
    }
  }

  // Sort by priority (higher = more likely to be source)
  sources.sort((a, b) => b.priority - a.priority);

  // Number of rivers based on map size
  const numRivers = Math.floor(Math.sqrt(width * height) * 0.3);

  // Generate each river
  for (let i = 0; i < Math.min(numRivers, sources.length); i++) {
    // Add some randomness to source selection
    const sourceIndex = Math.min(
      Math.floor(rng.next() * Math.min(10, sources.length)),
      sources.length - 1
    );
    const source = sources.splice(sourceIndex, 1)[0];

    // Trace river from source to sea
    let x = source.x;
    let y = source.y;
    let riverSize = 1;
    const visited = new Set();

    while (true) {
      const key = `${x},${y}`;
      if (visited.has(key)) break; // Prevent loops
      visited.add(key);

      rivers[y][x].hasRiver = true;
      rivers[y][x].riverSize = Math.max(rivers[y][x].riverSize, riverSize);

      // Check if we reached water
      if (plots[y][x] === PLOT.OCEAN || plots[y][x] === PLOT.COAST) {
        break;
      }

      // Find lowest neighbor (with some randomness)
      let bestX = -1, bestY = -1;
      let lowestHeight = heightmap[y][x];

      const directions = [
        { dx: 0, dy: -1, dir: 'N' },
        { dx: 0, dy: 1, dir: 'S' },
        { dx: -1, dy: 0, dir: 'W' },
        { dx: 1, dy: 0, dir: 'E' }
      ];

      // Shuffle directions to add variety
      rng.shuffle(directions);

      for (const { dx, dy } of directions) {
        let nx = x + dx;
        let ny = y + dy;

        // World wrap
        if (nx < 0) nx = width - 1;
        if (nx >= width) nx = 0;

        if (ny < 0 || ny >= height) continue;

        // Add small random factor to height comparison
        const effectiveHeight = heightmap[ny][nx] + rng.nextFloat(-0.02, 0.02);

        if (effectiveHeight < lowestHeight) {
          lowestHeight = effectiveHeight;
          bestX = nx;
          bestY = ny;
        }
      }

      if (bestX === -1) {
        // No lower neighbor found, river ends (lake formation could happen here)
        break;
      }

      // Calculate flow direction
      const dx = bestX - x;
      const dy = bestY - y;
      if (dx > 0 || (dx < 0 && x === 0)) rivers[y][x].flowDirection = 'E';
      else if (dx < 0 || (dx > 0 && x === width - 1)) rivers[y][x].flowDirection = 'W';
      else if (dy > 0) rivers[y][x].flowDirection = 'S';
      else rivers[y][x].flowDirection = 'N';

      x = bestX;
      y = bestY;
      riverSize++; // Rivers grow as they flow
    }
  }

  return rivers;
}

// ============================================================================
// RESOURCE PLACEMENT
// ============================================================================

/**
 * Resource placement rules - defines where resources can spawn
 */
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

/**
 * Places resources on the map following Civ4 rules
 *
 * @param {string[][]} terrain - Terrain types
 * @param {number[][]} plots - Plot types
 * @param {string[][]} features - Features
 * @param {SeededRandom} rng - Random number generator
 * @param {number} density - Resource density multiplier (1.0 = normal)
 * @returns {string[][]} - Resource IDs (null for no resource)
 */
function placeResources(terrain, plots, features, rng, density = 1.0) {
  const height = terrain.length;
  const width = terrain[0].length;
  const resources = create2DArray(width, height, null);

  // Calculate base resource counts based on map size
  const totalTiles = width * height;
  const landTiles = plots.flat().filter(p => p >= PLOT.LAND).length;
  const waterTiles = totalTiles - landTiles;

  // Resource distribution (approximate Civ4 values)
  const resourceCounts = {
    // Strategic (rare)
    iron: Math.floor(landTiles * 0.012 * density),
    copper: Math.floor(landTiles * 0.012 * density),
    horse: Math.floor(landTiles * 0.015 * density),
    oil: Math.floor(landTiles * 0.008 * density),
    uranium: Math.floor(landTiles * 0.005 * density),
    coal: Math.floor(landTiles * 0.010 * density),
    aluminum: Math.floor(landTiles * 0.008 * density),

    // Luxury (moderate)
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

    // Bonus (common)
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

  // Build list of valid tiles for each resource
  for (const [resourceId, count] of Object.entries(resourceCounts)) {
    const rules = RESOURCE_RULES[resourceId];
    if (!rules || count === 0) continue;

    const validTiles = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Skip if already has resource
        if (resources[y][x] !== null) continue;

        const t = terrain[y][x];
        const p = plots[y][x];
        const f = features[y][x];

        // Check terrain type
        if (!rules.terrain.includes(t)) continue;

        // Check water requirement
        if (rules.isWater && p !== PLOT.COAST) continue;
        if (!rules.isWater && (p === PLOT.OCEAN || p === PLOT.COAST)) continue;

        // Check hills requirement
        if (rules.requiresHills && p !== PLOT.HILLS) continue;

        // Check feature requirements
        if (rules.noFeature && f !== FEATURE.NONE) continue;
        if (rules.requiresForest && f !== FEATURE.FOREST) continue;
        if (rules.requiresJungle && f !== FEATURE.JUNGLE) continue;
        if (rules.requiresFloodplains && f !== FEATURE.FLOODPLAINS) continue;

        // Calculate weight (hills bonus, etc.)
        let weight = 1;
        if (rules.hillsBonus && p === PLOT.HILLS) weight = rules.hillsBonus;

        validTiles.push({ x, y, weight });
      }
    }

    // Place resources
    if (validTiles.length > 0) {
      // Shuffle and pick tiles
      rng.shuffle(validTiles);

      let placed = 0;
      for (const tile of validTiles) {
        if (placed >= count) break;

        // Ensure minimum distance between same resources
        let tooClose = false;
        const minDist = 3;

        for (let dy = -minDist; dy <= minDist && !tooClose; dy++) {
          for (let dx = -minDist; dx <= minDist && !tooClose; dx++) {
            let nx = tile.x + dx;
            let ny = tile.y + dy;

            if (nx < 0) nx += width;
            if (nx >= width) nx -= width;

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

/**
 * Finds suitable starting locations for players
 * Good starts have: fresh water, food resources, varied terrain, distance from others
 *
 * @param {Object} mapData - Complete map data
 * @param {number} numPlayers - Number of starting locations needed
 * @returns {Array<{x: number, y: number}>} - Starting locations
 */
function findStartingLocations(mapData, numPlayers) {
  const { terrain, plots, resources, rivers } = mapData;
  const height = terrain.length;
  const width = terrain[0].length;

  // Score all land tiles for starting quality
  const scores = [];

  for (let y = 2; y < height - 2; y++) { // Avoid edges
    for (let x = 0; x < width; x++) {
      if (plots[y][x] < PLOT.LAND) continue; // Must be land
      if (plots[y][x] === PLOT.PEAK) continue; // Can't start on peak

      let score = 0;

      // Check 2-tile radius for resources and terrain
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          let nx = x + dx;
          let ny = y + dy;

          if (nx < 0) nx += width;
          if (nx >= width) nx -= width;
          if (ny < 0 || ny >= height) continue;

          // Good terrain
          if (terrain[ny][nx] === TERRAIN.GRASSLAND) score += 3;
          if (terrain[ny][nx] === TERRAIN.PLAINS) score += 2;
          if (terrain[ny][nx] === TERRAIN.COAST) score += 1;

          // Hills nearby
          if (plots[ny][nx] === PLOT.HILLS) score += 2;

          // Resources
          if (resources[ny][nx]) score += 5;

          // Fresh water
          if (rivers[ny][nx]?.hasRiver) score += 4;
        }
      }

      // Coastal bonus
      let hasCoast = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let nx = x + dx;
          let ny = y + dy;
          if (nx < 0) nx += width;
          if (nx >= width) nx -= width;
          if (ny >= 0 && ny < height && terrain[ny][nx] === TERRAIN.COAST) {
            hasCoast = true;
          }
        }
      }
      if (hasCoast) score += 5;

      scores.push({ x, y, score });
    }
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  // Select starting locations with good spacing
  const startLocs = [];
  const minDist = Math.floor(Math.sqrt(width * height) / Math.sqrt(numPlayers) * 0.7);

  for (const candidate of scores) {
    if (startLocs.length >= numPlayers) break;

    // Check distance from existing starts
    let tooClose = false;
    for (const existing of startLocs) {
      const dx = Math.abs(candidate.x - existing.x);
      const wrapDx = Math.min(dx, width - dx);
      const dy = Math.abs(candidate.y - existing.y);
      const dist = Math.sqrt(wrapDx * wrapDx + dy * dy);

      if (dist < minDist) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      startLocs.push({ x: candidate.x, y: candidate.y });
    }
  }

  return startLocs;
}

// ============================================================================
// MAIN MAP GENERATION FUNCTION
// ============================================================================

/**
 * Generates a complete game map
 *
 * @param {Object} settings - Map generation settings
 * @param {string} settings.mapType - Map type ID
 * @param {string} settings.mapSize - Map size ID
 * @param {string} settings.climate - Climate ID
 * @param {string} settings.seaLevel - Sea level ID
 * @param {number} settings.numPlayers - Number of players
 * @param {number} [settings.seed] - Random seed (optional, auto-generated if not provided)
 * @returns {Object} - Complete map data
 */
export function generateMap(settings) {
  const {
    mapType = 'continents',
    mapSize = 'standard',
    climate = 'temperate',
    seaLevel = 'medium',
    numPlayers = 7,
    seed = Date.now()
  } = settings;

  // Get configurations
  const mapTypeConfig = getMapTypeConfig(mapType);
  const mapSizeConfig = getMapSizeConfig(mapSize);
  const climateConfig = getClimateConfig(climate);
  const seaLevelConfig = getSeaLevelConfig(seaLevel);

  // Map dimensions
  const width = mapSizeConfig.tilesWidth;
  const height = mapSizeConfig.tilesHeight;

  // Initialize RNG
  const rng = new SeededRandom(seed);

  console.log(`Generating ${mapType} map (${width}x${height}) with seed ${seed}`);

  // Step 1: Generate base heightmap
  console.log('Generating heightmap...');
  let heightmap = generateHeightmap(width, height, rng, 0.55);

  // Step 2: Generate tectonic plates and apply to heightmap
  console.log('Simulating plate tectonics...');
  const numPlates = Math.floor(Math.sqrt(width * height) * 0.15);
  const tectonics = generateTectonicPlates(width, height, numPlates, rng);
  heightmap = applyTectonicsToHeightmap(heightmap, tectonics, 0.35);

  // Step 2.5: Apply center rift to heightmap for continent-type maps (weakens land at rift)
  if (mapType === 'continents' || mapType === 'terra' || mapType === 'mirror') {
    const numRifts = mapType === 'terra' ? 1 : Math.max(1, (mapTypeConfig.continents || 2) - 1);
    console.log(`Applying ${numRifts} center rift(s) to heightmap...`);
    heightmap = applyCenterRift(heightmap, numRifts, rng, 0.12);
  }

  // Step 3: Generate plot types (land/water/hills/peaks)
  console.log('Generating plot types...');
  const landPercent = clamp(mapTypeConfig.landPercent + (seaLevelConfig.landAdjustment || 0), 0.25, 0.75);
  const plots = generatePlotTypes(heightmap, landPercent);

  // Step 3.5: Force polar water and rift separation on plots
  console.log('Applying polar attenuation to plots...');
  applyPolarAttenuation(plots, rng, 0.15);

  if (mapType === 'continents' || mapType === 'terra' || mapType === 'mirror') {
    const numRifts = mapType === 'terra' ? 1 : Math.max(1, (mapTypeConfig.continents || 2) - 1);
    console.log(`Applying ${numRifts} center rift(s) to plots...`);
    applyCenterRiftToPlots(plots, numRifts, rng, 0.12);
  }

  // Recompute coast tiles after polar/rift modifications
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] === PLOT.COAST) {
        plots[y][x] = PLOT.OCEAN;
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (plots[y][x] === PLOT.OCEAN) {
        let nearLand = false;
        for (let dy = -1; dy <= 1 && !nearLand; dy++) {
          for (let dx = -1; dx <= 1 && !nearLand; dx++) {
            let nx = x + dx;
            let ny = y + dy;
            if (nx < 0) nx = width - 1;
            if (nx >= width) nx = 0;
            if (ny >= 0 && ny < height) {
              if (plots[ny][nx] !== PLOT.OCEAN && plots[ny][nx] !== PLOT.COAST) {
                nearLand = true;
              }
            }
          }
        }
        if (nearLand) plots[y][x] = PLOT.COAST;
      }
    }
  }

  // Step 4: Generate climate maps
  console.log('Simulating climate...');
  const temperature = generateTemperatureMap(width, height, heightmap, rng);
  const rainfall = generateRainfallMap(width, height, plots, heightmap, rng);

  // Step 5: Assign terrain types
  console.log('Assigning terrain types...');
  const terrain = assignTerrainTypes(plots, temperature, rainfall, climateConfig, rng);

  // Step 6: Generate rivers
  console.log('Generating rivers...');
  const rivers = generateRivers(heightmap, plots, rainfall, rng);

  // Step 7: Place features
  console.log('Placing features...');
  const features = placeFeatures(terrain, plots, temperature, rainfall, rng);
  placeFloodplains(terrain, rivers, features);

  // Step 8: Place resources
  console.log('Placing resources...');
  const resourceDensity = mapTypeConfig.resourceDensity || 1.0;
  const resources = placeResources(terrain, plots, features, rng, resourceDensity);

  // Step 9: Find starting locations
  console.log('Finding starting locations...');
  const mapData = { terrain, plots, features, resources, rivers };
  const startingLocations = findStartingLocations(mapData, numPlayers);

  // Step 10: Shift map so widest ocean gap is at the edge (Civ4's shiftPlotTypes)
  if (mapType === 'continents' || mapType === 'terra' || mapType === 'mirror') {
    console.log('Shifting map to center continents...');
    const shiftData = { width, height, heightmap, plots, terrain, features, resources, rivers, temperature, rainfall, startingLocations };
    shiftPlotTypes(shiftData);
  }

  console.log('Map generation complete!');

  // Return complete map data
  return {
    width,
    height,
    seed,
    settings: { mapType, mapSize, climate, seaLevel, numPlayers },

    // Raw data arrays
    heightmap,
    plots,
    terrain,
    features,
    resources,
    rivers,
    temperature,
    rainfall,

    // Metadata
    tectonics,
    startingLocations,

    // Helper function to get tile at coordinates
    getTile(x, y) {
      // Handle world wrap
      while (x < 0) x += width;
      while (x >= width) x -= width;

      if (y < 0 || y >= height) return null;

      return {
        x,
        y,
        height: heightmap[y][x],
        plot: plots[y][x],
        terrain: terrain[y][x],
        feature: features[y][x],
        resource: resources[y][x],
        river: rivers[y][x],
        temperature: temperature[y][x],
        rainfall: rainfall[y][x],

        // Derived properties
        isWater: plots[y][x] <= PLOT.COAST,
        isLand: plots[y][x] >= PLOT.LAND,
        isHills: plots[y][x] === PLOT.HILLS,
        isPeak: plots[y][x] === PLOT.PEAK,
        hasRiver: rivers[y][x]?.hasRiver || false
      };
    },

    // Get elevation type
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

/**
 * Generates a Pangaea map (single large continent)
 */
export function generatePangaea(settings) {
  return generateMap({ ...settings, mapType: 'pangaea' });
}

/**
 * Generates a Continents map (multiple large landmasses)
 */
export function generateContinents(settings) {
  return generateMap({ ...settings, mapType: 'continents' });
}

/**
 * Generates an Archipelago map (many small islands)
 */
export function generateArchipelago(settings) {
  return generateMap({ ...settings, mapType: 'archipelago' });
}

/**
 * Generates a Terra map (Old World + New World)
 */
export function generateTerra(settings) {
  return generateMap({ ...settings, mapType: 'terra' });
}

// ============================================================================
// DEBUG/VISUALIZATION HELPERS
// ============================================================================

/**
 * Converts map data to ASCII for debugging
 */
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
        line += '*'; // Resource
      } else if (plots[y][x] === PLOT.PEAK) {
        line += '^'; // Peak
      } else if (plots[y][x] === PLOT.HILLS) {
        line += 'h'; // Hills
      } else if (features[y][x] === FEATURE.FOREST) {
        line += 'F'; // Forest
      } else if (features[y][x] === FEATURE.JUNGLE) {
        line += 'J'; // Jungle
      } else {
        line += terrainChars[terrain[y][x]] || '?';
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Gets statistics about a generated map
 */
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
      // Count plots
      if (plots[y][x] <= PLOT.COAST) stats.water++;
      else stats.land++;
      if (plots[y][x] === PLOT.HILLS) stats.hills++;
      if (plots[y][x] === PLOT.PEAK) stats.peaks++;

      // Count terrain
      const t = terrain[y][x];
      stats.terrain[t] = (stats.terrain[t] || 0) + 1;

      // Count features
      const f = features[y][x];
      if (f) stats.features[f] = (stats.features[f] || 0) + 1;

      // Count resources
      const r = resources[y][x];
      if (r) stats.resources[r] = (stats.resources[r] || 0) + 1;
    }
  }

  // Convert to percentages
  stats.landPercent = ((stats.land / total) * 100).toFixed(1) + '%';
  stats.waterPercent = ((stats.water / total) * 100).toFixed(1) + '%';
  stats.hillsPercent = ((stats.hills / stats.land) * 100).toFixed(1) + '%';
  stats.peaksPercent = ((stats.peaks / stats.land) * 100).toFixed(1) + '%';

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
