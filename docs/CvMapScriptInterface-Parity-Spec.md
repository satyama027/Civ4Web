# CvMapScriptInterface Parity Spec

**Goal**: Make the JS map generation pipeline expose the same override-hook architecture as the original Python `CvMapScriptInterface.py`. Every function in the Python interface should have a direct JS equivalent that map scripts can individually override, with sensible defaults when not overridden.

**Source of truth**: `D:\Games\Civilization IV Complete\Civ4\Assets\Python\EntryPoints\CvMapScriptInterface.py`

---

## 1. Design Principle: Script-Level Override Hooks

### Current JS architecture (monolithic)

Each script exports a `generate(settings, rng)` function that runs the entire pipeline internally. To change one step (e.g. rivers), a script must reimplement the full `generate()` function.

### Target JS architecture (hook-based)

The entry point (`index.js`) should orchestrate the pipeline by calling individual hook functions on the script object, mirroring the Python order of operations. Each hook has a default implementation. A script overrides only the hooks it needs.

```
index.js calls:  script.beforeInit()
                 script.getGridSize()
                 script.getTopLatitude() / getBottomLatitude()
                 script.isBonusIgnoreLatitude()
                 script.getWrapX() / getWrapY()
                 script.beforeGeneration()
                 script.generateRandomMap()       ← if present, skips generatePlotTypes + generateTerrain
                   OR script.generatePlotTypes()
                      script.generateTerrain()
                 script.addRivers()
                 script.getRiverStartCardinalDirection()  ← called per river by RiverGenerator
                 script.getRiverAltitude()                ← called per plot by RiverGenerator
                 script.addLakes()
                 script.addFeatures()
                 script.addBonuses()
                 script.addBonusType()                    ← called per bonus type by BonusGenerator
                 script.canPlaceBonusAt()                 ← called per plot per bonus by BonusGenerator
                 script.addGoodies()
                 script.canPlaceGoodyAt()                 ← called per plot by GoodyGenerator
                 script.afterGeneration()
                 script.minStartingDistanceModifier()
                 script.assignStartingPlots()
                 script.findStartingPlot()                ← called per player
                 script.findStartingArea()                ← called per player
                 script.normalizeStartingPlotLocations()
                 script.normalizeAddRiver()
                 script.normalizeRemovePeaks()
                 script.normalizeAddLakes()
                 script.normalizeRemoveBadFeatures()
                 script.normalizeRemoveBadTerrain()
                 script.normalizeAddFoodBonuses()
                 script.normalizeAddGoodTerrain()
                 script.normalizeAddExtras()
                 script.startHumansOnSameTile()
```

---

## 2. File Changes

### 2.1 `src/game/mapgen/index.js` — Pipeline Orchestrator

Replace the current `generateMap()` implementation. Instead of calling `script.generate()`, the orchestrator calls each hook in order, using defaults when the script doesn't provide an override.

#### New `generateMap()` pseudocode

