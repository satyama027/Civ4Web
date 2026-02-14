/**
 * BonusGenerator - Civ4-compatible resource (bonus) placement
 *
 * Places resources on the map using XML-style placement rules with terrain/feature
 * requirements, spacing constraints, and area restrictions.
 *
 * This is a direct port of CvMapGenerator::addBonuses() and addBonusType() from Civ4 BTS.
 *
 * Called in the Civ4 pipeline after features:
 *   addRivers() → addLakes() → addFeatures() → addBonuses() → assignStartingPlots()
 *
 * References:
 * - Civ4 SDK: CvMapGenerator.cpp addBonuses() / addBonusType()
 * - docs/Milestone-8-BonusGenerator-Spec.md
 * - docs/MapGen-Rewrite-Plan.md §Milestone 8
 */

import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';

// ============================================================================
// BONUS CLASS DEFINITIONS
// ============================================================================

/**
 * Bonus class constants - controls spacing between similar resources.
 */
export const BONUS_CLASS = {
  GENERAL: 'general',     // strategic resources (iron, copper, etc.)
  ANCIENT: 'ancient',     // early-game strategics
  MODERN: 'modern',       // late-game strategics
  LUXURY: 'luxury',       // happiness resources
  FOOD: 'food'            // bonus food resources
};

// ============================================================================
// BONUS DEFINITIONS - Complete Civ4 BTS Data
// ============================================================================

/**
 * Each bonus definition contains all placement rules from Civ4 XML.
 */
