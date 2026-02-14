/**
 * Map Generation Entry Point — Hook-Based Orchestrator
 *
 * Mirrors the Python CvMapScriptInterface.py architecture:
 * each map script can override individual pipeline hooks while
 * relying on defaults for everything else.
 *
 * Pipeline order matches Civ4 exactly (see CvMapScriptInterface.py):
 *   beforeInit → getGridSize → getTopLatitude/getBottomLatitude →
 *   isBonusIgnoreLatitude → getWrapX/getWrapY → beforeGeneration →
 *   generateRandomMap OR (generatePlotTypes + generateTerrain) →
 *   addRivers → addLakes → addFeatures → addBonuses → addGoodies →
 *   afterGeneration → assignStartingPlots → normalize → startHumansOnSameTile
 */

import { SeededRandom } from './utils.js';
import { CyFractal } from './CyFractal.js';
import { FractalWorld, PLOT } from './FractalWorld.js';
import { TerrainGenerator, TERRAIN } from './TerrainGenerator.js';
import { FeatureGenerator, FEATURE } from './FeatureGenerator.js';
import { RiverGenerator } from './RiverGenerator.js';
import { BonusGenerator } from './BonusGenerator.js';
import { StartingPlots } from './StartingPlots.js';
import { GoodyGenerator } from './GoodyGenerator.js';
import {
  getDefaultDimensions,
  resolveSeaLevelChange,
  resolveClimateSettings,
  buildMapResult
} from './scripts/_helpers.js';

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

// ============================================================================
// HEIGHTMAP GENERATION (visual-only, for Babylon.js 3D terrain)
// ============================================================================

function generateHeightmap(width, height, rng) {
  const frac = new CyFractal();
  frac.fracInit(width, height, 3, rng, 0);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      frac.getHeight(x, y) / 255
    )
  );
}

// ============================================================================
// DEFAULT PIPELINE FUNCTIONS
// These wrap the engine classes and serve as the "C++ default" equivalent
// of CyPythonMgr().allowDefaultImpl() in the Python interface.
// ============================================================================

/**
 * Default generatePlotTypes: FractalWorld with standard Continents-style settings.
 * Mirrors Python: FractalWorld(); initFractal(polar=True); generatePlotTypes(water_percent=75)
 */
function defaultGeneratePlotTypes(W, H, settings, rng, wrapX, wrapY) {
  const fw = new FractalWorld(W, H, {
    climate: settings.climate,
    seaLevel: settings.seaLevel,
    wrapX, wrapY
  });

  fw.initFractal(rng, { polar: true });

  return fw.generatePlotTypes(rng, { water_percent: 75 });
}

/**
 * Default generateTerrain: standard TerrainGenerator with climate adjustments.
 * Mirrors Python TerrainGenerator.__init__() which applies climate-dependent
 * latitude changes from CIV4ClimateInfo.xml.
 */
function defaultGenerateTerrain(W, H, plotTypes, settings, rng, wrapX, wrapY) {
  const climateConfig = resolveClimateSettings(settings.climate);
  const clamp01 = v => Math.min(1.0, Math.max(0.0, v));

  const tg = new TerrainGenerator(W, H, {
    wrapX, wrapY,
    mapSize: settings.mapSize,
    iDesertPercent:        Math.min(100, Math.max(0, 32 + climateConfig.iDesertPercentChange)),
    fSnowLatitude:         clamp01(0.7 + climateConfig.fSnowLatitudeChange),
    fTundraLatitude:       clamp01(0.6 + climateConfig.fTundraLatitudeChange),
    fGrassLatitude:        clamp01(0.1 + climateConfig.fGrassLatitudeChange),
    fDesertBottomLatitude: clamp01(0.2 + climateConfig.fDesertBottomLatitudeChange),
    fDesertTopLatitude:    clamp01(0.5 + climateConfig.fDesertTopLatitudeChange)
  });
  return tg.generateTerrain(rng, plotTypes);
}

/**
 * Default addRivers: standard RiverGenerator.
 */