```javascript
export function generateMap(settings) {
  const script = getMapScript(settings.mapType);
  const rng = new SeededRandom(settings.seed);

  // --- Phase 1: Initialization ---
  call(script, 'beforeInit', settings, rng);

  // --- Phase 2: Grid & Latitude ---
  const gridSize = call(script, 'getGridSize', settings.mapSize)
                   ?? getDefaultDimensions(settings.mapSize);
  const { width: W, height: H } = gridSize;
  const topLat    = call(script, 'getTopLatitude')    ?? 90;
  const bottomLat = call(script, 'getBottomLatitude') ?? -90;
  const bonusIgnoreLat = call(script, 'isBonusIgnoreLatitude') ?? false;
  const wrapX = call(script, 'getWrapX') ?? true;
  const wrapY = call(script, 'getWrapY') ?? false;

  // --- Phase 3: Pre-generation ---
  call(script, 'beforeGeneration', settings, rng);

  // --- Phase 4: Map generation ---
  let plotTypes, terrain;

  if (script.generateRandomMap) {
    // Script takes full control of plot + terrain generation
    const result = script.generateRandomMap(W, H, settings, rng);
    plotTypes = result.plotTypes;
    terrain   = result.terrain;
  } else {
    // Default sequence: plotTypes then terrain
    plotTypes = call(script, 'generatePlotTypes', W, H, settings, rng)
                ?? defaultGeneratePlotTypes(W, H, settings, rng, wrapX, wrapY);
    terrain   = call(script, 'generateTerrain', W, H, plotTypes, settings, rng)
                ?? defaultGenerateTerrain(W, H, plotTypes, settings, rng, wrapX, wrapY);
  }

  // --- Phase 5: Rivers ---
  const riverCallbacks = {
    getRiverStartCardinalDirection: script.getRiverStartCardinalDirection ?? null,
    getRiverAltitude: script.getRiverAltitude ?? null
  };
  const { rivers, lakes } = call(script, 'addRivers', W, H, plotTypes, terrain, rng, riverCallbacks)
    ?? defaultAddRivers(W, H, plotTypes, terrain, rng, wrapX, wrapY, riverCallbacks);

  // --- Phase 5b: Lakes ---
  // addLakes called separately if script overrides it; otherwise included in defaultAddRivers
  call(script, 'addLakes', W, H, plotTypes, rng)
    ?? defaultAddLakes(W, H, plotTypes);

  // --- Phase 6: Features ---
  const features = call(script, 'addFeatures', W, H, plotTypes, terrain, rivers, settings, rng)
    ?? defaultAddFeatures(W, H, plotTypes, terrain, rivers, settings, rng, wrapX, wrapY);

  // --- Phase 7: Bonuses ---
  const bonusCallbacks = {
    addBonusType: script.addBonusType ?? null,
    canPlaceBonusAt: script.canPlaceBonusAt ?? null
  };
  const bonuses = call(script, 'addBonuses', W, H, plotTypes, terrain, features, settings, rng, bonusCallbacks)
    ?? defaultAddBonuses(W, H, plotTypes, terrain, features, settings, rng, wrapX, wrapY, bonusCallbacks);

  // --- Phase 8: Goodies ---
  const goodyCallbacks = {
    canPlaceGoodyAt: script.canPlaceGoodyAt ?? null
  };
  const goodies = call(script, 'addGoodies', W, H, plotTypes, terrain, features, bonuses, starts, rng, goodyCallbacks)
    ?? defaultAddGoodies(W, H, plotTypes, terrain, features, bonuses, starts, rng, wrapX, wrapY, goodyCallbacks);

  // --- Phase 9: Post-generation ---
  call(script, 'afterGeneration', { W, H, plotTypes, terrain, features, bonuses, rivers, lakes, goodies }, rng);

  // --- Phase 10: Starting plots ---
  const distMod = call(script, 'minStartingDistanceModifier') ?? 0;

  let starts;
  if (script.assignStartingPlots) {
    starts = script.assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng);
  } else {
    // Default: uses findStartingArea (per-player) then findStartingPlot (per-player)
    starts = defaultAssignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes,
                                        settings, rng, distMod, wrapX, wrapY, {
                                          findStartingPlot: script.findStartingPlot ?? null,
                                          findStartingArea: script.findStartingArea ?? null
                                        });
  }

  // --- Phase 11: Normalization ---
  callNormalize(script, starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng, W, H, wrapX, wrapY);

  // --- Phase 12: startHumansOnSameTile ---
  const humansOnSameTile = call(script, 'startHumansOnSameTile') ?? false;

  // --- Phase 13: Heightmap + output ---
  const heightmap = generateHeightmap(W, H, rng);
  return buildFinalMapData({ ... }, heightmap, settings, seed, { humansOnSameTile });
}
```

#### `callNormalize()` helper

Calls each normalize hook individually, falling back to `StartingPlots` default methods:

```javascript
function callNormalize(script, starts, plots, terrain, features, bonuses, rivers, lakes, rng, W, H, wrapX, wrapY) {
  const sp = new StartingPlots(W, H, { wrapX, wrapY });

  // Each step: use script override if present, else use StartingPlots default
  (script.normalizeStartingPlotLocations ?? sp.normalizeStartingPlotLocations.bind(sp))(starts);
  (script.normalizeAddRiver ?? sp.normalizeAddRiver.bind(sp))(starts, plots, terrain, features, rivers, rng);
  (script.normalizeRemovePeaks ?? sp.normalizeRemovePeaks.bind(sp))(starts, plots);
  (script.normalizeAddLakes ?? sp.normalizeAddLakes.bind(sp))(starts, plots, terrain, rivers, lakes);
  (script.normalizeRemoveBadFeatures ?? sp.normalizeRemoveBadFeatures.bind(sp))(starts, features);
  (script.normalizeRemoveBadTerrain ?? sp.normalizeRemoveBadTerrain.bind(sp))(starts, plots, terrain);
  (script.normalizeAddFoodBonuses ?? sp.normalizeAddFoodBonuses.bind(sp))(starts, plots, terrain, features, bonuses, rng);
  (script.normalizeAddGoodTerrain ?? sp.normalizeAddGoodTerrain.bind(sp))(starts, plots, terrain);
  (script.normalizeAddExtras ?? sp.normalizeAddExtras.bind(sp))(starts, plots, terrain, features, bonuses, rivers, rng);
}
```

#### Default functions to add in `index.js`

These wrap the existing engine classes and serve as the "C++ default" equivalent (`CyPythonMgr().allowDefaultImpl()`):

| Default Function | Wraps |
|---|---|
| `defaultGeneratePlotTypes(W, H, settings, rng, wrapX, wrapY)` | `FractalWorld.generatePlotTypes()` with standard grain=2, center rift, polar, water_percent=75, shift |
| `defaultGenerateTerrain(W, H, plotTypes, settings, rng, wrapX, wrapY)` | `TerrainGenerator.generateTerrain()` |
| `defaultAddRivers(W, H, plotTypes, terrain, rng, wrapX, wrapY, callbacks)` | `RiverGenerator.addRivers()` — passes `callbacks.getRiverStartCardinalDirection` and `callbacks.getRiverAltitude` |
| `defaultAddLakes(W, H, plotTypes)` | `RiverGenerator.addLakes()` |
| `defaultAddFeatures(W, H, plotTypes, terrain, rivers, settings, rng, wrapX, wrapY)` | `FeatureGenerator.generateFeatures()` |
| `defaultAddBonuses(W, H, plotTypes, terrain, features, settings, rng, wrapX, wrapY, callbacks)` | `BonusGenerator.addBonuses()` — passes `callbacks.addBonusType` and `callbacks.canPlaceBonusAt` |
| `defaultAddGoodies(W, H, plotTypes, terrain, features, bonuses, starts, rng, wrapX, wrapY, callbacks)` | `GoodyGenerator.addGoodies()` — passes `callbacks.canPlaceGoodyAt` |
| `defaultAssignStartingPlots(W, H, ..., callbacks)` | `StartingPlots.assignStartingPlots()` — calls `callbacks.findStartingPlot` / `callbacks.findStartingArea` per player |

---

### 2.2 `src/game/mapgen/RiverGenerator.js` — Expose per-plot/per-river hooks

#### `getRiverStartCardinalDirection` callback support

Currently `getRiverStartCardinalDirection()` is an internal method (line 352). Modify the class to accept an optional callback:

```javascript
class RiverGenerator {
  constructor(W, H, options = {}) {
    // ... existing code ...
    this._scriptGetRiverStartCardinalDirection = options.getRiverStartCardinalDirection ?? null;
    this._scriptGetRiverAltitude = options.getRiverAltitude ?? null;
  }

  // In addRivers(), where getRiverStartCardinalDirection is called (line 197):
  // Replace:
  //   const direction = this.getRiverStartCardinalDirection(x, y, plotTypes, riverValues);
  // With:
  //   const direction = this._scriptGetRiverStartCardinalDirection
  //     ? this._scriptGetRiverStartCardinalDirection(x, y, plotTypes)
  //     : this.getRiverStartCardinalDirection(x, y, plotTypes, riverValues);
}
```

#### `getRiverAltitude` callback support