export const BONUS_DEFS = [
  // === STRATEGIC RESOURCES ===
  {
    id: 'aluminum',
    bonusClass: BONUS_CLASS.MODERN,
    terrain: [TERRAIN.HILLS],         // placeholder — terrain is irrelevant when requiresHills=true
    plotTypes: [PLOT.HILLS],          // hills only
    features: null,                    // any or no feature
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'industrialism'
  },
  {
    id: 'coal',
    bonusClass: BONUS_CLASS.MODERN,
    plotTypes: [PLOT.HILLS],
    features: null,
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'steam_power'
  },
  {
    id: 'copper',
    bonusClass: BONUS_CLASS.ANCIENT,
    plotTypes: [PLOT.HILLS],
    features: null,
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'bronze_working'
  },
  {
    id: 'horse',
    bonusClass: BONUS_CLASS.ANCIENT,
    terrain: [TERRAIN.PLAINS, TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: null,                    // Civ4: no feature required, but canHaveBonus excludes forest/jungle
    noFeature: true,                   // must be featureless
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'animal_husbandry'
  },
  {
    id: 'iron',
    bonusClass: BONUS_CLASS.ANCIENT,
    plotTypes: [PLOT.HILLS],
    features: null,
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'iron_working'
  },
  {
    id: 'marble',
    bonusClass: BONUS_CLASS.GENERAL,
    terrain: [TERRAIN.PLAINS, TERRAIN.GRASSLAND, TERRAIN.TUNDRA],
    plotTypes: [PLOT.LAND, PLOT.HILLS],
    features: null,
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'masonry'
  },
  {
    id: 'oil',
    bonusClass: BONUS_CLASS.MODERN,
    terrain: [TERRAIN.DESERT, TERRAIN.TUNDRA, TERRAIN.COAST],
    plotTypes: [PLOT.LAND, PLOT.OCEAN],
    features: null,
    terrainTypes: [TERRAIN.COAST],     // water tiles must be coast terrain
    requiresHills: false,
    requiresFlatlands: true,           // flat land OR coast
    waterOnly: false,                  // can be on land OR water
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'combustion'
  },
  {
    id: 'stone',
    bonusClass: BONUS_CLASS.GENERAL,
    terrain: [TERRAIN.PLAINS, TERRAIN.GRASSLAND, TERRAIN.TUNDRA],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,                  // NOT one-area (only strategic with this)
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'masonry'
  },
  {
    id: 'uranium',
    bonusClass: BONUS_CLASS.MODERN,
    terrain: [TERRAIN.PLAINS, TERRAIN.DESERT, TERRAIN.TUNDRA],
    plotTypes: [PLOT.LAND, PLOT.HILLS],
    features: [FEATURE.FOREST],        // requires forest (or no feature)
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: true,
    iUniqueRange: 3,
    iGroupRange: 3,
    techReveal: 'physics'
  },

  // === LUXURY RESOURCES ===
  {
    id: 'dye',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: [FEATURE.JUNGLE],        // requires jungle
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'fur',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.TUNDRA],
    plotTypes: [PLOT.LAND, PLOT.HILLS],
    features: [FEATURE.FOREST],        // requires forest
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'gems',
    bonusClass: BONUS_CLASS.LUXURY,
    plotTypes: [PLOT.HILLS],
    features: [FEATURE.JUNGLE],        // requires jungle on hills
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'gold',
    bonusClass: BONUS_CLASS.LUXURY,
    plotTypes: [PLOT.HILLS],
    features: null,
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'incense',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.DESERT],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'ivory',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.PLAINS],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'silk',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: [FEATURE.FOREST],        // requires forest
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'silver',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.TUNDRA],         // also hills on any terrain
    plotTypes: [PLOT.HILLS],
    features: null,
    requiresHills: true,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'spices',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: [FEATURE.JUNGLE],        // requires jungle
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'sugar',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: [FEATURE.FLOODPLAINS],   // requires floodplains
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'wine',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.PLAINS, TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND, PLOT.HILLS],
    features: null,
    noFeature: true,
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },
  {
    id: 'whale',
    bonusClass: BONUS_CLASS.LUXURY,
    terrain: [TERRAIN.COAST],
    plotTypes: [PLOT.OCEAN],
    features: null,
    terrainTypes: [TERRAIN.COAST],     // water tiles must be coast terrain
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: true,
    isOneArea: false,
    iUniqueRange: 5,
    iGroupRange: 3
  },

  // === FOOD (BONUS) RESOURCES ===
  {
    id: 'banana',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: [FEATURE.JUNGLE],
    requiresHills: false,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'clam',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.COAST],
    plotTypes: [PLOT.OCEAN],
    features: null,
    terrainTypes: [TERRAIN.COAST],     // water tiles must be coast terrain
    waterOnly: true,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'corn',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.PLAINS, TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'cow',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'crab',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.COAST],
    plotTypes: [PLOT.OCEAN],
    features: null,
    terrainTypes: [TERRAIN.COAST],     // water tiles must be coast terrain
    waterOnly: true,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'deer',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.TUNDRA],
    plotTypes: [PLOT.LAND, PLOT.HILLS],
    features: [FEATURE.FOREST],
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'fish',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.COAST],
    plotTypes: [PLOT.OCEAN],
    features: null,
    terrainTypes: [TERRAIN.COAST],     // water tiles must be coast terrain
    waterOnly: true,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'pig',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: [FEATURE.FOREST],
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'rice',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,                   // Civ4: marshland, simplified to featureless grass
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'sheep',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.PLAINS, TERRAIN.GRASSLAND],
    plotTypes: [PLOT.LAND, PLOT.HILLS],
    features: null,
    noFeature: true,
    requiresHills: false,
    requiresFlatlands: false,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  },
  {
    id: 'wheat',
    bonusClass: BONUS_CLASS.FOOD,
    terrain: [TERRAIN.PLAINS],
    plotTypes: [PLOT.LAND],
    features: null,
    noFeature: true,
    requiresFlatlands: true,
    waterOnly: false,
    isOneArea: false,
    iUniqueRange: 3,
    iGroupRange: 3
  }
];

// ============================================================================
// BONUS GENERATOR CLASS
// ============================================================================

/**
 * Places bonuses (resources) on a map using Civ4's placement rules.
 *
 * Features:
 * - Terrain/feature/plot type validation per bonus definition
 * - Unique range: minimum distance between same bonus type
 * - Group range: minimum distance between same bonus class
 * - Adjacency: no resources on adjacent tiles
 * - One-area: some resources restricted to a single landmass
 *
 * @example
 * const bg = new BonusGenerator(width, height, { numPlayers: 7 });
 * const bonuses = bg.addBonuses(rng, plotTypes, terrain, features);
 * const bonuses2D = bg.toBonuses2D(bonuses);
 */