function defaultAddRivers(W, H, plotTypes, terrain, rng, wrapX, wrapY, callbacks) {
  const rg = new RiverGenerator(W, H, {
    wrapX, wrapY,
    getRiverStartCardinalDirection: callbacks.getRiverStartCardinalDirection ?? null,
    getRiverAltitude: callbacks.getRiverAltitude ?? null
  });
  return rg.addRivers(rng, plotTypes, terrain);
}

/**
 * Default addLakes: standard RiverGenerator lake detection.
 */
function defaultAddLakes(W, H, plotTypes, wrapX, wrapY) {
  const rg = new RiverGenerator(W, H, { wrapX, wrapY });
  return rg.addLakes(plotTypes);
}

/**
 * Default addFeatures: standard FeatureGenerator.
 */
function defaultAddFeatures(W, H, plotTypes, terrain, rivers, settings, rng, wrapX, wrapY) {
  const climateConfig = resolveClimateSettings(settings.climate);
  const fg = new FeatureGenerator(W, H, {
    jungleLatitude: climateConfig.iJungleLatitude,
    randIceLatitude: climateConfig.fRandIceLatitude,
    mapSize: settings.mapSize,
    wrapX, wrapY
  });
  return fg.generateFeatures(rng, plotTypes, terrain, rivers);
}

/**
 * Default addBonuses: standard BonusGenerator.
 */
function defaultAddBonuses(W, H, plotTypes, terrain, features, settings, rng, wrapX, wrapY, callbacks) {
  const bg = new BonusGenerator(W, H, {
    numPlayers: settings.numPlayers,
    wrapX, wrapY,
    addBonusType: callbacks.addBonusType ?? null,
    canPlaceBonusAt: callbacks.canPlaceBonusAt ?? null
  });
  return bg.addBonuses(rng, plotTypes, terrain, features);
}

/**
 * Default addGoodies: standard GoodyGenerator.
 */
function defaultAddGoodies(W, H, plotTypes, terrain, features, bonuses, starts, rng, wrapX, wrapY, callbacks) {
  const gg = new GoodyGenerator(W, H, {
    wrapX, wrapY,
    canPlaceGoodyAt: callbacks.canPlaceGoodyAt ?? null
  });
  return gg.addGoodies(rng, plotTypes, terrain, features, bonuses, starts);
}

/**
 * Default assignStartingPlots: standard StartingPlots.
 */
function defaultAssignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes,
                                     settings, rng, distMod, wrapX, wrapY, callbacks) {
  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: distMod,
    wrapX, wrapY,
    findStartingPlot: callbacks.findStartingPlot ?? null,
    findStartingArea: callbacks.findStartingArea ?? null
  });
  return sp.assignStartingPlots(settings.numPlayers, rng, plotTypes, terrain, features, bonuses, rivers, lakes);
}

/**
 * Run all 9 normalization passes. Each pass uses script override if present,
 * else falls back to StartingPlots default method.
 */
function runNormalization(script, starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng, W, H, wrapX, wrapY) {
  const sp = new StartingPlots(W, H, { wrapX, wrapY });

  const callOrDefault = (hookName, ...args) => {
    if (script[hookName]) {
      script[hookName](...args);
    } else {
      sp[hookName](...args);
    }
  };

  callOrDefault('normalizeStartingPlotLocations', starts);
  callOrDefault('normalizeAddRiver', starts, plotTypes, terrain, features, rivers, rng);
  callOrDefault('normalizeRemovePeaks', starts, plotTypes);
  callOrDefault('normalizeAddLakes', starts, plotTypes, terrain, rivers, lakes);
  callOrDefault('normalizeRemoveBadFeatures', starts, features);
  callOrDefault('normalizeRemoveBadTerrain', starts, plotTypes, terrain);
  callOrDefault('normalizeAddFoodBonuses', starts, plotTypes, terrain, features, bonuses, rng);
  callOrDefault('normalizeAddGoodTerrain', starts, plotTypes, terrain);
  callOrDefault('normalizeAddExtras', starts, plotTypes, terrain, features, bonuses, rivers, rng);
}

// ============================================================================
// 1D ↔ 2D HELPERS
// ============================================================================

function to2D(arr, W, H) {
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => arr[y * W + x])
  );
}

// ============================================================================
// RIVER HELPER (for getTile output)
// ============================================================================

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