Currently `getRiverValueAtPlot()` (the JS equivalent of `getRiverAltitude()`) is only internal. Add callback support:

```javascript
  // Wherever getRiverValueAtPlot() is called during river tracing:
  // Replace:
  //   const alt = this.getRiverValueAtPlot(x, y);
  // With:
  //   const alt = this._scriptGetRiverAltitude
  //     ? this._scriptGetRiverAltitude(x, y, plotTypes)
  //     : this.getRiverValueAtPlot(x, y);
```

---

### 2.3 `src/game/mapgen/BonusGenerator.js` — Expose per-bonus/per-plot hooks

#### `addBonusType` callback support

Currently `_addBonusType()` is private (line 565). Add callback support:

```javascript
class BonusGenerator {
  constructor(W, H, options = {}) {
    // ... existing code ...
    this._scriptAddBonusType = options.addBonusType ?? null;
    this._scriptCanPlaceBonusAt = options.canPlaceBonusAt ?? null;
  }

  addBonuses(rng, plotTypes, terrain, features) {
    // ... existing iteration over BONUS_DEFS ...
    // For each bonusDef:
    if (this._scriptAddBonusType) {
      this._scriptAddBonusType(bonusDef, rng, plotTypes, terrain, features, result, areas);
    } else {
      this._addBonusType(bonusDef, rng, plotTypes, terrain, features, result, areas);
    }
  }
}
```

#### `canPlaceBonusAt` callback support

Currently `_canPlaceBonusAt()` is private (line 667). Thread the callback through:

```javascript
  // Inside _addBonusType(), where _canPlaceBonusAt is called:
  // Replace:
  //   if (this._canPlaceBonusAt(x, y, bonusDef, ...))
  // With:
  //   const canPlace = this._scriptCanPlaceBonusAt
  //     ? this._scriptCanPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses)
  //     : this._canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses, checkSpacing);
```

---

### 2.4 `src/game/mapgen/GoodyGenerator.js` — Expose per-plot hook

#### `canPlaceGoodyAt` callback support

Currently `canPlaceGoodyAt()` is a public method (line 139) but only called internally. Thread a callback:

```javascript
class GoodyGenerator {
  constructor(W, H, options = {}) {
    // ... existing code ...
    this._scriptCanPlaceGoodyAt = options.canPlaceGoodyAt ?? null;
  }

  addGoodies(rng, plotTypes, terrain, features, bonuses, starts) {
    // In the candidate-building loop, replace:
    //   if (this.canPlaceGoodyAt(x, y, plotTypes[idx], terrain[idx], features[idx], bonuses[idx]))
    // With:
    //   const canPlace = this._scriptCanPlaceGoodyAt
    //     ? this._scriptCanPlaceGoodyAt(x, y, plotTypes[idx], terrain[idx], features[idx], bonuses[idx])
    //     : this.canPlaceGoodyAt(x, y, plotTypes[idx], terrain[idx], features[idx], bonuses[idx]);
  }
}
```

---

### 2.5 `src/game/mapgen/StartingPlots.js` — Expose per-player hooks

#### `findStartingPlot` callback support

Currently `assignStartingPlots()` assigns all players in a batch. Add a per-player callback:

```javascript
class StartingPlots {
  constructor(W, H, settings = {}) {
    // ... existing code ...
    this._scriptFindStartingPlot = settings.findStartingPlot ?? null;
    this._scriptFindStartingArea = settings.findStartingArea ?? null;
  }

  assignStartingPlots(numPlayers, rng, plotTypes, terrain, features, bonuses, rivers, lakes) {
    const starts = [];

    for (let playerID = 0; playerID < numPlayers; playerID++) {
      if (this._scriptFindStartingPlot) {
        // Per-player override: script returns a plot index or {x, y}
        const plot = this._scriptFindStartingPlot(playerID, plotTypes, terrain, features, bonuses, rivers, lakes);
        starts.push(plot);
      } else {
        // Default: determine best area first, then best plot within area
        let areaID = -1;
        if (this._scriptFindStartingArea) {
          areaID = this._scriptFindStartingArea(playerID, plotTypes, terrain);
        }
        // ... existing scoring + placement logic, constrained to areaID if != -1 ...
      }
    }

    return starts;
  }
}
```

