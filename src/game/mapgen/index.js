/**
 * Map Generation Entry Point
 *
 * Dispatches to per-map-type scripts (Milestones 10-11), generates a render
 * heightmap for Babylon.js 3D, and wraps the output for backward
 * compatibility so that Game.jsx, TerrainBuilder.js, and FeatureRenderer.js
 * require zero changes.
 */

import { SeededRandom } from './utils.js';
import { CyFractal } from './CyFractal.js';
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';

// --- Script imports ---
import continentsScript from './scripts/continents.js';
import fractalScript from './scripts/fractal.js';
import archipelagoScript from './scripts/archipelago.js';
import pangaeaScript from './scripts/pangaea.js';
import terraScript from './scripts/terra.js';
import inlandSeaScript from './scripts/inlandSea.js';
import lakesScript from './scripts/lakes.js';
import oasisScript from './scripts/oasis.js';
import iceAgeScript from './scripts/iceAge.js';
import mirrorScript from './scripts/mirror.js';

// --- Constants ---
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
export { PLOT } from './FractalWorld.js';

export const ELEVATION = {
  FLAT: 'flat',
  HILLS: 'hills',
  PEAKS: 'peaks'
};

// --- Script registry ---
const SCRIPT_MAP = {
  continents: continentsScript,
  fractal: fractalScript,
  archipelago: archipelagoScript,
  pangaea: pangaeaScript,
  terra: terraScript,
  inland_sea: inlandSeaScript,
  lakes: lakesScript,
  oasis: oasisScript,
  ice_age: iceAgeScript,
  mirror: mirrorScript
};

function getMapScript(mapType) {
  const key = mapType.toLowerCase().replace(/\s+/g, '_');
  const script = SCRIPT_MAP[key];
  if (!script) {
    console.warn(`Unknown map type "${mapType}", falling back to fractal`);
    return SCRIPT_MAP.fractal;
  }
  return script;
}

// --- Heightmap generation (visual-only, for Babylon.js 3D terrain) ---
function generateHeightmap(width, height, rng) {
  const frac = new CyFractal();
  frac.fracInit(width, height, 3, rng, 0);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      frac.getHeight(x, y) / 255
    )
  );
}

// --- River helper ---
function tileHasRiver(rivers, x, y, W, H) {
  const r = rivers[y][x];
  if (r.isNOfRiver || r.isWOfRiver) return true;

  // East neighbor's west edge (= this tile's east edge)
  const ex = (x + 1) % W;
  if (rivers[y][ex].isWOfRiver) return true;

  // South neighbor's north edge (= this tile's south edge)
  if (y + 1 < H && rivers[y + 1][x].isNOfRiver) return true;

  return false;
}

// --- Output builder ---
function buildFinalMapData(scriptResult, heightmap, settings, seed) {
  const {
    width: W, height: H,
    plots, terrain, features, resources, rivers, lakes, goodies,
    startingLocations
  } = scriptResult;

  return {
    width: W,
    height: H,
    seed,
    settings,

    heightmap,
    plots,
    terrain,
    features,
    resources,
    rivers,
    goodies,
    startingLocations,

    getTile(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;

      const plot = plots[y][wx];
      const river = rivers[y][wx];

      return {
        x: wx, y,
        plot,
        terrain: terrain[y][wx],
        feature: features[y][wx],
        resource: resources[y][wx],
        river,

        isWater: plot <= PLOT.COAST,
        isLand: plot >= PLOT.LAND,
        isHills: plot === PLOT.HILLS,
        isPeak: plot === PLOT.PEAK,
        hasRiver: tileHasRiver(rivers, wx, y, W, H),

        isLake: lakes ? lakes[y][wx] : false,
        hasGoodyHut: goodies ? goodies[y][wx] : false,

        // River edges — map new field names to legacy names
        isNOfRiver: river.isNOfRiver,
        isWOfRiver: river.isWOfRiver,
        riverFlowN: river.riverNSDirection,
        riverFlowW: river.riverWEDirection
      };
    },

    getElevation(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;

      const plot = plots[y][wx];
      if (plot === PLOT.PEAK) return ELEVATION.PEAKS;
      if (plot === PLOT.HILLS) return ELEVATION.HILLS;
      return ELEVATION.FLAT;
    }
  };
}