// ============================================================================
// OUTPUT BUILDER
// ============================================================================

function buildFinalMapData(W, H, plots2D, terrain2D, features2D, resources2D,
                            rivers2D, lakes2D, goodies2D, startingLocations,
                            heightmap, outputSettings, seed, startHumansOnSameTile) {
  return {
    width: W,
    height: H,
    seed,
    settings: outputSettings,
    startHumansOnSameTile,

    heightmap,
    plots: plots2D,
    terrain: terrain2D,
    features: features2D,
    resources: resources2D,
    rivers: rivers2D,
    goodies: goodies2D,
    startingLocations,

    getTile(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;

      const plot = plots2D[y][wx];
      const river = rivers2D[y][wx];

      return {
        x: wx, y,
        plot,
        terrain: terrain2D[y][wx],
        feature: features2D[y][wx],
        resource: resources2D[y][wx],
        river,

        isWater: plot === PLOT.OCEAN,
        isLand: plot >= PLOT.LAND,
        isCoast: terrain2D[y][wx] === TERRAIN.COAST,
        isHills: plot === PLOT.HILLS,
        isPeak: plot === PLOT.PEAK,
        hasRiver: tileHasRiver(rivers2D, wx, y, W, H),

        isLake: lakes2D ? lakes2D[y][wx] : false,
        hasGoodyHut: goodies2D ? goodies2D[y][wx] : false,

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

      const plot = plots2D[y][wx];
      if (plot === PLOT.PEAK) return ELEVATION.PEAKS;
      if (plot === PLOT.HILLS) return ELEVATION.HILLS;
      return ELEVATION.FLAT;
    }
  };
}

// ============================================================================
// SCRIPT METADATA (for UI rendering without generating a map)
// ============================================================================

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

// ============================================================================
// CUSTOM OPTION RESOLUTION
// ============================================================================

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

// ============================================================================
// MAIN ENTRY POINT — Hook-Based Pipeline Orchestrator
// ============================================================================

/**
 * Generate a complete map by calling individual script hooks in Civ4 order.
 *
 * The pipeline matches CvMapScriptInterface.py exactly:
 * 1. beforeInit
 * 2. getGridSize, getTopLatitude, getBottomLatitude, isBonusIgnoreLatitude, getWrapX, getWrapY
 * 3. beforeGeneration
 * 4. generateRandomMap OR (generatePlotTypes + generateTerrain)
 * 5. addRivers (with getRiverStartCardinalDirection + getRiverAltitude hooks)
 * 6. addLakes
 * 7. addFeatures
 * 8. addBonuses (with addBonusType + canPlaceBonusAt hooks)
 * 9. addGoodies (with canPlaceGoodyAt hook)
 * 10. afterGeneration
 * 11. assignStartingPlots (with findStartingPlot + findStartingArea hooks)
 * 12. Normalization (9 individual hooks)
 * 13. startHumansOnSameTile
 */
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

  // Resolve custom options
  const resolvedCustomOptions = resolveCustomOptions(script, rawCustomOptions, rng);

  // Build the full settings object that hooks receive
  const fullSettings = {
    mapType,
    mapSize,
    climate,
    seaLevel,
    numPlayers: clampedPlayers,
    seed,
    customOption,
    customOptions: resolvedCustomOptions
  };

  // --- Backward compatibility: legacy scripts with monolithic generate() ---
  if (script.generate && !script.generatePlotTypes && !script.generateRandomMap) {
    return _runLegacyPipeline(script, fullSettings, rng, seed);
  }

  // ========================================================================
  // HOOK-BASED PIPELINE (mirrors CvMapScriptInterface.py order)
  // ========================================================================

  // Phase 1: beforeInit
  if (script.beforeInit) {
    script.beforeInit(fullSettings, rng);
  }

  // Phase 2: Grid size, latitude, wrap
  const gridSize = script.getGridSize
    ? script.getGridSize(mapSize)
    : null;
  const { width: W, height: H } = gridSize ?? getDefaultDimensions(mapSize);

  const topLatitude    = script.getTopLatitude?.()    ?? 90;
  const bottomLatitude = script.getBottomLatitude?.() ?? -90;
  const bonusIgnoreLat = script.isBonusIgnoreLatitude?.() ?? false;
  const wrapX = script.getWrapX?.() ?? true;
  const wrapY = script.getWrapY?.() ?? false;

  // Phase 3: beforeGeneration
  if (script.beforeGeneration) {
    script.beforeGeneration(fullSettings, rng);
  }

  // Phase 4: Map generation (plot types + terrain)
  let plotTypes, terrain;

  if (script.generateRandomMap) {
    // Script takes full control of plot + terrain generation
    const result = script.generateRandomMap(W, H, fullSettings, rng);
    plotTypes = result.plotTypes;
    terrain = result.terrain;
  } else {
    // generatePlotTypes (script override or default)
    plotTypes = script.generatePlotTypes
      ? script.generatePlotTypes(W, H, fullSettings, rng)
      : defaultGeneratePlotTypes(W, H, fullSettings, rng, wrapX, wrapY);

    // generateTerrain (script override or default)
    terrain = script.generateTerrain
      ? script.generateTerrain(W, H, plotTypes, fullSettings, rng)
      : defaultGenerateTerrain(W, H, plotTypes, fullSettings, rng, wrapX, wrapY);
  }

  // Phase 5: addRivers (with per-river/per-plot callback hooks)
  const riverCallbacks = {
    getRiverStartCardinalDirection: script.getRiverStartCardinalDirection ?? null,
    getRiverAltitude: script.getRiverAltitude ?? null
  };
  const rivers = script.addRivers
    ? script.addRivers(W, H, plotTypes, terrain, rng, riverCallbacks)
    : defaultAddRivers(W, H, plotTypes, terrain, rng, wrapX, wrapY, riverCallbacks);

  // Phase 6: addLakes
  const lakes = script.addLakes
    ? script.addLakes(W, H, plotTypes, rng)
    : defaultAddLakes(W, H, plotTypes, wrapX, wrapY);

  // Phase 7: addFeatures
  const features = script.addFeatures
    ? script.addFeatures(W, H, plotTypes, terrain, rivers, fullSettings, rng)
    : defaultAddFeatures(W, H, plotTypes, terrain, rivers, fullSettings, rng, wrapX, wrapY);

  // Phase 8: addBonuses (with per-type/per-plot callback hooks)
  const bonusCallbacks = {
    addBonusType: script.addBonusType ?? null,
    canPlaceBonusAt: script.canPlaceBonusAt ?? null
  };
  const bonuses = script.addBonuses
    ? script.addBonuses(W, H, plotTypes, terrain, features, fullSettings, rng, bonusCallbacks)
    : defaultAddBonuses(W, H, plotTypes, terrain, features, fullSettings, rng, wrapX, wrapY, bonusCallbacks);

  // Phase 9: afterGeneration
  if (script.afterGeneration) {
    script.afterGeneration({ W, H, plotTypes, terrain, features, bonuses, rivers, lakes }, rng);
  }

  // Phase 10: Starting plots
  const distMod = script.minStartingDistanceModifier?.() ?? 0;

  const startCallbacks = {
    findStartingPlot: script.findStartingPlot ?? null,
    findStartingArea: script.findStartingArea ?? null
  };

  const starts = script.assignStartingPlots
    ? script.assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, fullSettings, rng)
    : defaultAssignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes,
                                  fullSettings, rng, distMod, wrapX, wrapY, startCallbacks);

  // Phase 11: Normalization (9 individual hooks)
  runNormalization(script, starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng, W, H, wrapX, wrapY);

  // Phase 12: addGoodies (after starting plots + normalization, per Civ4 order)
  const goodyCallbacks = {
    canPlaceGoodyAt: script.canPlaceGoodyAt ?? null
  };
  const goodies = script.addGoodies
    ? script.addGoodies(W, H, plotTypes, terrain, features, bonuses, starts, rng, goodyCallbacks)
    : defaultAddGoodies(W, H, plotTypes, terrain, features, bonuses, starts, rng, wrapX, wrapY, goodyCallbacks);

  // Phase 13: startHumansOnSameTile
  const humansOnSameTile = script.startHumansOnSameTile?.() ?? false;

  // Phase 14: Generate render heightmap and build output
  const heightmap = generateHeightmap(W, H, rng);

  console.log('Map generation complete!');

  const plots2D = to2D(plotTypes, W, H);
  const terrain2D = to2D(terrain, W, H);
  const features2D = to2D(features, W, H);
  const resources2D = to2D(bonuses, W, H);
  const rivers2D = to2D(rivers, W, H);
  const lakes2D = to2D(lakes, W, H);
  const goodies2D = to2D(goodies, W, H);

  return buildFinalMapData(
    W, H, plots2D, terrain2D, features2D, resources2D,
    rivers2D, lakes2D, goodies2D, starts,
    heightmap,
    { mapType, mapSize, climate, seaLevel, numPlayers: clampedPlayers },
    seed,
    humansOnSameTile
  );
}