**Note**: The existing batch-assignment algorithm (multi-pass distance relaxation) should remain as the default when neither `findStartingPlot` nor `findStartingArea` is provided. The per-player hooks are only invoked when a script provides them.

---

### 2.6 Script Object Contract — Updated

After the refactor, each script in `src/game/mapgen/scripts/*.js` exports an object conforming to this interface. Every property is **optional** except `id` and `name`:

```javascript
export default {
  // === Required ===
  id: 'continents',
  name: 'Continents',

  // === Game Properties (§1 of Python interface) ===
  description: '',                          // default: ''
  isAdvancedMap: false,                     // default: false (Python returns 1)
  // getModPath() — omitted, not relevant for web

  // === User Defined Map Options (§2) ===
  isClimateMap()  { return true; },         // default: true
  isSeaLevelMap() { return true; },         // default: true
  customOptions: [],                        // replaces getNumCustomMapOptions et al.

  // === Map Size and Wrapping (§3) ===
  getWrapX()  { return true; },             // default: true
  getWrapY()  { return false; },            // default: false
  getTopLatitude()    { return 90; },       // default: 90
  getBottomLatitude() { return -90; },      // default: -90
  isBonusIgnoreLatitude() { return false; },// default: false
  getGridSize(mapSize) { return null; },    // default: null (use gameOptions dimensions)

  // === Lifecycle Hooks (§4) ===
  beforeInit(settings, rng) {},
  beforeGeneration(settings, rng) {},
  afterGeneration(mapState, rng) {},

  // === Map Generation (§5) — override at most ONE of these two groups ===
  // Group A: full control (overrides Group B)
  generateRandomMap(W, H, settings, rng) { return { plotTypes, terrain }; },

  // Group B: individual steps (skipped if generateRandomMap is present)
  generatePlotTypes(W, H, settings, rng) { return plotTypes1D; },
  generateTerrain(W, H, plotTypes, settings, rng) { return terrain1D; },

  // === Game Element Placement (§6) ===
  addRivers(W, H, plotTypes, terrain, rng, callbacks) { return rivers1D; },
  getRiverStartCardinalDirection(x, y, plotTypes) { return cardinalDirection; },
  getRiverAltitude(x, y, plotTypes) { return altitudeValue; },
  addLakes(W, H, plotTypes, rng) { return lakes1D; },
  addFeatures(W, H, plotTypes, terrain, rivers, settings, rng) { return features1D; },
  addBonuses(W, H, plotTypes, terrain, features, settings, rng, callbacks) { return bonuses1D; },
  addBonusType(bonusDef, rng, plotTypes, terrain, features, bonuses, areas) {},
  canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses) { return bool; },
  addGoodies(W, H, plotTypes, terrain, features, bonuses, starts, rng, callbacks) { return goodies1D; },
  canPlaceGoodyAt(x, y, plotType, terrain, feature, bonus) { return bool; },

  // === Starting Plots (§7) ===
  minStartingDistanceModifier() { return 0; },
  assignStartingPlots(W, H, plotTypes, terrain, features, bonuses, rivers, lakes, settings, rng) { return starts; },
  findStartingPlot(playerID, plotTypes, terrain, features, bonuses, rivers, lakes) { return { x, y }; },
  findStartingArea(playerID, plotTypes, terrain) { return areaID; },

  // === Normalization (§8) ===
  normalizeStartingPlotLocations(starts) {},
  normalizeAddRiver(starts, plotTypes, terrain, features, rivers, rng) {},
  normalizeRemovePeaks(starts, plotTypes) {},
  normalizeAddLakes(starts, plotTypes, terrain, rivers, lakes) {},
  normalizeRemoveBadFeatures(starts, features) {},
  normalizeRemoveBadTerrain(starts, plotTypes, terrain) {},
  normalizeAddFoodBonuses(starts, plotTypes, terrain, features, bonuses, rng) {},
  normalizeAddGoodTerrain(starts, plotTypes, terrain) {},
  normalizeAddExtras(starts, plotTypes, terrain, features, bonuses, rivers, rng) {},

  // === Final (§9) ===
  startHumansOnSameTile() { return false; }
};
```