export class BonusGenerator {

  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {Object} [settings={}] - Configuration overrides
   * @param {boolean} [settings.wrapX=true] - Whether map wraps horizontally
   * @param {boolean} [settings.wrapY=false] - Whether map wraps vertically
   * @param {number} [settings.numPlayers=7] - Player count (affects resource quantities)
   * @param {Function|null} [settings.addBonusType=null] - Script override: (bonusDef, rng, plotTypes, terrain, features, bonuses, areas) => void
   * @param {Function|null} [settings.canPlaceBonusAt=null] - Script override: (x, y, bonusDef, plotTypes, terrain, features, bonuses) => boolean
   */
  constructor(mapWidth, mapHeight, settings = {}) {
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.wrapX = settings.wrapX !== false;
    this.wrapY = settings.wrapY || false;
    this.numPlayers = settings.numPlayers || 7;

    // Latitude range (for future latitude-based restrictions)
    this.topLatitude = settings.topLatitude ?? 90;
    this.bottomLatitude = settings.bottomLatitude ?? -90;

    // When true, bonus placement ignores latitude restrictions
    this.ignoreLatitude = settings.ignoreLatitude ?? false;

    // Script override callbacks (CvMapScriptInterface hooks)
    this._scriptAddBonusType = settings.addBonusType ?? null;
    this._scriptCanPlaceBonusAt = settings.canPlaceBonusAt ?? null;

    // Lazy-init cache for class lookup
    this._classLookup = null;
  }

  // ==========================================================================
  // MAIN ENTRY POINT
  // ==========================================================================

  /**
   * Place all bonus resources on the map.
   *
   * @param {SeededRandom} rng - Random number generator
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values (null for none)
   * @param {string[]|null} [bonuses=null] - Optional existing bonus array to extend
   * @returns {string[]} 1D array of bonus IDs (string or null)
   */
  addBonuses(rng, plotTypes, terrain, features, bonuses = null) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // Initialize bonus array
    const result = bonuses || new Array(W * H).fill(null);

    // Compute area IDs for isOneArea support
    const areas = this._computeAreas(plotTypes);

    // Place each bonus type in order
    for (const bonusDef of BONUS_DEFS) {
      if (this._scriptAddBonusType) {
        this._scriptAddBonusType(bonusDef, rng, plotTypes, terrain, features, result, areas);
      } else {
        this._addBonusType(bonusDef, rng, plotTypes, terrain, features, result, areas);
      }
    }

