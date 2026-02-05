# Milestone 8: BonusGenerator — Implementation Specification

## Overview

**File**: `src/game/mapgen/BonusGenerator.js`

Port of Civ4's C++ `CvMapGenerator::addBonuses()` and `addBonusType()`. Places resources (bonuses) on the map using XML-style placement rules with terrain/feature requirements, spacing constraints, and area restrictions.

Called in the Civ4 pipeline **after** features:
```
addRivers() → addLakes() → addFeatures() → addBonuses() → assignStartingPlots()
```

---

## 1. Imports

```javascript
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';
import { clamp } from './utils.js';
```

---

## 2. Bonus Class Definitions

Civ4 groups bonuses into classes that control spacing between similar resources:

```javascript
export const BONUS_CLASS = {
  GENERAL: 'general',     // strategic resources (iron, copper, etc.)
  ANCIENT: 'ancient',     // early-game strategics
  MODERN: 'modern',       // late-game strategics
  LUXURY: 'luxury',       // happiness resources
  FOOD: 'food'            // bonus food resources
};
```

---

## 3. Bonus Definitions — Complete Civ4 BTS Data

Each bonus definition contains all placement rules from Civ4 XML:

```javascript
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
    plotTypes: [PLOT.LAND, PLOT.COAST],
    features: null,
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
    plotTypes: [PLOT.COAST],
    features: null,
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
    plotTypes: [PLOT.COAST],
    features: null,
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
    plotTypes: [PLOT.COAST],
    features: null,
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
    plotTypes: [PLOT.COAST],
    features: null,
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
```

---

## 4. Constructor

```javascript
constructor(mapWidth, mapHeight, settings = {})
```

### Instance Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `iNumPlotsX` | mapWidth | Map width |
| `iNumPlotsY` | mapHeight | Map height |
| `wrapX` | `settings.wrapX !== false` | Horizontal wrapping |
| `wrapY` | `settings.wrapY \|\| false` | Vertical wrapping |
| `numPlayers` | `settings.numPlayers \|\| 7` | Player count (affects resource quantities) |

---

## 5. Core Methods

### 5.1 `addBonuses(rng, plotTypes, terrain, features, bonuses = null)` — Main Entry Point

Returns 1D array of bonus IDs (string or null).

```javascript
addBonuses(rng, plotTypes, terrain, features, bonuses = null) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // Initialize bonus array
  const result = bonuses || new Array(W * H).fill(null);

  // Compute area IDs for isOneArea support
  const areas = this._computeAreas(plotTypes);

  // Place each bonus type in order
  for (const bonusDef of BONUS_DEFS) {
    this._addBonusType(bonusDef, rng, plotTypes, terrain, features, result, areas);
  }

  return result;
}
```

### 5.2 `_addBonusType(bonusDef, rng, plotTypes, terrain, features, bonuses, areas)` — Per-Type Placement

Exact Civ4 algorithm for placing one bonus type:

```javascript
_addBonusType(bonusDef, rng, plotTypes, terrain, features, bonuses, areas) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // 1. Find all valid tiles for this bonus (ignoring spacing for count estimation)
  const validTiles = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (this._canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses, false)) {
        validTiles.push({ x, y });
      }
    }
  }

  if (validTiles.length === 0) return;

  // 2. Calculate count
  const count = this._calculateBonusCount(bonusDef, validTiles.length, rng);
  if (count === 0) return;

  // 3. If isOneArea: restrict to the area (landmass) with most valid tiles
  let targetArea = -1;
  if (bonusDef.isOneArea) {
    targetArea = this._findBestArea(validTiles, areas);
  }

  // 4. Placement loop
  rng.shuffle(validTiles);
  let placed = 0;

  for (const tile of validTiles) {
    if (placed >= count) break;

    // Area restriction
    if (targetArea >= 0) {
      const tileArea = areas[tile.y * W + tile.x];
      if (tileArea !== targetArea) continue;
    }

    // Full validation including spacing
    if (this._canPlaceBonusAt(tile.x, tile.y, bonusDef, plotTypes, terrain, features, bonuses, true)) {
      bonuses[tile.y * W + tile.x] = bonusDef.id;
      placed++;
    }
  }
}
```

### 5.3 `_calculateBonusCount(bonusDef, numPossible, rng)` — Civ4 Count Formula