---

### 2.7 Migrating Existing Scripts

Each of the 10 existing scripts currently has a monolithic `generate()` function. After the refactor:

1. **Remove** `generate()` from each script.
2. **Move** each pipeline step into the corresponding hook. Only override hooks that differ from the default.

#### Example: `continents.js` (after migration)

```javascript
export default {
  id: 'continents',
  name: 'Continents',
  description: 'Two to four large continents separated by ocean.',
  isAdvancedMap: false,
  customOptions: [],

  // Only override what differs from defaults:
  generatePlotTypes(W, H, settings, rng) {
    const climateConfig = resolveClimateSettings(settings.climate);
    const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);

    const fw = new FractalWorld(W, H, {
      seaLevelChange,
      hillGroupOneRange: climateConfig.hillRange,
      hillGroupTwoRange: climateConfig.hillRange,
      peakPercent: climateConfig.peakPercent,
      wrapX: true, wrapY: false
    });

    fw.initFractal(rng, {
      continent_grain: 2,
      rift_grain: 2,
      has_center_rift: true,
      invert_heights: false,
      polar: true
    });

    return fw.generatePlotTypes(rng, {
      water_percent: 75,
      grain_amount: 3,
      shift_plot_types: true
    });
  }

  // Everything else (terrain, rivers, lakes, features, bonuses, goodies,
  // starting plots, normalization) uses defaults — no overrides needed.
};
```

#### Example: `inlandSea.js` (after migration — overrides rivers)

```javascript
export default {
  id: 'inland_sea',
  name: 'Inland Sea',
  // ...

  getWrapX() { return false; },  // no X-wrap

  generatePlotTypes(W, H, settings, rng) {
    // ... HintedWorld ring generation ...
  },

  // Override ONLY the river step:
  addRivers(W, H, plotTypes, terrain, rng) {
    return addInlandSeaRivers(W, H, plotTypes, terrain, rng);
  }

  // All other hooks use defaults.
};
```

#### Migration table for all 10 scripts

| Script | Hooks to Override (beyond generatePlotTypes) |
|---|---|
| **Continents** | `generatePlotTypes` only |
| **Fractal** | `generatePlotTypes` only |
| **Archipelago** | `generatePlotTypes`, `assignStartingPlots` (custom regional logic) |
| **Pangaea** | `generatePlotTypes`, `getGridSize` (some subtypes) |
| **Terra** | `generatePlotTypes`, `assignStartingPlots` (Old/New World separation) |
| **Inland Sea** | `generatePlotTypes`, `getWrapX` (false), `addRivers` (custom center-flowing) |
| **Lakes** | `generatePlotTypes` only |
| **Oasis** | `generatePlotTypes`, `generateTerrain` (4-band custom), `addRivers` (Nile-style) |
| **Ice Age** | `generatePlotTypes`, `generateTerrain` (aggressive ice), `getGridSize` (wide/short) |
| **Mirror** | `generateRandomMap` (full control — half-map + mirror pipeline) |

---

## 3. `generateRandomMap` — Full-Control Override

The Python `generateRandomMap()` lets a script take full control, bypassing `generatePlotTypes()` and `generateTerrain()`. In JS:

- If `script.generateRandomMap` is defined, call it. It must return `{ plotTypes: number[], terrain: string[] }` (both 1D arrays).
- If not defined, call `generatePlotTypes()` then `generateTerrain()` in sequence (default or script-overridden).

**Use case**: Mirror script (generates half a map, then mirrors it — needs both plot types and terrain in a single coordinated pass).

---

## 4. `findStartingPlot` and `findStartingArea` — Per-Player Hooks

### Python behavior

- `assignStartingPlots()`: Called once. If overridden, the script handles everything and `findStartingPlot`/`findStartingArea` are NOT called automatically.
- `findStartingPlot(playerID)`: Called once per player. If overridden, `findStartingArea` is NOT called automatically.
- `findStartingArea(playerID)`: Called once per player. Returns an area ID to constrain the player's start, or -1 for "any area."