// ============================================================================
// LEGACY PIPELINE (backward compatibility for scripts with monolithic generate())
// ============================================================================

function _runLegacyPipeline(script, fullSettings, rng, seed) {
  // Lifecycle: beforeInit
  if (script.beforeInit) {
    script.beforeInit(fullSettings, rng);
  }

  // Lifecycle: beforeGeneration
  if (script.beforeGeneration) {
    script.beforeGeneration(fullSettings, rng);
  }

  // Run the script's monolithic pipeline
  const scriptResult = script.generate(fullSettings, rng);

  // Lifecycle: afterGeneration
  if (script.afterGeneration) {
    script.afterGeneration(scriptResult, fullSettings, rng);
  }

  // Generate render heightmap
  const heightmap = generateHeightmap(
    scriptResult.width,
    scriptResult.height,
    rng
  );

  console.log('Map generation complete! (legacy pipeline)');

  // The legacy buildMapResult returns an object with 2D arrays + getTile/getElevation.
  // We need to wrap it in the standard output format.
  const { width: W, height: H } = scriptResult;
  const humansOnSameTile = script.startHumansOnSameTile?.() ?? false;

  // Legacy scripts return via buildMapResult which already has 2D arrays
  const legacyResult = scriptResult;

  return {
    width: W,
    height: H,
    seed,
    settings: {
      mapType: fullSettings.mapType,
      mapSize: fullSettings.mapSize,
      climate: fullSettings.climate,
      seaLevel: fullSettings.seaLevel,
      numPlayers: fullSettings.numPlayers
    },
    startHumansOnSameTile: humansOnSameTile,

    heightmap,
    plots: legacyResult.plots,
    terrain: legacyResult.terrain,
    features: legacyResult.features,
    resources: legacyResult.resources,
    rivers: legacyResult.rivers,
    lakes: legacyResult.lakes,
    goodies: legacyResult.goodies,
    startingLocations: legacyResult.startingLocations,

    getTile: legacyResult.getTile?.bind(legacyResult) ?? function(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;
      const plot = this.plots[y][wx];
      const river = this.rivers[y][wx];
      return {
        x: wx, y, plot,
        terrain: this.terrain[y][wx],
        feature: this.features[y][wx],
        resource: this.resources[y][wx],
        river,
        isWater: plot === PLOT.OCEAN,
        isLand: plot >= PLOT.LAND,
        isCoast: this.terrain[y][wx] === TERRAIN.COAST,
        isHills: plot === PLOT.HILLS,
        isPeak: plot === PLOT.PEAK,
        hasRiver: tileHasRiver(this.rivers, wx, y, W, H),
        isLake: this.lakes ? this.lakes[y][wx] : false,
        hasGoodyHut: this.goodies ? this.goodies[y][wx] : false,
        isNOfRiver: river.isNOfRiver,
        isWOfRiver: river.isWOfRiver,
        riverFlowN: river.riverNSDirection,
        riverFlowW: river.riverWEDirection
      };
    },

    getElevation: legacyResult.getElevation?.bind(legacyResult) ?? function(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;
      const plot = this.plots[y][wx];
      if (plot === PLOT.PEAK) return ELEVATION.PEAKS;
      if (plot === PLOT.HILLS) return ELEVATION.HILLS;
      return ELEVATION.FLAT;
    }
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
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
// UTILITIES
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
      if (plots[y][x] === PLOT.OCEAN) stats.water++;
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

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

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