```javascript
_calculateBonusCount(bonusDef, numPossible, rng) {
  // Civ4 formula (simplified):
  // Base count from number of possible tiles and unique range
  const range = bonusDef.iUniqueRange || 3;
  const baseCount = Math.max(1, Math.floor(numPossible / (range * range * 2)));

  // Player modifier: more players = more resources
  const playerMod = Math.max(0,
    Math.floor(this.numPlayers * 1.5) + rng.nextInt(0, Math.max(0, Math.floor(this.numPlayers / 2)))
  );

  // Scale: strategic get more per player, luxury/food get base + small player bonus
  let count;
  if (bonusDef.bonusClass === BONUS_CLASS.GENERAL ||
      bonusDef.bonusClass === BONUS_CLASS.ANCIENT ||
      bonusDef.bonusClass === BONUS_CLASS.MODERN) {
    // Strategic: base count + player scaling
    count = Math.max(1, baseCount + Math.floor(playerMod / 4));
  } else {
    // Luxury/Food: base count + smaller player scaling
    count = Math.max(1, baseCount + Math.floor(playerMod / 6));
  }

  return count;
}
```

### 5.4 `_canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses, checkSpacing)` — Validation

```javascript
_canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses, checkSpacing) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;

  // 1. Already has a bonus?
  if (bonuses[idx] !== null) return false;

  const plot = plotTypes[idx];
  const terr = terrain[idx];
  const feat = features[idx];

  // 2. Water-only check
  if (bonusDef.waterOnly) {
    if (plot !== PLOT.OCEAN && plot !== PLOT.COAST) return false;
  } else {
    if (plot === PLOT.OCEAN) return false;
  }

  // 3. Plot type check
  if (bonusDef.plotTypes && !bonusDef.plotTypes.includes(plot)) return false;

  // 4. Terrain check (skip for hills-only resources where terrain is irrelevant)
  if (bonusDef.terrain && !bonusDef.terrain.includes(terr)) return false;

  // 5. Hills requirement
  if (bonusDef.requiresHills && plot !== PLOT.HILLS) return false;

  // 6. Flatlands requirement
  if (bonusDef.requiresFlatlands && plot !== PLOT.LAND && plot !== PLOT.COAST) return false;

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
```

### 5.5 Spacing Helpers

```javascript
/**
 * Check if any instance of bonusId exists within Manhattan distance `range`.
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
 */
_hasClassInRange(x, y, bonusClass, range, bonuses) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // Build a lookup from bonusId → bonusClass
  // (cached on first call for efficiency)
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
```

### 5.6 `_computeAreas(plotTypes)` — Connected Region Detection

For `isOneArea` support. Returns 1D array of area IDs (integer per tile). Tiles in the same connected land region share an area ID.

```javascript
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
        for (const [dx, dy] of [[0,-1],[0,1],[1,0],[-1,0]]) {
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
```

### 5.7 `_findBestArea(validTiles, areas)` — Best Landmass for OneArea

```javascript
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
```

---

## 6. Utility: `toBonuses2D(bonusArray)`

```javascript
toBonuses2D(bonusArray) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => bonusArray[y * W + x])
  );
}
```

---

## 7. Exports

```javascript
export { BONUS_DEFS, BONUS_CLASS };
export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
```

---

## 8. Differences from Existing `mapGenerator.js`

| Aspect | Old `placeResources()` | New `BonusGenerator` |
|--------|----------------------|---------------------|
| Count formula | Fixed `landTiles * percentage` | Civ4 formula: numPossible / (range² * 2) + playerMod |
| Spacing | Flat `minDist=3` for all | Per-bonus `iUniqueRange` + per-class `iGroupRange` + adjacency |
| One-area rule | Not implemented | BFS area detection, restrict to largest valid landmass |
| Bonus definitions | Inline `RESOURCE_RULES` object | Separate `BONUS_DEFS` array matching Civ4 XML |
| Feature requirements | Boolean flags (requiresForest, requiresJungle) | Array-based: `features: [FEATURE.FOREST]` |
| Data format | 2D arrays | 1D arrays with `toBonuses2D()` |

---

## 9. Testing / Verification Criteria

1. **Terrain validity**: each resource only on valid terrain/feature/elevation
2. **Unique range**: no two of same resource within `iUniqueRange` Manhattan distance
3. **Group range**: no two of same class within `iGroupRange` Manhattan distance
4. **Adjacency**: no resource adjacent to another (8 directions)
5. **One-area**: iron, copper, horse, etc. all on the same landmass per resource type
6. **Count scaling**: more resources on larger maps and with more players
7. **Water resources**: fish/clam/crab/whale only on coast tiles
8. **No peak resources**: nothing placed on peaks
9. **`npm run lint`**: clean, **`npm run build`**: clean
