/**
 * FeatureGenerator - Civ4-compatible feature placement
 *
 * Places ice, jungle, forest, oasis, and floodplains using fractal
 * thresholds and probability-based placement.
 *
 * This is a direct port of CvMapGeneratorUtil.FeatureGenerator from Civ4 BTS,
 * plus the C++ generic feature system for oasis and floodplains.
 *
 * Subclasses can override:
 * - getLatitudeAtPlot() for latitude compression
 * - addIceAtPlot() for custom ice placement (e.g., Ice Age aggressive ice)
 * - addJunglesAtPlot() for custom jungle placement
 * - addForestsAtPlot() for custom forest placement
 *
 * References:
 * - Civ4 SDK: CvMapGeneratorUtil.py FeatureGenerator class
 * - Civ4 SDK: CvMapGenerator::addFeatures() (C++ generic features)
 * - docs/Civ4-Map-Generation-Complete.md §FeatureGenerator
 * - docs/MapGen-Rewrite-Plan.md §Milestone 6
 */

import { CyFractal, FRAC_WRAP_X, FRAC_WRAP_Y, FRAC_POLAR, FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS } from './CyFractal.js';
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
// clamp no longer needed — getLatitudeAtPlot uses inline min/max matching Civ4

// ============================================================================
// FEATURE TYPES
// ============================================================================

/**
 * Feature type constants matching Civ4's FeatureTypes enum.
 * String values for readability and compatibility with the rendering pipeline.
 */
export const FEATURE = {
  NONE: null,
  ICE: 'ice',
  JUNGLE: 'jungle',
  FOREST: 'forest',
  OASIS: 'oasis',
  FLOODPLAINS: 'floodplains'
};

// ============================================================================
// FEATURE ELIGIBILITY RULES (from CIV4FeatureInfos.xml)
// ============================================================================

/**
 * Data-driven feature placement rules matching CIV4FeatureInfos.xml.
 * Each entry specifies allowed plot types and terrain types.
 */
const FEATURE_RULES = {
  [FEATURE.ICE]: {
    allowedPlots: [PLOT.OCEAN, PLOT.COAST],
    allowedTerrains: null  // any water terrain
  },
  [FEATURE.JUNGLE]: {
    allowedPlots: [PLOT.LAND, PLOT.HILLS],
    allowedTerrains: [TERRAIN.GRASSLAND]  // Civ4 XML: only grassland
  },
  [FEATURE.FOREST]: {
    allowedPlots: [PLOT.LAND, PLOT.HILLS],
    allowedTerrains: [TERRAIN.GRASSLAND, TERRAIN.PLAINS, TERRAIN.TUNDRA]  // NOT snow, NOT desert
  },
  [FEATURE.OASIS]: {
    allowedPlots: [PLOT.LAND],
    allowedTerrains: [TERRAIN.DESERT]
  },
  [FEATURE.FLOODPLAINS]: {
    allowedPlots: [PLOT.LAND],
    allowedTerrains: [TERRAIN.DESERT]
  }
};

// ============================================================================
// FEATURE GENERATOR CLASS
// ============================================================================

/**
 * Places features on a map using Civ4's fractal-threshold model.
 *
 * Two CyFractal instances control feature distribution:
 * - jungle fractal: determines which grassland tiles near the equator get jungle
 * - forest fractal: determines which non-desert land tiles get forest
 *
 * Ice uses a two-tier probability system based on latitude.
 * Oasis and floodplains use Civ4's C++ generic feature rules.
 *
 * @example
 * const fg = new FeatureGenerator(width, height, { jungleLatitude: 0.15 });
 * const features = fg.generateFeatures(rng, plotTypes, terrain);
 * const features2D = fg.toFeatures2D(features);
 */