    return result;
  }

  // ==========================================================================
  // PER-TYPE PLACEMENT
  // ==========================================================================

  /**
   * Place a single bonus type on the map.
   *
   * Uses Civ4's per-area density: each landmass gets at least 1 of each
   * valid resource if it has any eligible tiles. Larger landmasses get
   * proportionally more. This ensures small islands aren't resource-starved.
   *
   * @param {Object} bonusDef - Bonus definition from BONUS_DEFS
   * @param {SeededRandom} rng - Random number generator
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of placed bonuses (modified in place)
   * @param {number[]} areas - 1D array of area IDs
   */
  _addBonusType(bonusDef, rng, plotTypes, terrain, features, bonuses, areas) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // 1. Find all valid tiles grouped by area
    const validByArea = new Map(); // areaId → [{x, y}]
    const allValid = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const canPlace = this._scriptCanPlaceBonusAt
          ? this._scriptCanPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses)
          : this._canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses, false);
        if (canPlace) {
          const tile = { x, y };
          allValid.push(tile);
          const areaId = areas[y * W + x];
          if (areaId >= 0) {
            if (!validByArea.has(areaId)) validByArea.set(areaId, []);
            validByArea.get(areaId).push(tile);
          }
        }
      }
    }

    if (allValid.length === 0) return;

    // 2. Calculate per-area target counts (Civ4 CvArea-based density)
    const range = bonusDef.iUniqueRange || 3;
    const ratio = range * range * 2;
    let totalCount = 0;

    // For each area with eligible tiles, calculate its share
    const areaTargets = new Map();
    for (const [areaId, tiles] of validByArea) {
      // Each area gets at least 1 if it has any eligible tiles
      const areaCount = Math.max(1, Math.floor(tiles.length / ratio));
      areaTargets.set(areaId, areaCount);
      totalCount += areaCount;
    }

    // Apply player modifier to total count
    const playerMod = Math.max(0,
      Math.floor(this.numPlayers * 1.5) + rng.nextInt(0, Math.max(0, Math.floor(this.numPlayers / 2)))
    );
    if (bonusDef.bonusClass === BONUS_CLASS.GENERAL ||
        bonusDef.bonusClass === BONUS_CLASS.ANCIENT ||
        bonusDef.bonusClass === BONUS_CLASS.MODERN) {
      totalCount += Math.floor(playerMod / 4);
    } else {
      totalCount += Math.floor(playerMod / 6);
    }
    totalCount = Math.max(1, totalCount);

    // 3. If isOneArea: restrict to the area with most valid tiles
    let targetArea = -1;
    if (bonusDef.isOneArea) {
      targetArea = this._findBestArea(allValid, areas);
    }

    // 4. Placement loop
    rng.shuffle(allValid);
    let placed = 0;

    for (const tile of allValid) {
      if (placed >= totalCount) break;

      // Area restriction for isOneArea resources
      if (targetArea >= 0) {
        const tileArea = areas[tile.y * W + tile.x];
        if (tileArea !== targetArea) continue;
      }

      // Full validation including spacing
      const canPlace = this._scriptCanPlaceBonusAt
        ? this._scriptCanPlaceBonusAt(tile.x, tile.y, bonusDef, plotTypes, terrain, features, bonuses)
        : this._canPlaceBonusAt(tile.x, tile.y, bonusDef, plotTypes, terrain, features, bonuses, true);
      if (canPlace) {
        bonuses[tile.y * W + tile.x] = bonusDef.id;
        placed++;
      }
    }
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Check if a bonus can be placed at the given location.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} bonusDef - Bonus definition
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {string[]} features - 1D array of FEATURE values
   * @param {string[]} bonuses - 1D array of placed bonuses
   * @param {boolean} checkSpacing - Whether to check spacing constraints
   * @returns {boolean} True if bonus can be placed here
   */
  _canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses, checkSpacing) {
    const W = this.iNumPlotsX;
    const idx = y * W + x;

    // 1. Already has a bonus?
    if (bonuses[idx] !== null) return false;

    const plot = plotTypes[idx];
    const terr = terrain[idx];
    const feat = features[idx];

    // 2. Water-only check
    if (bonusDef.waterOnly) {
      if (plot !== PLOT.OCEAN) return false;
    } else {
      if (plot === PLOT.OCEAN) return false;
    }

    // 3. Plot type check
    if (bonusDef.plotTypes && !bonusDef.plotTypes.includes(plot)) return false;

    // 4. Terrain check (skip for hills-only resources where terrain is irrelevant)
    if (bonusDef.terrain && !bonusDef.terrain.includes(terr)) return false;

    // 4b. Terrain type restriction for water tiles (e.g. fish/clam/crab must be on TERRAIN.COAST, not deep ocean)
    if (bonusDef.terrainTypes && plot === PLOT.OCEAN) {
      if (!bonusDef.terrainTypes.includes(terr)) return false;
    }

    // 5. Hills requirement
    if (bonusDef.requiresHills && plot !== PLOT.HILLS) return false;

    // 6. Flatlands requirement
    if (bonusDef.requiresFlatlands && plot !== PLOT.LAND) return false;

    // 7. No peaks
    if (plot === PLOT.PEAK) return false;

    // 8. Feature check
    if (bonusDef.noFeature && feat !== FEATURE.NONE) return false;
    if (bonusDef.features) {
      // Must have one of the listed features
      if (!bonusDef.features.includes(feat)) return false;
    }

    // 9. Spacing checks (only when checkSpacing=true)
    if (checkSpacing) {
      // Unique range: no same bonus within iUniqueRange Manhattan distance
      if (bonusDef.iUniqueRange > 0) {
        if (this._hasBonusInRange(x, y, bonusDef.id, bonusDef.iUniqueRange, bonuses)) {
          return false;
        }
      }

      // Group range: no same bonusClass within iGroupRange Manhattan distance
      if (bonusDef.iGroupRange > 0) {
        if (this._hasClassInRange(x, y, bonusDef.bonusClass, bonusDef.iGroupRange, bonuses)) {
          return false;
        }
      }

      // Adjacency: no other bonus in 8 adjacent tiles (soft constraint)
      if (this._hasAdjacentBonus(x, y, bonuses)) {
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // SPACING HELPERS
  // ==========================================================================

  /**
   * Check if any instance of bonusId exists within Manhattan distance `range`.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} bonusId - Bonus ID to check for
   * @param {number} range - Manhattan distance range
   * @param {string[]} bonuses - 1D array of placed bonuses
   * @returns {boolean} True if same bonus exists within range
   */
  _hasBonusInRange(x, y, bonusId, range, bonuses) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > range) continue;  // Manhattan distance

        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;

        if (this.wrapY) ny = ((ny % H) + H) % H;
        else if (ny < 0 || ny >= H) continue;

        if (bonuses[ny * W + nx] === bonusId) return true;
      }
    }
    return false;
  }

  /**
   * Check if any bonus of the same class exists within Manhattan distance `range`.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} bonusClass - Bonus class to check for
   * @param {number} range - Manhattan distance range
   * @param {string[]} bonuses - 1D array of placed bonuses
   * @returns {boolean} True if same class bonus exists within range
   */
  _hasClassInRange(x, y, bonusClass, range, bonuses) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    // Build a lookup from bonusId → bonusClass (cached on first call for efficiency)
    if (!this._classLookup) {
      this._classLookup = {};
      for (const def of BONUS_DEFS) {
        this._classLookup[def.id] = def.bonusClass;
      }
    }

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > range) continue;

        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;

        if (this.wrapY) ny = ((ny % H) + H) % H;
        else if (ny < 0 || ny >= H) continue;

        const existingBonus = bonuses[ny * W + nx];
        if (existingBonus && this._classLookup[existingBonus] === bonusClass) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if any bonus exists in the 8 adjacent tiles.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string[]} bonuses - 1D array of placed bonuses
   * @returns {boolean} True if any adjacent tile has a bonus
   */
  _hasAdjacentBonus(x, y, bonuses) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        let nx = x + dx;
        let ny = y + dy;

        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;

        if (this.wrapY) ny = ((ny % H) + H) % H;
        else if (ny < 0 || ny >= H) continue;

        if (bonuses[ny * W + nx] !== null) return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // AREA DETECTION
  // ==========================================================================

  /**
   * Compute connected regions (areas) for isOneArea support.
   * Uses BFS flood fill to assign area IDs to connected land tiles.
   *
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @returns {number[]} 1D array of area IDs (-1 for ocean, >= 0 for land regions)
   */
  _computeAreas(plotTypes) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    const areas = new Array(W * H).fill(-1);
    let nextAreaId = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (areas[idx] !== -1) continue;
        if (plotTypes[idx] === PLOT.OCEAN) continue;

        // BFS flood fill for this connected land region
        const areaId = nextAreaId++;
        const queue = [{ x, y }];
        areas[idx] = areaId;

        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();

          // Check 4 cardinal neighbors
          for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
            let nx = cx + dx;
            let ny = cy + dy;

            if (this.wrapX) nx = ((nx % W) + W) % W;
            else if (nx < 0 || nx >= W) continue;

            if (this.wrapY) ny = ((ny % H) + H) % H;
            else if (ny < 0 || ny >= H) continue;

            const nIdx = ny * W + nx;
            if (areas[nIdx] !== -1) continue;
            if (plotTypes[nIdx] === PLOT.OCEAN) continue;

            areas[nIdx] = areaId;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    return areas;
  }

  /**
   * Find the area (landmass) with the most valid tiles for a bonus.
   *
   * @param {Object[]} validTiles - Array of {x, y} valid tile coordinates
   * @param {number[]} areas - 1D array of area IDs
   * @returns {number} Area ID with most valid tiles, or -1 if none
   */
  _findBestArea(validTiles, areas) {
    const W = this.iNumPlotsX;
    const areaCounts = {};

    for (const tile of validTiles) {
      const areaId = areas[tile.y * W + tile.x];
      if (areaId >= 0) {
        areaCounts[areaId] = (areaCounts[areaId] || 0) + 1;
      }
    }

    let bestArea = -1;
    let bestCount = 0;
    for (const [areaId, count] of Object.entries(areaCounts)) {
      if (count > bestCount) {
        bestCount = count;
        bestArea = parseInt(areaId);
      }
    }

    return bestArea;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Convert 1D bonus array to 2D array.
   *
   * @param {string[]} bonusArray - 1D array of bonus IDs
   * @returns {string[][]} 2D array [y][x] of bonus IDs
   */
  toBonuses2D(bonusArray) {
    const W = this.iNumPlotsX;
    const H = this.iNumPlotsY;
    return Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => bonusArray[y * W + x])
    );
  }
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