// --- Script metadata (for UI rendering without generating a map) ---

/**
 * Get metadata for a map script.
 * Used by NewGame.jsx to conditionally render climate/sea level dropdowns,
 * display descriptions, and show custom options.
 *
 * @param {string} mapType - Map type ID
 * @returns {Object} Script metadata
 */
export function getMapScriptInfo(mapType) {
  const script = getMapScript(mapType);
  return {
    id: script.id,
    name: script.name,
    description: script.description ?? '',
    isAdvancedMap: script.isAdvancedMap ?? false,
    isClimateMap: script.isClimateMap?.() ?? true,
    isSeaLevelMap: script.isSeaLevelMap?.() ?? true,
    customOptions: script.customOptions ?? [],
    isBonusIgnoreLatitude: script.isBonusIgnoreLatitude?.() ?? false,
    startHumansOnSameTile: script.startHumansOnSameTile?.() ?? false
  };
}

/**
 * Get metadata for all available map scripts.
 * @returns {Object[]} Array of script metadata objects
 */
export function getAllMapScriptInfo() {
  return Object.keys(SCRIPT_MAP).map(getMapScriptInfo);
}

// --- Custom option resolution ---

function resolveCustomOptions(script, rawOptions, rng) {
  const resolved = {};
  const customOptions = script.customOptions ?? [];

  for (const opt of customOptions) {
    const selected = rawOptions?.[opt.id];
    if (selected === 'random' && opt.allowRandom) {
      const idx = rng.nextInt(0, opt.values.length - 1);
      resolved[opt.id] = opt.values[idx].id;
    } else if (selected != null) {
      resolved[opt.id] = selected;
    } else {
      resolved[opt.id] = opt.values[opt.default].id;
    }
  }

  return resolved;
}

// --- Main entry point ---
export function generateMap(settings) {
  const {
    mapType = 'continents',
    mapSize = 'standard',
    climate = 'temperate',
    seaLevel = 'medium',
    numPlayers = 7,
    seed = Date.now(),
    customOption = null,
    customOptions: rawCustomOptions = null
  } = settings;

  // Clamp numPlayers
  const clampedPlayers = Math.max(2, numPlayers);
  if (clampedPlayers !== numPlayers && numPlayers > 0) {
    console.warn(`numPlayers clamped from ${numPlayers} to ${clampedPlayers}`);
  }

  const rng = new SeededRandom(seed);

  // 1. Select map script
  const script = getMapScript(mapType);

  console.log(`Generating ${mapType} map (${script.name}) with seed ${seed}`);

  // 2. Lifecycle hook: beforeInit
  if (script.beforeInit) {
    script.beforeInit(settings, rng);
  }

  // 3. Resolve custom options (new array format or legacy single value)
  const resolvedCustomOptions = resolveCustomOptions(script, rawCustomOptions, rng);

  // 4. Lifecycle hook: beforeGeneration
  if (script.beforeGeneration) {
    script.beforeGeneration(settings, rng);
  }

  // 5. Run the script's full pipeline
  const scriptResult = script.generate({
    mapType,
    mapSize,
    climate,
    seaLevel,
    numPlayers: clampedPlayers,
    seed,
    customOption,
    customOptions: resolvedCustomOptions
  }, rng);

  // 6. Lifecycle hook: afterGeneration
  if (script.afterGeneration) {
    script.afterGeneration(scriptResult, settings, rng);
  }

  // 7. Generate render heightmap for Babylon.js 3D terrain
  const heightmap = generateHeightmap(
    scriptResult.width,
    scriptResult.height,
    rng
  );

  console.log('Map generation complete!');

  // 8. Build the final backward-compatible output object
  return buildFinalMapData(
    scriptResult,
    heightmap,
    { mapType, mapSize, climate, seaLevel, numPlayers: clampedPlayers },
    seed
  );
}

// --- Convenience functions ---
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

// --- Utilities ---
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

// --- Default export ---
export default {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra,
  mapToAscii,
  getMapStats,
  getMapScriptInfo,
  getAllMapScriptInfo,
  TERRAIN,
  FEATURE,
  ELEVATION
};