export class FeatureGenerator {

  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} [settings={}] - Configuration overrides
   * @param {number} [settings.iJunglePercent=80] - Top % of jungle fractal eligible for jungle
   * @param {number} [settings.iForestPercent=60] - Top % of forest fractal eligible for forest
   * @param {number} [settings.jungle_grain=5] - Base grain for jungle fractal
   * @param {number} [settings.forest_grain=6] - Base grain for forest fractal
   * @param {number} [settings.jungleLatitude=0.15] - Max latitude for jungle (hard cutoff). jungleLatitude=0.00 (Ice Age) = no jungle anywhere.
   * @param {number} [settings.fracXExp=7] - Fractal X-axis resolution exponent
   * @param {number} [settings.fracYExp=6] - Fractal Y-axis resolution exponent
   * @param {boolean} [settings.wrapX=true] - Whether map wraps horizontally
   * @param {boolean} [settings.wrapY=false] - Whether map wraps vertically
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    // Map dimensions
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;

    // Feature distribution parameters (Civ4 defaults)
    this.iJunglePercent = settings.iJunglePercent ?? 80;
    this.iForestPercent = settings.iForestPercent ?? 60;

    // Fractal grain
    this.jungle_grain = settings.jungle_grain ?? 5;
    this.forest_grain = settings.forest_grain ?? 6;

    // Jungle max latitude (hard cutoff — from Civ4 climate XML: getJungleLatitude())
    // jungleLatitude=0.00 (Ice Age, arid, cold) → no jungle anywhere
    this.jungleLatitude = settings.jungleLatitude ?? 0.15;

    // Ice latitude parameter (from CIV4ClimateInfo.xml fRandIceLatitude)
    // NOT random — this is a fixed climate parameter despite the name
    // Default 0.25 matches CLIMATE_TEMPERATE XML value
    this.randIceLatitude = settings.randIceLatitude ?? 0.25;

    // Map size key for exact XML grain lookup
    this.mapSize = settings.mapSize || 'standard';

    // Fractal configuration
    const fracXExp = settings.fracXExp || 7;
    const fracYExp = settings.fracYExp || 6;

    // Map wrapping
    this.wrapX = settings.wrapX !== false;
    this.wrapY = settings.wrapY || false;

    // Create fractal instances (initialized later in initFractals)
    this.jungleFrac = new CyFractal(fracXExp, fracYExp);
    this.forestFrac = new CyFractal(fracXExp, fracYExp);

    // Cached height thresholds (set during generateFeatures)
    this._iJungleTop = 0;
    this._iJungleBottom = 0;
    this._iForestLevel = 0;
    this._randIceLatitude = 0; // set from this.randIceLatitude in generateFeatures
  }

  // ==========================================================================
  // FRACTAL INITIALIZATION
  // ==========================================================================

  /**
   * Get grain adjustment based on map size.
   * Exact values from CIV4WorldInfo.xml FeatureGrainChange.
   * @returns {number} Grain adjustment
   */
  getWorldSizeGrainAdjust() {
    const grainBySize = {
      duel: 0, tiny: 0, small: 0,
      standard: 1, large: 1, huge: 1
    };
    return grainBySize[this.mapSize] ?? 1;
  }

  /**
   * Initialize jungle and forest fractals with appropriate grains and flags.
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  initFractals(rng) {
    let flags = 0;
    if (this.wrapX) flags |= FRAC_WRAP_X;
    if (this.wrapY) flags |= FRAC_WRAP_Y;

    const grainAdjust = this.getWorldSizeGrainAdjust();
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    this.jungleFrac.fracInit(
      W, H, this.jungle_grain + grainAdjust, rng, flags
    );
    this.forestFrac.fracInit(
      W, H, this.forest_grain + grainAdjust, rng, flags
    );
  }

  // ==========================================================================
  // LATITUDE CALCULATION
  // ==========================================================================

  /**
   * Compute latitude at a map tile. 0.0 at equator, 1.0 at poles.
   *
   * Simpler than TerrainGenerator's version — no variation fractal jitter.
   * This is the base latitude used for feature placement.
   *
   * Subclasses override this for latitude compression/remapping:
   * - Inland Sea: lat = 0.07 + 0.56 * lat
   * - Ice Age: lat *= 0.6
   * - Balanced: lat = 0.05 + 0.75 * lat
   *
   * @param {number} _x - Tile X coordinate (unused in base, available for subclasses)
   * @param {number} y - Tile Y coordinate
   * @returns {number} Latitude in [0.0, 1.0]
   */
  getLatitudeAtPlot(_x, y) {
    // Civ4: abs((H/2) - y) / (H/2)
    // 0.0 = equator (center of map), 1.0 = pole (top/bottom)
    const halfH = this.iNumPlotsY / 2;
    return Math.max(0.0, Math.min(1.0, Math.abs(halfH - y) / halfH));
  }

  // ==========================================================================
  // FEATURE PLACEMENT — MAIN ENTRY POINT
  // ==========================================================================

  /**
   * Generate features for the entire map.
   *
   * Takes 1D arrays (y * width + x) for plot types and terrain,
   * returns a 1D feature array of the same size.
   *
   * Placement order matches Civ4:
   * 1. Python FeatureGenerator pass: ice → jungle → forest (per plot)
   * 2. C++ generic feature pass: oasis → floodplains (per plot)
   *
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   * @param {number[]} plotTypes - 1D array of PLOT enum values (y * width + x)
   * @param {string[]} terrain - 1D array of TERRAIN enum values (y * width + x)
   * @param {Object[]|null} [rivers=null] - 1D array of river objects { isNOfRiver, isWOfRiver }, or null
   * @returns {string[]} 1D array of FEATURE enum values (y * width + x)
   */
  generateFeatures(rng, plotTypes, terrain, rivers = null) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // 1. Initialize fractals
    this.initFractals(rng);

    // 2. Compute thresholds
    // Civ4: jungle band is [0th, iJunglePercent] — bottom 80% of fractal
    this._iJungleBottom = this.jungleFrac.getHeightFromPercent(0);
    this._iJungleTop    = this.jungleFrac.getHeightFromPercent(this.iJunglePercent);
    // Civ4: iForestLevel = getHeightFromPercent(100 - iForestPercent)
    // With iForestPercent=60: threshold = 40th percentile → top 60% gets forest
    this._iForestLevel = this.forestFrac.getHeightFromPercent(100 - this.iForestPercent);

    // 3. Use climate ice latitude parameter (from CIV4ClimateInfo.xml fRandIceLatitude)
    // This is a fixed climate parameter, NOT randomly generated
    this._randIceLatitude = this.randIceLatitude;

    // 4. Allocate feature array
    const features = new Array(W * H).fill(FEATURE.NONE);

    // 5. Main per-plot feature placement (ice → jungle → forest)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        this.addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng);
      }
    }

    // 6. Generic feature pass: oasis (C++ layer in Civ4)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (features[idx] !== FEATURE.NONE) continue;
        this.addOasisAtPlot(x, y, plotTypes, terrain, features, rng);
      }
    }

    // 7. Floodplains (only if river data is provided)
    if (rivers) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          if (features[idx] !== FEATURE.NONE) continue;
          this.addFloodplainsAtPlot(x, y, plotTypes, terrain, features, rivers);
        }
      }
    }

    return features;
  }

  // ==========================================================================
  // FEATURE ELIGIBILITY (canHaveFeature equivalent)
  // ==========================================================================

  /**
   * Check if a tile can have a given feature type.
   * Data-driven table matching CIV4FeatureInfos.xml rules.
   *
   * @param {string} featureType - Feature type from FEATURE enum
   * @param {number} plotType - Plot type from PLOT enum
   * @param {string} terrainType - Terrain type from TERRAIN enum
   * @returns {boolean}
   */
  canHaveFeature(featureType, plotType, terrainType) {
    const rules = FEATURE_RULES[featureType];
    if (!rules) return false;

    // Plot type check: peaks never get features
    if (plotType === PLOT.PEAK) return false;

    // Check allowed plot types
    if (rules.allowedPlots && !rules.allowedPlots.includes(plotType)) return false;

    // Check allowed terrains (null terrainType skips this check, e.g. for ice)
    if (rules.allowedTerrains && terrainType !== null) {
      if (!rules.allowedTerrains.includes(terrainType)) return false;
    }

    return true;
  }

  // ==========================================================================
  // PER-PLOT FEATURE DISPATCH
  // ==========================================================================

  /**
   * Place features at a single tile. Exact Civ4 order:
   * 1. Generic XML features (appearance probability from CIV4FeatureInfo.xml)
   * 2. Ice
   * 3. Jungle
   * 4. Forest
   *
   * Python checks getFeatureType() == NO_FEATURE before each pass.
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]} features - 1D feature array (mutated in-place)
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;
    const lat = this.getLatitudeAtPlot(x, y);

    // Step 1: Generic XML features (appearance probability)
    this.addGenericFeaturesAtPlot(x, y, plotTypes, terrain, features, rng);

    // Step 2: Ice (only if no feature yet — matches Python pattern)
    if (features[idx] === FEATURE.NONE) {
      this.addIceAtPlot(x, y, lat, plotTypes, features, rng);
    }

    // Step 3: Jungle (only if no feature yet)
    if (features[idx] === FEATURE.NONE) {
      this.addJunglesAtPlot(x, y, lat, plotTypes, terrain, features);
    }

    // Step 4: Forest (only if no feature yet)
    if (features[idx] === FEATURE.NONE) {
      this.addForestsAtPlot(x, y, lat, plotTypes, terrain, features);
    }
  }

  // ==========================================================================
  // GENERIC XML FEATURES
  // ==========================================================================

  /**
   * Generic XML feature pass from Python's addFeaturesAtPlot.
   * Iterates all feature types and places by XML iAppearanceProbability.
   * In standard BTS XML, only FEATURE_FOREST has iAppearanceProbability=5000 (50%).
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]} features - 1D feature array (mutated in-place)
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  addGenericFeaturesAtPlot(x, y, plotTypes, terrain, features, rng) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // FEATURE_FOREST: iAppearanceProbability = 5000 (out of 10000)
    if (this.canHaveFeature(FEATURE.FOREST, plotTypes[idx], terrain[idx])) {
      if (rng.nextInt(0, 9999) < 5000) {
        features[idx] = FEATURE.FOREST;
      }
    }
  }

  // ==========================================================================
  // ICE
  // ==========================================================================

  /**
   * Place ice on water tiles near the poles. Exact Civ4 algorithm.
   *
   * Three rules, checked in order:
   * 1. Edge rows (y=0, y=max): always ice on water
   * 2. Dense band: probability = 8 * (lat - (1.0 - randIceLatitude/2.0))
   * 3. Sparse band: probability = 4 * (lat - (1.0 - randIceLatitude))
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number} lat - Latitude at this tile [0.0, 1.0]
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} features - 1D feature array (mutated in-place)
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  addIceAtPlot(x, y, lat, plotTypes, features, rng) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;

    // Ice eligible on both OCEAN and COAST (Civ4: isWater() = true for both)
    if (plotTypes[idx] !== PLOT.OCEAN && plotTypes[idx] !== PLOT.COAST) return;

    // Civ4: Edge ice only for specific wrap configurations
    if (this.wrapX && !this.wrapY) {
      if (y === 0 || y === H - 1) {
        features[idx] = FEATURE.ICE;
        return;
      }
    } else if (this.wrapY && !this.wrapX) {
      if (x === 0 || x === W - 1) {
        features[idx] = FEATURE.ICE;
        return;
      }
    }

    // Civ4: Single random roll (integer 0-99 / 100.0) for both checks
    const rand = rng.nextInt(0, 99) / 100.0;

    // Dense ice band: 8x multiplier
    if (rand < 8.0 * (lat - (1.0 - (this._randIceLatitude / 2.0)))) {
      features[idx] = FEATURE.ICE;
    }
    // Sparse ice band: 4x multiplier (elif — only if dense didn't trigger)
    else if (rand < 4.0 * (lat - (1.0 - this._randIceLatitude))) {
      features[idx] = FEATURE.ICE;
    }
  }

  // ==========================================================================
  // JUNGLE
  // ==========================================================================

  /**
   * Place jungle on grassland tiles using fractal threshold with latitude falloff.
   * Exact Civ4 algorithm.
   *
   * The eligible fractal range narrows with latitude:
   * - At equator (lat=0): full range [iJungleBottom, iJungleTop] (top 80%)
   * - At higher latitudes: adjustedBottom rises, shrinking the eligible range
   *
   * Formula: adjustedBottom = iJungleBottom + (iJungleTop - iJungleBottom) * jungleLatitude * lat
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number} _lat - Latitude at this tile [0.0, 1.0] (used via getLatitudeAtPlot)
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]} features - 1D feature array (mutated in-place)
   */
  addJunglesAtPlot(x, y, _lat, plotTypes, terrain, features) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // canHaveFeature check (jungle: land/hills + grassland)
    if (!this.canHaveFeature(FEATURE.JUNGLE, plotTypes[idx], terrain[idx])) return;

    // Hard latitude cutoff (original Python: "if lat < jungleLatitude")
    // jungleLatitude=0.00 (Ice Age) → no tile qualifies → zero jungle
    if (_lat >= this.jungleLatitude) return;

    // Latitude-adjusted bottom threshold
    // At equator (lat=0): adjustedBottom = iJungleBottom → maximum jungle range
    // At higher lat: adjustedBottom rises → narrower range → less jungle
    const adjustedBottom = this._iJungleBottom +
      (this._iJungleTop - this._iJungleBottom) * this.jungleLatitude * _lat;

    // Fractal check: height must be in [adjustedBottom, iJungleTop]
    const jungleHeight = this.jungleFrac.getHeight(x, y);
    if (jungleHeight >= adjustedBottom && jungleHeight <= this._iJungleTop) {
      features[idx] = FEATURE.JUNGLE;
    }
  }

  // ==========================================================================
  // FOREST
  // ==========================================================================

  /**
   * Place forest using a simple fractal threshold. Exact Civ4 algorithm.
   *
   * No latitude dependency — purely fractal-controlled.
   * Top iForestPercent (default 60%) of the forest fractal gets forest.
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number} _lat - Latitude (unused in base; available for subclasses)
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]} features - 1D feature array (mutated in-place)
   */
  addForestsAtPlot(x, y, _lat, plotTypes, terrain, features) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // canHaveFeature check (forest: land/hills + grass/plains/tundra/snow)
    if (!this.canHaveFeature(FEATURE.FOREST, plotTypes[idx], terrain[idx])) return;

    // Simple threshold: top iForestPercent (60%) of the fractal
    // iForestLevel = getHeightFromPercent(100 - 60) = 40th percentile
    if (this.forestFrac.getHeight(x, y) >= this._iForestLevel) {
      features[idx] = FEATURE.FOREST;
    }
  }

  // ==========================================================================
  // OASIS / FLOODPLAINS
  // ==========================================================================

  /**
   * Place oasis on flat desert tiles. From Civ4's C++ generic feature system.
   *
   * Rules:
   * - Must be flat desert (PLOT.LAND + TERRAIN.DESERT)
   * - No adjacent water tiles (8 directions)
   * - No adjacent oasis (8 directions)
   * - 3% probability if all checks pass
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]} features - 1D feature array (mutated in-place)
   * @param {import('./utils.js').SeededRandom} rng - Seeded random number generator
   */
  addOasisAtPlot(x, y, plotTypes, terrain, features, rng) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const idx = y * W + x;

    // canHaveFeature check (oasis: flat land + desert)
    if (!this.canHaveFeature(FEATURE.OASIS, plotTypes[idx], terrain[idx])) return;

    // Check no adjacent water or oasis in all 8 directions
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        let nx = x + dx;
        let ny = y + dy;

        // Handle wrapping
        if (this.wrapX) {
          nx = ((nx % W) + W) % W;
        } else if (nx < 0 || nx >= W) {
          continue;
        }

        if (this.wrapY) {
          ny = ((ny % H) + H) % H;
        } else if (ny < 0 || ny >= H) {
          continue;
        }

        const nIdx = ny * W + nx;
        // No oasis adjacent to water (bNoCoast=1 in Civ4 XML: blocks both OCEAN and COAST)
        if (plotTypes[nIdx] === PLOT.OCEAN || plotTypes[nIdx] === PLOT.COAST) return;
        // No oasis adjacent to another oasis
        if (features[nIdx] === FEATURE.OASIS) return;
      }
    }

    // 3% probability (Civ4 XML appearance probability for FEATURE_OASIS)
    if (rng.next() < 0.03) {
      features[idx] = FEATURE.OASIS;
    }
  }

  /**
   * Place floodplains on flat desert tiles with rivers.
   * From Civ4's C++ generic feature system.
   *
   * 100% probability — every eligible tile gets floodplains.
   *
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number[]} plotTypes - 1D plot type array
   * @param {string[]} terrain - 1D terrain array
   * @param {string[]} features - 1D feature array (mutated in-place)
   * @param {Object[]} rivers - 1D array of river objects { isNOfRiver, isWOfRiver }
   */
  addFloodplainsAtPlot(x, y, plotTypes, terrain, features, rivers) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // canHaveFeature check (floodplains: flat land + desert)
    if (!this.canHaveFeature(FEATURE.FLOODPLAINS, plotTypes[idx], terrain[idx])) return;

    // Must have river on an adjacent edge
    if (!this._tileHasRiver(rivers, x, y)) return;

    features[idx] = FEATURE.FLOODPLAINS;
  }

  /**
   * Check if a tile has any river on its edges.
   *
   * A tile has a river if any of its 4 edges has a river segment:
   * - This tile's north edge (isNOfRiver on this tile)
   * - This tile's west edge (isWOfRiver on this tile)
   * - This tile's south edge (isNOfRiver on the tile below)
   * - This tile's east edge (isWOfRiver on the tile to the right)
   *
   * @param {Object[]} rivers - 1D array of river objects { isNOfRiver, isWOfRiver }
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {boolean} True if tile has any river edge
   */
  _tileHasRiver(rivers, x, y) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // Own edges: bottom/south (isNOfRiver) and right/east (isWOfRiver)
    const tile = rivers[idx];
    if (tile && (tile.isNOfRiver || tile.isWOfRiver)) return true;

    // Top/north edge = north neighbor's bottom edge (y-1)
    if (y > 0) {
      const north = rivers[(y - 1) * W + x];
      if (north && north.isNOfRiver) return true;
    }

    // Left/west edge = west neighbor's right edge (x-1)
    const wx = this.wrapX ? ((x - 1 + W) % W) : x - 1;
    if (this.wrapX || wx >= 0) {
      const west = rivers[y * W + wx];
      if (west && west.isWOfRiver) return true;
    }

    return false;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Convert a 1D feature array to 2D for backward compatibility.
   * @param {string[]} featuresArray - 1D feature array (y * width + x)
   * @returns {string[][]} 2D feature array [y][x]
   */
  toFeatures2D(featuresArray) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    return Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) =>
        featuresArray[y * W + x]
      )
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export for convenience (consumers can import from this module)
export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export {
  FRAC_POLAR,
  FRAC_CENTER_RIFT,
  FRAC_INVERT_HEIGHTS,
  FRAC_WRAP_X,
  FRAC_WRAP_Y
} from './CyFractal.js';