### JS implementation

Same hierarchy:

```
if script.assignStartingPlots → call it, done
  else for each player:
    if script.findStartingPlot → call it for this player
      else:
        area = script.findStartingArea(playerID) if present, else -1
        use default scoring within area
```

---

## 5. `startHumansOnSameTile` — Wire Up

Currently declared on all scripts but never read. After the refactor:

1. `generateMap()` reads the value: `const humansOnSameTile = call(script, 'startHumansOnSameTile') ?? false;`
2. Include it in the output object: `mapData.startHumansOnSameTile = humansOnSameTile;`
3. When the game starts (future: `Game.jsx` or game loop initialization), if `true`, place all human units on the same tile instead of spreading them.

---

## 6. Custom Map Options — No Change Needed

The Python functions `getNumCustomMapOptions`, `getCustomMapOptionName`, `getNumCustomMapOptionValues`, `getCustomMapOptionDescAt`, `getCustomMapOptionDefault`, and `isRandomCustomMapOption` are an index-based API because Python lacked a convenient declarative pattern.

The JS `customOptions[]` array already provides equivalent functionality in a cleaner way. Each element maps exactly:

| Python Function | JS Equivalent |
|---|---|
| `getNumCustomMapOptions()` | `script.customOptions.length` |
| `getCustomMapOptionName(optionID)` | `script.customOptions[optionID].name` |
| `getNumCustomMapOptionValues(optionID)` | `script.customOptions[optionID].values.length` |
| `getCustomMapOptionDescAt(optionID, valueID)` | `script.customOptions[optionID].values[valueID].label` |
| `getCustomMapOptionDefault(optionID)` | `script.customOptions[optionID].default` |
| `isRandomCustomMapOption(optionID)` | `script.customOptions[optionID].allowRandom` |

**No changes needed**. The array pattern is a strict superset of the Python index API.

---

## 7. `getModPath` — Intentionally Omitted

Not relevant for a web application. No action needed.

---

## 8. Backward Compatibility

### 8.1 Old `generate()` function support

During migration, support both old and new script formats:

```javascript
// In generateMap():
if (script.generate && !script.generatePlotTypes && !script.generateRandomMap) {
  // Legacy script: use monolithic generate()
  const scriptResult = script.generate(settings, rng);
  // ... rest of existing pipeline ...
} else {
  // New hook-based pipeline
  // ... new orchestration code ...
}
```

This allows scripts to be migrated one at a time.

### 8.2 Output format

The output object from `buildFinalMapData()` does not change. All existing consumers (`Game.jsx`, `TerrainBuilder.js`, `FeatureRenderer.js`) continue working without modification.

---

## 9. Implementation Order

1. **Add default wrapper functions** in `index.js` for each pipeline step (wrapping existing engine classes).
2. **Add callback support** to `RiverGenerator`, `BonusGenerator`, `GoodyGenerator`, `StartingPlots` (§2.2–2.5).
3. **Rewrite `generateMap()`** in `index.js` to use the hook-based orchestration (§2.1).
4. **Add backward compatibility** check for old `generate()` format (§8.1).
5. **Migrate scripts** one at a time, starting with the simplest (Continents, Fractal) and ending with the most complex (Mirror, Terra).
6. **Wire up `startHumansOnSameTile`** in the output object (§5).
7. **Remove** old `generate()` functions from all scripts once migration is complete.
8. **Test** each script produces identical output before and after migration (use seeded RNG with fixed seeds to compare).

---

## 10. Testing Strategy

For each of the 10 scripts:

1. Generate a map with a fixed seed using the **old** code path (monolithic `generate()`).
2. Generate a map with the same seed using the **new** hook-based pipeline.
3. Compare all output arrays: `plots`, `terrain`, `features`, `resources`, `rivers`, `lakes`, `goodies`, `startingLocations`.
4. All arrays must be **identical** — the refactor must be behavior-preserving.

This can be automated with a simple test harness that runs both code paths and asserts deep equality.
