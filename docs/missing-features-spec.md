# Spec: Missing CvMapScriptInterface Features

This document specifies the implementation plan for features present in Civ4's
`CvMapScriptInterface.py` that are missing or incomplete in the JS mapgen system.

---

## Table of Contents

1. [Lifecycle Hooks](#1-lifecycle-hooks)
2. [Goody Hut Placement](#2-goody-hut-placement)
3. [BonusBalancer & normalizeAddExtras](#3-bonusbalancer--normalizeaddextras)
4. [isBonusIgnoreLatitude](#4-isbonusignorelatitude)
5. [Custom Map Options System](#5-custom-map-options-system)
6. [startHumansOnSameTile](#6-starthumansonsametile)
7. [generateRandomMap Override](#7-generaterandommap-override)
8. [Map Metadata](#8-map-metadata)
9. [Wire Up Dead-Code Script Properties](#9-wire-up-dead-code-script-properties)

---

## 1. Lifecycle Hooks

**Civ4 reference:** `beforeInit()`, `beforeGeneration()`, `afterGeneration()`

**What they do in Civ4:**
- `beforeInit()` — Called before grid size is determined. Scripts use it to set up
  global variables that span multiple functions.
- `beforeGeneration()` — Called after grid size / wrap / latitude are set but before
  `generatePlotTypes()`. Scripts use it to initialize data structures that depend on
  map dimensions.
- `afterGeneration()` — Called after all 7 data layers (plots, terrain, rivers, lakes,
  features, bonuses, goodies) are complete but before starting plot assignment. Last
  chance to post-process the map.

**Current state:** Not implemented anywhere. Each script's `generate()` is monolithic.

### Implementation

**Files to modify:**
- `src/game/mapgen/index.js` — Call hooks around `script.generate()`
- All 10 scripts in `src/game/mapgen/scripts/*.js` — Add optional hook methods

**Design:**

Add three optional methods to the script interface:

```javascript
// In each script object (e.g., scripts/continents.js):
export default {
  id: 'continents',
  name: 'Continents',

  // NEW — optional lifecycle hooks
  beforeInit(settings, rng) {
    // Called before grid size resolution.
    // Can mutate settings or set up script-level state on `this`.
  },

  beforeGeneration(settings, rng, dimensions) {
    // Called after dimensions are known, before plot generation.
    // `dimensions` = { width, height }
  },

  afterGeneration(scriptResult, settings, rng) {
    // Called after generate() returns, before heightmap generation.
    // Can mutate scriptResult arrays in-place for post-processing.
  },

  generate(settings, rng) { /* ... existing ... */ }
};
```

**Changes to `index.js` `generateMap()`:**

```javascript
export function generateMap(settings) {
  // ... existing settings destructuring ...

  const rng = new SeededRandom(seed);
  const script = getMapScript(mapType);

  // NEW: beforeInit hook
  if (script.beforeInit) {
    script.beforeInit(settings, rng);
  }

  // ... existing: resolve dimensions (scripts that override getGridSize) ...

  // NEW: beforeGeneration hook
  if (script.beforeGeneration) {
    const dims = script.getGridSize?.()
      ?? getDefaultDimensions(settings.mapSize);
    script.beforeGeneration(settings, rng, dims);
  }

  const scriptResult = script.generate(settings, rng);

  // NEW: afterGeneration hook
  if (script.afterGeneration) {
    script.afterGeneration(scriptResult, settings, rng);
  }

  const heightmap = generateHeightmap(scriptResult.width, scriptResult.height, rng);

  return buildFinalMapData(scriptResult, heightmap, /* ... */);
}
```

**Which scripts need hooks now:** None of the current 10 scripts require lifecycle
hooks today. This is purely infrastructure for future scripts and mod-like
extensibility. Leave the hooks undefined in existing scripts (the `if (script.hook)`
guard handles that).

---

## 2. Goody Hut Placement

**Civ4 reference:** `addGoodies()`, `canPlaceGoodyAt()`

**What they do in Civ4:**
- `addGoodies()` is the 7th and final data layer, called after `addBonuses()`.
- Places "tribal village" improvements (goody huts) on eligible land tiles.
- `canPlaceGoodyAt()` is called per-tile to check eligibility.
- In Civ4, goodies are *improvements* (not features or bonuses).
- Default C++ implementation: places huts on random flat land tiles with minimum
  spacing, avoiding peaks, water, starting plots, and tiles with existing
  improvements.

**Current state:** Completely missing. No improvement system exists.

### Implementation

**New file:** `src/game/mapgen/GoodyGenerator.js`

**Data model:** Goody huts are stored as a 1D boolean array (`goodies[]`), parallel
to the existing `plotTypes`, `terrain`, `features`, `bonuses` arrays. Each element is
`true` (has goody hut) or `false` (no goody hut).

**Placement rules (from Civ4 C++ defaults):**

1. Only place on land tiles (`PLOT.LAND` or `PLOT.HILLS`, never `PEAK`, `OCEAN`, `COAST`)
2. Never place on a tile with an existing bonus resource
3. Never place on ice (`FEATURE.ICE`) or flood plains (`FEATURE.FLOOD_PLAINS`)
4. Minimum spacing of 4 tiles between goody huts (Manhattan distance)
5. Never place within 3 tiles of a starting location
6. Total number of huts: `numLandTiles / huts_per_area` where `huts_per_area` is
   approximately 20-30 (scales with map size)
7. Placement order: iterate all eligible tiles, shuffle, place greedily respecting
   spacing

**Class definition:**

```javascript
// src/game/mapgen/GoodyGenerator.js

export class GoodyGenerator {
  /**
   * @param {number} width - Map width
   * @param {number} height - Map height
   * @param {Object} [options={}]
   * @param {boolean} [options.wrapX=true]
   * @param {boolean} [options.wrapY=false]
   * @param {number} [options.minSpacing=4] - Min Manhattan distance between huts
   * @param {number} [options.startExclusion=3] - Min distance from starting plots
   * @param {number} [options.tilesPerHut=25] - Avg land tiles per hut placed
   */
  constructor(width, height, options = {}) { /* ... */ }

  /**
   * Place goody huts on the map.
   *
   * Called after addBonuses() and assignStartingPlots().
   *
   * @param {SeededRandom} rng
   * @param {number[]} plotTypes - 1D array of PLOT values
   * @param {string[]} terrain - 1D array of TERRAIN values
   * @param {(string|null)[]} features - 1D array of FEATURE values
   * @param {(string|null)[]} bonuses - 1D array of bonus IDs
   * @param {Array<{x,y}>} startingLocations
   * @returns {boolean[]} - 1D array, true = goody hut present
   */
  addGoodies(rng, plotTypes, terrain, features, bonuses, startingLocations) { /* ... */ }

  /**
   * Per-tile eligibility check (overridable by scripts).
   *
   * @param {number} x
   * @param {number} y
   * @param {number} plotType
   * @param {string} terrain
   * @param {string|null} feature
   * @param {string|null} bonus
   * @returns {boolean}
   */
  canPlaceGoodyAt(x, y, plotType, terrain, feature, bonus) { /* ... */ }
}
```

**Algorithm for `addGoodies()`:**

```
1. Count eligible land tiles (canPlaceGoodyAt === true)
2. Compute target count: Math.floor(eligibleCount / tilesPerHut)
3. Build candidate list of all eligible tiles
4. Shuffle candidates using rng
5. For each candidate (greedy):
   a. Check min spacing against all already-placed huts
   b. Check start exclusion against all starting locations
   c. If valid, mark goodies[idx] = true, increment placed count
   d. Stop when placed === target
```

**Integration into scripts:**

The goody generation step goes **after** starting plot assignment and normalization
(because it needs starting locations for exclusion zones). Update each script's
`generate()` function:

```javascript
// In each script's generate(), AFTER normalize:

// 11. Add goody huts (tribal villages)
const gg = new GoodyGenerator(W, H, { wrapX: true, wrapY: false });
const goodies1D = gg.addGoodies(rng, plotTypes1D, terrain1D, features1D,
                                 bonuses1D, starts);
```

**Pipeline integration:**

Add `goodies` to the output chain:

- `_helpers.js` `buildMapResult()` — Accept `goodies1D` parameter, convert to 2D,
  include in output.
- `index.js` `buildFinalMapData()` — Pass through `goodies` from scriptResult.
- `getTile()` — Add `hasGoodyHut: goodies[y][wx]` to the returned tile object.

**Map data structure addition:**

```javascript
{
  // ... existing fields ...
  goodies: boolean[][],      // NEW: goody hut placement

  getTile(x, y) {
    return {
      // ... existing fields ...
      hasGoodyHut: goodies[y][wx]   // NEW
    };
  }
}
```

**Rendering note:** Goody hut rendering in Babylon.js is out of scope for this spec
but the data will be available via `getTile().hasGoodyHut` for a future
`GoodyRenderer.js` module.

---

## 3. BonusBalancer & normalizeAddExtras

**Civ4 reference:** `BonusBalancer` class in `CvMapGeneratorUtil.py` (Warlords+),
`normalizeAddExtras()` override.

**What it does in Civ4:**
The `BonusBalancer` ensures every player has strategic resources within reach of
their starting location. It runs as the final normalization step.

**Algorithm (from Civ4 Warlords `CvMapGeneratorUtil.py:1294-1365`):**

```
resourcesToBalance = [aluminum, coal, copper, horse, iron, oil, uranium]

For each alive player:
  1. Get starting plot (startX, startY)
  2. Build list of all plots within dx ∈ [-5, 5], dy ∈ [-5, 5] (11×11 area)
  3. For pass_num in [0, 1, 2, 3]:
     - pass 0: Strict (respect uniqueRange, oneArea, adjacency)
     - pass 1: Ignore uniqueRange
     - pass 2: Ignore uniqueRange + oneArea
     - pass 3: Ignore all constraints
     For each resource in resourcesToBalance:
       If not already placed for this player:
         For each plot in the 11×11 area:
           If plot.canHaveBonus(resource) AND isBonusValid(resource, plot, ...):
             Place resource on plot
             Mark resource as placed for this player
             Break to next resource
```

**Current state:** `StartingPlots.normalizeAddExtras()` at line 681 is an empty
no-op with a comment saying "Balanced.py overrides this."

### Implementation

**File to modify:** `src/game/mapgen/StartingPlots.js`

**Replace the stub at line 681 with a full implementation:**

```javascript
/**
 * Ensure strategic resources exist within 5 tiles of each starting location.
 *
 * Port of Civ4 Warlords BonusBalancer.normalizeAddExtras().
 * Uses 4 relaxation passes with progressively looser constraints.
 *
 * Resources balanced: aluminum, coal, copper, horse, iron, oil, uranium
 */
normalizeAddExtras(starts, plotTypes, terrain, features, bonuses, rivers, rng) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const RADIUS = 5;

  const resourcesToBalance = [
    'aluminum', 'coal', 'copper', 'horse', 'iron', 'oil', 'uranium'
  ];

  for (const start of starts) {
    // 1. Build candidate tiles within 11×11 area
    const candidates = [];
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        let nx = start.x + dx;
        let ny = start.y + dy;
        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;
        candidates.push({ x: nx, y: ny, idx: ny * W + nx });
      }
    }

    // 2. Track which resources we've placed for this start
    const placed = new Set();

    // 3. Four relaxation passes
    for (let pass = 0; pass < 4; pass++) {
      const ignoreUniqueRange = pass >= 1;
      const ignoreOneArea     = pass >= 2;
      const ignoreAdjacent    = pass >= 3;

      for (const resId of resourcesToBalance) {
        if (placed.has(resId)) continue;

        // Check if resource already exists near this start
        if (this._resourceExistsNearStart(resId, candidates, bonuses)) {
          placed.add(resId);
          continue;
        }

        // Find bonus definition
        const bonusDef = BONUS_DEFS.find(b => b.id === resId);
        if (!bonusDef) continue;

        // Try to place on each candidate tile
        for (const c of candidates) {
          if (bonuses[c.idx]) continue; // already has a resource

          if (!this._canPlaceBonusAt(c.x, c.y, bonusDef, plotTypes, terrain,
                                      features, bonuses, W, H,
                                      ignoreUniqueRange, ignoreAdjacent)) {
            continue;
          }

          bonuses[c.idx] = resId;
          placed.add(resId);
          break; // next resource
        }
      }
    }
  }
}
```

**Helper methods to add to `StartingPlots`:**

```javascript
/**
 * Check if a resource already exists in the candidate tile list.
 */
_resourceExistsNearStart(resId, candidates, bonuses) {
  return candidates.some(c => bonuses[c.idx] === resId);
}

/**
 * Check if a bonus can be placed at (x, y) with given constraint relaxation.
 *
 * Port of BonusBalancer.isBonusValid() + canHaveBonus().
 */
_canPlaceBonusAt(x, y, bonusDef, plotTypes, terrain, features, bonuses,
                  W, H, ignoreUniqueRange, ignoreAdjacent) {
  const idx = y * W + x;
  const plot = plotTypes[idx];
  const terr = terrain[idx];
  const feat = features[idx];

  // 1. Plot type check
  if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) return false;
  if (bonusDef.requiresHills && plot !== PLOT.HILLS) return false;
  if (bonusDef.requiresFlatlands && plot !== PLOT.LAND) return false;

  // 2. Terrain check (if defined)
  if (bonusDef.terrain && bonusDef.terrain.length > 0) {
    if (!bonusDef.terrain.includes(terr)) return false;
  }

  // 3. Feature check (if defined)
  if (bonusDef.features !== null && bonusDef.features !== undefined) {
    if (bonusDef.features.length === 0 && feat) return false;
    if (bonusDef.features.length > 0 && !bonusDef.features.includes(feat)) return false;
  }

  // 4. Adjacency check (no different bonus adjacent)
  if (!ignoreAdjacent) {
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nx = x + dx;
      let ny = y + dy;
      if (this.wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;
      const nIdx = ny * W + nx;
      if (bonuses[nIdx] && bonuses[nIdx] !== bonusDef.id) return false;
    }
  }

  // 5. Unique range check (no same bonus within range)
  if (!ignoreUniqueRange && bonusDef.iUniqueRange) {
    const range = bonusDef.iUniqueRange;
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        if (this.wrapX) nx = ((nx % W) + W) % W;
        else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;
        if (bonuses[ny * W + nx] === bonusDef.id) return false;
      }
    }
  }

  return true;
}
```

**No new file needed.** All logic goes into `StartingPlots.js` since that's where
the normalize pipeline lives and where `BONUS_DEFS` is already imported.

---

## 4. isBonusIgnoreLatitude

**Civ4 reference:** `isBonusIgnoreLatitude()` — per-script flag.

**What it does in Civ4:**
Returns a boolean. When `true`, bonus resource placement ignores latitude
restrictions (e.g., bananas can appear in tundra, sugar in arctic). Default is
`false`. Most scripts don't override it.

**Current state:** Not implemented. `BonusGenerator` doesn't use latitude at all
for placement — it uses terrain/feature/plot type restrictions only.

### Implementation

**Files to modify:**
- All 10 scripts in `src/game/mapgen/scripts/*.js` — Add `isBonusIgnoreLatitude()` method
- `src/game/mapgen/BonusGenerator.js` — Accept and use the flag

**Script interface addition:**

```javascript
// In each script:
isBonusIgnoreLatitude() { return false; },
```

**BonusGenerator changes:**

Currently `BonusGenerator` does not do latitude-based filtering for resource
placement. If latitude filtering is added in the future (e.g., restricting bananas to
tropical latitudes), the `isBonusIgnoreLatitude` flag should bypass it.

For now, add the flag as a constructor option and store it:

```javascript
// In BonusGenerator constructor:
constructor(width, height, options = {}) {
  // ... existing ...
  this.ignoreLatitude = options.ignoreLatitude ?? false;
}
```

And pass it from each script's `generate()`:

```javascript
const bg = new BonusGenerator(W, H, {
  numPlayers,
  wrapX: true,
  wrapY: false,
  ignoreLatitude: false   // or this.isBonusIgnoreLatitude()
});
```

**Note:** This is a forward-compatible hook. It has no functional effect until
latitude-based bonus restrictions are implemented in `BonusGenerator._canPlaceAt()`.
The Civ4 XML data for each bonus includes `iMinLatitude` and `iMaxLatitude` fields
that we don't currently model. The full implementation would:

1. Add `minLatitude` and `maxLatitude` fields to each entry in `BONUS_DEFS`
2. In `_canPlaceAt()`, compute tile latitude as:
   `lat = bottomLat + (y / H) * (topLat - bottomLat)`
3. Reject if `lat < minLatitude || lat > maxLatitude`
4. Skip step 3 if `this.ignoreLatitude === true`

---

## 5. Custom Map Options System

**Civ4 reference:** `getNumCustomMapOptions()`, `getCustomMapOptionName()`,
`getNumCustomMapOptionValues()`, `getCustomMapOptionDescAt()`,
`getCustomMapOptionDefault()`, `isRandomCustomMapOption()`

**What it does in Civ4:**
Scripts can define an arbitrary number of dropdown options (e.g., Highlands has
"Mountain Pattern", "Mountain Density", "Resources"). Each option has a name,
multiple named values, a default, and an optional "Random" toggle.

**Current state:** Partial. Scripts define a single `customOption` object:

```javascript
customOption: {
  name: 'Landmass Type',
  values: ['Snaky Continents', 'Archipelago', 'Tiny Islands'],
  default: 1
}
```

This supports one option per script. 4 of 10 scripts use it (archipelago, pangaea,
iceAge, mirror).

### Implementation

**Files to modify:**
- All 10 scripts in `src/game/mapgen/scripts/*.js` — Upgrade to `customOptions` array
- `src/game/mapgen/index.js` — Pass array of selections instead of single value
- `src/pages/NewGame.jsx` — Render dynamic option dropdowns

**New script interface:**

Replace the single `customOption` field with `customOptions` (plural), an array of
option definitions:

```javascript
// In each script:
customOptions: [
  {
    id: 'landmass_type',
    name: 'Landmass Type',
    values: [
      { id: 'snaky',  label: 'Snaky Continents' },
      { id: 'archipelago', label: 'Archipelago' },
      { id: 'tiny',   label: 'Tiny Islands' }
    ],
    default: 0,       // index into values array
    allowRandom: true  // show "Random" option in dropdown
  },
  {
    id: 'mountain_density',
    name: 'Mountain Density',
    values: [
      { id: 'sparse', label: 'Sparse' },
      { id: 'normal', label: 'Normal' },
      { id: 'dense',  label: 'Dense' }
    ],
    default: 1,
    allowRandom: false
  }
],
```

Scripts with no custom options set `customOptions: []`.

**Settings change:**

In `index.js`, replace `customOption` (single value) with `customOptions` (object
mapping option IDs to selected value IDs):

```javascript
// Settings passed to script.generate():
{
  mapType: 'pangaea',
  mapSize: 'standard',
  climate: 'temperate',
  seaLevel: 'medium',
  numPlayers: 7,
  seed: 12345,
  customOptions: {                    // NEW: replaces `customOption`
    landmass_type: 'snaky',
    mountain_density: 'normal'
  }
}
```

**Random resolution:**

In `index.js`, before calling `script.generate()`, resolve any `'random'` selections:

```javascript
// Resolve random custom options
const resolvedOptions = {};
if (script.customOptions) {
  for (const opt of script.customOptions) {
    const selected = settings.customOptions?.[opt.id];
    if (selected === 'random' && opt.allowRandom) {
      const idx = rng.randInt(0, opt.values.length - 1);
      resolvedOptions[opt.id] = opt.values[idx].id;
    } else {
      resolvedOptions[opt.id] = selected ?? opt.values[opt.default].id;
    }
  }
}
settings.customOptions = resolvedOptions;
```

**Backward compatibility:**

During the transition, keep reading the old `customOption` field if `customOptions`
is not defined:

```javascript
// In index.js:
if (!script.customOptions && script.customOption !== null && script.customOption !== undefined) {
  // Legacy single-option support
  script.customOptions = [script.customOption];
}
```

**Migration for existing scripts:**

| Script | Current `customOption` | New `customOptions` |
|--------|----------------------|---------------------|
| archipelago.js | `{ name: '...', values: [...], default: 1 }` | Convert to array format |
| pangaea.js | Same | Convert |
| iceAge.js | Same | Convert |
| mirror.js | Same | Convert |
| All others | `null` | `[]` |

**UI integration (NewGame.jsx):**

When the user selects a map type, read `script.customOptions` from the script
registry and render a dropdown for each option below the existing map settings.
This is out of scope for the mapgen spec but the data contract is defined here.

---

## 6. startHumansOnSameTile

**Civ4 reference:** `startHumansOnSameTile()`

**What it does in Civ4:**
Returns a boolean. When `true`, all human players' starting settler and initial
units appear on the same tile (instead of being spread around the starting plot).
Default is `false`. Almost no scripts override it.

**Current state:** Not implemented. The project is single-player only.

### Implementation

Since this project is **single-player only** (per CLAUDE.md constraints), this
feature has no functional effect — there's only ever one human player.

**Minimal implementation:** Add the method to the script interface as a stub for
completeness:

```javascript
// In each script:
startHumansOnSameTile() { return false; },
```

**No engine changes needed.** When multiplayer or team starts are eventually
implemented, `StartingPlots.assignStartingPlots()` would read this flag and group
units accordingly.

---

## 7. generateRandomMap Override

**Civ4 reference:** `generateRandomMap()`

**What it does in Civ4:**
If a script overrides this function, the C++ engine will NOT automatically call
`generatePlotTypes()` or `generateTerrain()`. The script takes full manual control
over the generation sequence.

**Current state:** Not implemented. All scripts must use the standard pipeline.

### Implementation

The current JS architecture already achieves this implicitly — each script's
`generate()` method IS the full pipeline. A script can already choose to skip
`FractalWorld` entirely and generate plots manually (e.g., `oasis.js` does its own
plot generation without `FractalWorld`).

**No changes needed.** The monolithic `generate()` function per script already
provides the same capability as `generateRandomMap()`. Document this equivalence:

```javascript
// In each script:
//
// NOTE: Civ4's generateRandomMap() override is unnecessary in this architecture.
// Each script's generate() method has full control over the pipeline and can
// skip or reorder any step. This is equivalent to always having
// generateRandomMap() overridden.
```

---

## 8. Map Metadata

**Civ4 reference:** `getDescription()`, `isAdvancedMap()`, `getModPath()`

**What they do in Civ4:**
- `getDescription()` — Displayed in the main menu when a map script is selected.
- `isAdvancedMap()` — If `true`, script only appears in the advanced game setup menu.
- `getModPath()` — Returns the mod directory this script belongs to.

**Current state:** Scripts only export `id` and `name`.

### Implementation

**Add metadata fields to each script:**

```javascript
export default {
  id: 'continents',
  name: 'Continents',
  description: 'Random map with two to four large continents and small islands.',  // NEW
  isAdvancedMap: false,  // NEW — all current scripts are basic
  // ... rest of script
};
```

**Values for all 10 scripts:**

| Script | `description` | `isAdvancedMap` |
|--------|---------------|-----------------|
| continents | `'Two to four large continents separated by ocean.'` | `false` |
| fractal | `'Randomly generated landmasses of varied shapes and sizes.'` | `false` |
| archipelago | `'Many small and medium islands spread across the ocean.'` | `false` |
| pangaea | `'One large landmass with optional variations.'` | `false` |
| terra | `'Old World and New World separated by ocean.'` | `false` |
| inland_sea | `'Continental ring surrounding a central body of water.'` | `false` |
| lakes | `'Large continent with many interior lakes and waterways.'` | `false` |
| oasis | `'Desert map with a central river and oasis region.'` | `true` |
| ice_age | `'Wide map with aggressive ice coverage and varied terrain.'` | `true` |
| mirror | `'Symmetrical map mirrored across one or two axes.'` | `true` |

**UI consumption:** `NewGame.jsx` can optionally read `description` to show a
tooltip or subtitle when the user selects a map type. `isAdvancedMap` can filter the
dropdown list depending on whether "Show Advanced Maps" is toggled.

---

## 9. Wire Up Dead-Code Script Properties

**Issue:** Four interface methods are declared in all 10 scripts but never consumed:
`isClimateMap()`, `isSeaLevelMap()`, `getTopLatitude()`, `getBottomLatitude()`.

### isClimateMap / isSeaLevelMap

**Purpose:** Control whether the Climate and Sea Level dropdowns appear in the New
Game UI for this map type.

**Files to modify:**
- `src/game/mapgen/index.js` — Expose script metadata to the caller
- `src/pages/NewGame.jsx` — Conditionally render dropdowns

**Implementation in `index.js`:**

Add a function to retrieve script metadata without generating a map:

```javascript
/**
 * Get metadata for a map script (for UI rendering).
 *
 * @param {string} mapType
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
    startHumansOnSameTile: script.startHumansOnSameTile?.() ?? false
  };
}
```

**NewGame.jsx usage:**

```javascript
const scriptInfo = getMapScriptInfo(selectedMapType);

// Conditionally render:
{scriptInfo.isClimateMap && <ClimateDropdown />}
{scriptInfo.isSeaLevelMap && <SeaLevelDropdown />}
{scriptInfo.customOptions.map(opt => <CustomOptionDropdown key={opt.id} option={opt} />)}
```

### getTopLatitude / getBottomLatitude

**Purpose:** Define the latitude range for the map. Affects terrain generation
(latitude bands) and bonus placement (latitude restrictions).

**Current situation:** Each script declares these but the generators receive latitude
info via different mechanisms (e.g., oasis.js passes custom values directly to its
terrain generator).

**Files to modify:**
- `src/game/mapgen/TerrainGenerator.js` — Accept `topLatitude` / `bottomLatitude`
  options
- `src/game/mapgen/FeatureGenerator.js` — Same
- `src/game/mapgen/BonusGenerator.js` — Same (for future latitude-based restrictions)
- All 10 scripts — Pass latitude values from script methods to generator constructors

**Implementation:**

In each script's `generate()`, pass latitude to generators:

```javascript
const topLat = this.getTopLatitude();
const bottomLat = this.getBottomLatitude();

const tg = new TerrainGenerator(W, H, {
  wrapX: true, wrapY: false,
  topLatitude: topLat,       // NEW
  bottomLatitude: bottomLat  // NEW
});
```

In `TerrainGenerator`, use these values for latitude band computation instead of
hardcoded ±90:

```javascript
constructor(width, height, options = {}) {
  // ... existing ...
  this.topLatitude = options.topLatitude ?? 90;
  this.bottomLatitude = options.bottomLatitude ?? -90;
}

// In latitude computation:
_getLatitude(y) {
  const ratio = y / (this.height - 1);
  return this.bottomLatitude + ratio * (this.topLatitude - this.bottomLatitude);
}
```

Same pattern for `FeatureGenerator` (jungle/ice placement uses latitude) and
`BonusGenerator` (future latitude restrictions).

---

## Implementation Order

Recommended order based on dependencies and impact:

| Priority | Feature | Effort | Dependency |
|----------|---------|--------|------------|
| 1 | **Wire up latitude** (§9 bottom half) | Small | None — fixes existing dead code |
| 2 | **BonusBalancer / normalizeAddExtras** (§3) | Medium | None — fills biggest gameplay gap |
| 3 | **Goody huts** (§2) | Medium | None — adds missing game layer |
| 4 | **Wire up isClimateMap/isSeaLevelMap + metadata** (§8, §9 top half) | Small | None — UI improvement |
| 5 | **Custom map options** (§5) | Medium | UI changes in NewGame.jsx |
| 6 | **Lifecycle hooks** (§1) | Small | None — infrastructure only |
| 7 | **isBonusIgnoreLatitude** (§4) | Small | Priority 1 (latitude wiring) |
| 8 | **startHumansOnSameTile** (§6) | Trivial | Single-player only, stub |
| 9 | **generateRandomMap** (§7) | None | Already implicit in architecture |

**Total new files:** 1 (`GoodyGenerator.js`)
**Files modified:** ~15 (index.js, StartingPlots.js, BonusGenerator.js,
TerrainGenerator.js, FeatureGenerator.js, _helpers.js, all 10 scripts)
