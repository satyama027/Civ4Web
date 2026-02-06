# Milestone 12: Integration + Backward Compatibility — Implementation Specification

## Overview

**Files**:
- `src/game/mapgen/index.js` (NEW) — Entry point, dispatches to map scripts
- `src/game/mapgen/scripts/_helpers.js` (MODIFY) — Add `generateHeightmap()`, `buildFinalMapData()`
- `src/game/mapGenerator.js` (REPLACE) — Becomes thin re-export wrapper

Wires up the full Civ4 map generation pipeline: receives settings from the UI, selects the correct map script (Milestones 10–11), invokes it, generates a render heightmap for Babylon.js 3D, adapts the output for backward compatibility (river field names, `getTile()`, `getElevation()`), and re-exports the existing public API so that `Game.jsx` and `TerrainBuilder.js` require zero changes.

---

## 1. Script Registry

### 1.1 `src/game/mapgen/index.js` — Script Map

```javascript
import continentsScript from './scripts/continents.js';
import fractalScript    from './scripts/fractal.js';
import archipelagoScript from './scripts/archipelago.js';
import pangaeaScript    from './scripts/pangaea.js';
import terraScript      from './scripts/terra.js';
import inlandSeaScript  from './scripts/inlandSea.js';
import lakesScript      from './scripts/lakes.js';
import oasisScript      from './scripts/oasis.js';
import iceAgeScript     from './scripts/iceAge.js';
import mirrorScript     from './scripts/mirror.js';

const SCRIPT_MAP = {
  continents:  continentsScript,
  fractal:     fractalScript,
  archipelago: archipelagoScript,
  pangaea:     pangaeaScript,
  terra:       terraScript,
  inland_sea:  inlandSeaScript,
  lakes:       lakesScript,
  oasis:       oasisScript,
  ice_age:     iceAgeScript,
  mirror:      mirrorScript
};
```

### 1.2 `getMapScript(mapType)`

Resolves the map type string (from `gameOptions.js`) to a script module:

```javascript
function getMapScript(mapType) {
  const key = mapType.toLowerCase().replace(/\s+/g, '_');
  const script = SCRIPT_MAP[key];
  if (!script) {
    console.warn(`Unknown map type "${mapType}", falling back to fractal`);
    return SCRIPT_MAP.fractal;
  }
  return script;
}
```

**Mapping from `gameOptions.js` `mapTypes` IDs:**

| gameOptions ID | Script Key | Script Module |
|---------------|------------|---------------|
| `pangaea` | `pangaea` | `pangaea.js` |
| `continents` | `continents` | `continents.js` |
| `archipelago` | `archipelago` | `archipelago.js` |
| `terra` | `terra` | `terra.js` |
| `fractal` | `fractal` | `fractal.js` |
| `inland_sea` | `inland_sea` | `inlandSea.js` |
| `lakes` | `lakes` | `lakes.js` |
| `oasis` | `oasis` | `oasis.js` |
| `ice_age` | `ice_age` | `iceAge.js` |
| `mirror` | `mirror` | `mirror.js` |

If `gameOptions.js` uses IDs like `"inland sea"` or `"ice age"` (with spaces), the `replace(/\s+/g, '_')` normalization handles this. Verify the exact IDs in `gameOptions.js` during implementation and adjust the mapping keys if needed.

---

## 2. `generateMap(settings)` — Entry Point

```javascript
import { SeededRandom } from './utils.js';
import { CyFractal } from './CyFractal.js';
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';

export function generateMap(settings) {
  const {
    mapType = 'continents',
    mapSize = 'standard',
    climate = 'temperate',
    seaLevel = 'medium',
    numPlayers = 7,
    seed = Date.now(),
    customOption = null
  } = settings;

  const rng = new SeededRandom(seed);

  // 1. Select map script
  const script = getMapScript(mapType);

  // 2. Run the script's full pipeline
  //    Each script.generate() internally calls:
  //      getGridSize → plotTypes → terrain → rivers → lakes →
  //      features → bonuses → startingPlots → normalization
  const scriptResult = script.generate({
    mapType,
    mapSize,
    climate,
    seaLevel,
    numPlayers,
    seed,
    customOption
  }, rng);

  // 3. Generate render heightmap for Babylon.js 3D terrain
  const heightmap = generateHeightmap(
    scriptResult.width,
    scriptResult.height,
    rng
  );

  // 4. Build the final backward-compatible output object
  return buildFinalMapData(scriptResult, heightmap, settings, seed);
}
```

### 2.1 Settings Passthrough

The `settings` object passed to `script.generate()` is the same shape defined in Milestone 10, §1:

```javascript
{
  mapType: string,          // 'continents', 'pangaea', etc.
  mapSize: string,          // 'duel' .. 'huge'
  climate: string,          // 'tropical', 'temperate', 'rocky', 'arid', 'cold'
  seaLevel: string,         // 'low', 'medium', 'high'
  numPlayers: number,       // 2-18
  seed: number,             // RNG seed
  customOption: number|null // Custom option index (0-based), or null
}
```

---

## 3. Render Heightmap Generation

### 3.1 Purpose

The `heightmap` is a 2D `[y][x]` array of normalized `[0, 1)` floats used **only** for 3D visual rendering in Babylon.js. It provides per-tile elevation variation so that:
- Peaks have smooth height variation (2.0 + h * 1.5)
- Hills vary (0.8 + h * 0.8)
- Flat land has gentle undulation (h * 0.3)

It is **not** used for any game logic — plot types, terrain, rivers, etc. are determined by the map script.

### 3.2 `generateHeightmap(width, height, rng)`

Add this to `_helpers.js` (or inline in `index.js`):

```javascript
import { CyFractal } from '../CyFractal.js';

function generateHeightmap(width, height, rng) {
  // Use CyFractal directly with grain=3 for smooth visual terrain
  const frac = new CyFractal();
  frac.fracInit(width, height, 3, rng, 0);  // no flags — just smooth noise

  const heightmap = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      // CyFractal.getHeight returns integer values [0, 255]
      // Normalize to [0, 1)
      return frac.getHeight(x, y) / 255;
    })
  );

  return heightmap;
}
```

**Parameters match the old code** (from `mapGenerator.js` lines 1023–1031):
- Same grain=3
- Same `/255` normalization
- Same no-flags (0)
- Same 2D `[y][x]` layout

### 3.3 Heightmap Shift

If the map script called `shiftPlotTypes()` (which shifts plots, terrain, etc. horizontally), the heightmap must be shifted by the same amount. There are two approaches:

**Option A (Recommended)**: Generate the heightmap **after** the script has completed (including its internal shift). Since the heightmap is pure visual noise with no game-logic coupling, it doesn't need to be shifted — it just provides per-tile variation. However, for visual consistency (so the same tile always gets the same height noise), shift the heightmap by the same offset the script used.

**Option B**: Don't shift the heightmap. Since it's random noise used only for visual variation, there's no gameplay-visible artifact. The specific height value at a given tile changes, but the overall visual quality is identical.

**Implementation**: Use Option B (no shift). The heightmap is random visual noise that doesn't correspond to terrain features. Shifting it would require scripts to expose their shift offset, which adds unnecessary coupling. The Babylon.js renderer uses heightmap values only as intra-tile variation — it makes no difference which random value each tile receives.

---

## 4. `buildFinalMapData()` — Backward-Compatible Output

### 4.1 What Consumers Expect

**`Game.jsx`** accesses:
- `mapData.width`, `mapData.height`
- `mapData.heightmap` (2D `[y][x]`)
- `mapData.plots`, `mapData.terrain`, `mapData.rivers`, `mapData.features`, `mapData.resources`
- `mapData.startingLocations`
- `mapData.getTile(x, y)` → returns tile object (see §4.3)
- `mapData.getElevation(x, y)` → returns `'flat'` / `'hills'` / `'peaks'`
- `mapData.seed`, `mapData.settings`

**`TerrainBuilder.js`** accesses:
- `mapData.getTile(x, y)` → `tile.isPeak`, `tile.isHills`, `tile.terrain`
- `mapData.heightmap?.[ty]?.[tx]` — uses optional chaining, tolerates missing

**`FeatureRenderer.js`** accesses:
- `tile.isNOfRiver`, `tile.isWOfRiver` — river edge booleans
- `tile.feature`, `tile.terrain`, `tile.isWater`

**`getMapStats()`** accesses:
- `mapData.plots`, `terrain`, `features`, `resources`, `startingLocations`

### 4.2 River Field Name Mapping

**Critical compatibility issue:** The new `RiverGenerator` (Milestone 7) stores flow directions as `riverNSDirection` and `riverWEDirection`, while the old `mapGenerator.js` and all Babylon.js renderers use `riverFlowN` and `riverFlowW`.

The `getTile()` helper maps river fields to the legacy names:

| New Field (RiverGenerator) | Legacy Field (mapGenerator) | Description |
|----------------------------|---------------------------|-------------|
| `riverNSDirection` | `riverFlowN` | Flow direction of north-edge river (`'E'` or `'W'`) |
| `riverWEDirection` | `riverFlowW` | Flow direction of west-edge river (`'N'` or `'S'`) |
| `isNOfRiver` | `isNOfRiver` | (unchanged) |
| `isWOfRiver` | `isWOfRiver` | (unchanged) |

### 4.3 `buildFinalMapData()` Implementation

```javascript
function buildFinalMapData(scriptResult, heightmap, settings, seed) {
  const {
    width: W, height: H,
    plots, terrain, features, resources, rivers, lakes,
    startingLocations
  } = scriptResult;

  const result = {
    // Dimensions
    width: W,
    height: H,
    seed,
    settings,

    // 2D arrays (already 2D from buildMapResult in the map scripts)
    heightmap,
    plots,
    terrain,
    features,
    resources,
    rivers,
    startingLocations,

    // Tile accessor — matches the exact shape Game.jsx / FeatureRenderer expect
    getTile(x, y) {
      const wx = ((x % W) + W) % W;  // world-wrap X
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

        // Computed booleans
        isWater: plot <= PLOT.COAST,
        isLand:  plot >= PLOT.LAND,
        isHills: plot === PLOT.HILLS,
        isPeak:  plot === PLOT.PEAK,
        hasRiver: tileHasRiver(rivers, wx, y, W, H),

        // Lake flag
        isLake: lakes ? lakes[y][wx] : false,

        // River edges (legacy field names for FeatureRenderer / Game.jsx)
        isNOfRiver: river.isNOfRiver,
        isWOfRiver: river.isWOfRiver,
        riverFlowN: river.riverNSDirection,  // mapped: new → legacy
        riverFlowW: river.riverWEDirection   // mapped: new → legacy
      };
    },

    // Elevation accessor
    getElevation(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;

      const plot = plots[y][wx];
      if (plot === PLOT.PEAK) return ELEVATION.PEAKS;
      if (plot === PLOT.HILLS) return ELEVATION.HILLS;
      return ELEVATION.FLAT;
    }
  };

  return result;
}
```

### 4.4 `tileHasRiver()` Helper

Checks whether a tile is adjacent to any river edge (matches the existing `tileHasRiver` logic in `mapGenerator.js`):

```javascript
function tileHasRiver(rivers, x, y, W, H) {
  const r = rivers[y][x];
  // This tile's own north and west edges
  if (r.isNOfRiver || r.isWOfRiver) return true;

  // East neighbor's west edge (= this tile's east edge)
  const ex = (x + 1) % W;
  if (rivers[y][ex].isWOfRiver) return true;

  // South neighbor's north edge (= this tile's south edge)
  if (y + 1 < H && rivers[y + 1][x].isNOfRiver) return true;

  return false;
}
```

---

## 5. Constants Re-export

### 5.1 Exports from `index.js`

```javascript
// Re-export constants from engine modules so consumers can import from index.js
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
export { PLOT }    from './FractalWorld.js';

// Elevation enum (matches existing mapGenerator.js)
export const ELEVATION = {
  FLAT: 'flat',
  HILLS: 'hills',
  PEAKS: 'peaks'
};

// Main entry point
export { generateMap };
```

### 5.2 Convenience Functions

For backward compatibility, provide named convenience functions that call `generateMap` with a fixed `mapType`:

```javascript
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
```

---

## 6. `mapToAscii()` and `getMapStats()`

### 6.1 `mapToAscii(mapData)`

Identical logic to the existing implementation. Moved to `index.js` (or a shared utils location):

```javascript
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
```

### 6.2 `getMapStats(mapData)`

Identical logic to the existing implementation:

```javascript
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

  stats.landPercent  = ((stats.land / total) * 100).toFixed(1) + '%';
  stats.waterPercent = ((stats.water / total) * 100).toFixed(1) + '%';
  stats.hillsPercent = ((stats.hills / Math.max(1, stats.land)) * 100).toFixed(1) + '%';
  stats.peaksPercent = ((stats.peaks / Math.max(1, stats.land)) * 100).toFixed(1) + '%';

  return stats;
}
```

---

## 7. `mapGenerator.js` — Thin Re-export Wrapper

Replace the entire contents of `src/game/mapGenerator.js` (~1240 lines) with a thin re-export wrapper:

```javascript
/**
 * Map Generator — Backward Compatibility Wrapper
 *
 * This file re-exports all public API from the new modular mapgen system
 * (src/game/mapgen/) so that existing consumers (Game.jsx, etc.) require
 * no import changes.
 *
 * The actual implementation lives in:
 *   src/game/mapgen/index.js      — generateMap() entry point
 *   src/game/mapgen/scripts/*.js  — Per-map-type generation pipelines
 *   src/game/mapgen/*.js          — Engine classes (CyFractal, FractalWorld, etc.)
 */

// Main entry point and convenience functions
export {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra
} from './mapgen/index.js';

// Constants
export {
  TERRAIN,
  FEATURE,
  ELEVATION
} from './mapgen/index.js';

// Utility functions
export {
  mapToAscii,
  getMapStats
} from './mapgen/index.js';

// Default export for legacy `import mapGen from './mapGenerator'` usage
import {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra,
  TERRAIN,
  FEATURE,
  ELEVATION,
  mapToAscii,
  getMapStats
} from './mapgen/index.js';

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
```

### 7.1 Consumer Impact

| Consumer | Current Import | Change Required |
|----------|---------------|-----------------|
| `Game.jsx` | `import { generateMap, getMapStats, TERRAIN } from '../game/mapGenerator'` | **None** — re-exports match |
| `TerrainBuilder.js` | Uses `mapData.heightmap`, `mapData.getTile()` | **None** — `buildFinalMapData` provides both |
| `FeatureRenderer.js` | Uses `tile.isNOfRiver`, `tile.isWOfRiver`, `tile.feature` | **None** — `getTile()` provides all fields |
| `TilePicker.js` | Uses `mapData.width`, `mapData.height` | **None** |
| Debug / console | `mapToAscii(map)`, `getMapStats(map)` | **None** |

---

## 8. Complete `index.js` File Structure

```javascript
// ============================================================================
// src/game/mapgen/index.js — Map Generation Entry Point
// ============================================================================

import { SeededRandom } from './utils.js';
import { CyFractal }   from './CyFractal.js';
import { PLOT }         from './FractalWorld.js';
import { TERRAIN }      from './TerrainGenerator.js';
import { FEATURE }      from './FeatureGenerator.js';

// --- Script imports ---
import continentsScript  from './scripts/continents.js';
import fractalScript     from './scripts/fractal.js';
import archipelagoScript from './scripts/archipelago.js';
import pangaeaScript     from './scripts/pangaea.js';
import terraScript       from './scripts/terra.js';
import inlandSeaScript   from './scripts/inlandSea.js';
import lakesScript       from './scripts/lakes.js';
import oasisScript       from './scripts/oasis.js';
import iceAgeScript      from './scripts/iceAge.js';
import mirrorScript      from './scripts/mirror.js';

// --- Constants ---
export { TERRAIN }  from './TerrainGenerator.js';
export { FEATURE }  from './FeatureGenerator.js';
export { PLOT }     from './FractalWorld.js';

export const ELEVATION = {
  FLAT:  'flat',
  HILLS: 'hills',
  PEAKS: 'peaks'
};

// --- Script registry ---
const SCRIPT_MAP = { /* ... as defined in §1.1 */ };
function getMapScript(mapType) { /* ... as defined in §1.2 */ }

// --- Heightmap generation ---
function generateHeightmap(width, height, rng) { /* ... as defined in §3.2 */ }

// --- River helper ---
function tileHasRiver(rivers, x, y, W, H) { /* ... as defined in §4.4 */ }

// --- Output builder ---
function buildFinalMapData(scriptResult, heightmap, settings, seed) { /* ... as defined in §4.3 */ }

// --- Main entry point ---
export function generateMap(settings) { /* ... as defined in §2 */ }

// --- Convenience functions ---
export function generatePangaea(settings)    { return generateMap({ ...settings, mapType: 'pangaea' }); }
export function generateContinents(settings) { return generateMap({ ...settings, mapType: 'continents' }); }
export function generateArchipelago(settings){ return generateMap({ ...settings, mapType: 'archipelago' }); }
export function generateTerra(settings)      { return generateMap({ ...settings, mapType: 'terra' }); }

// --- Utilities ---
export function mapToAscii(mapData) { /* ... as defined in §6.1 */ }
export function getMapStats(mapData) { /* ... as defined in §6.2 */ }

// --- Default export ---
export default {
  generateMap, generatePangaea, generateContinents,
  generateArchipelago, generateTerra,
  mapToAscii, getMapStats,
  TERRAIN, FEATURE, ELEVATION
};
```

---

## 9. Edge Cases and Error Handling

### 9.1 Unknown Map Type

If a `mapType` is passed that doesn't match any script key:
- Log a warning: `Unknown map type "${mapType}", falling back to fractal`
- Use the `fractal` script (most generic, no assumptions about landmass shape)

### 9.2 Missing Seed

If `settings.seed` is undefined or null:
- Default to `Date.now()` (as the current code does)
- Store the resolved seed on the returned object for reproducibility

### 9.3 Missing `customOption`

If `settings.customOption` is undefined/null:
- Pass `null` to the script
- Each script treats `null` as "use default" (e.g., Pangaea treats it as "Random")

### 9.4 Invalid `numPlayers`

If `numPlayers` is 0 or negative:
- Clamp to minimum of 2 (game requires at least 1 human + 1 AI for starting plots)
- Log a warning if clamped

### 9.5 Lake Field Tolerance

Some scripts may not produce a `lakes` array (if they don't call `addLakes()`). The `buildFinalMapData()` function should handle `lakes` being `undefined`:
- `getTile()` returns `isLake: false` when `lakes` is missing
- No crash on missing `lakes` array

---

## 10. Data Flow Diagram

```
NewGame.jsx                  Game.jsx
    |                            |
    | gameSettings               | generateMap(settings)
    |                            |
    v                            v
  ┌──────────────────────────────────────────────────┐
  │  src/game/mapGenerator.js  (thin wrapper)        │
  │    re-exports from src/game/mapgen/index.js      │
  └──────────────────────────────────────────────────┘
                     |
                     v
  ┌──────────────────────────────────────────────────┐
  │  src/game/mapgen/index.js                        │
  │                                                  │
  │  1. getMapScript(mapType)                        │
  │  2. script.generate(settings, rng)               │
  │     └─► scripts/continents.js (or other)         │
  │         ├─ FractalWorld.generatePlotTypes()       │
  │         ├─ TerrainGenerator.generateTerrain()     │
  │         ├─ RiverGenerator.addRivers()             │
  │         ├─ RiverGenerator.addLakes()              │
  │         ├─ FeatureGenerator.addFeatures()         │
  │         ├─ BonusGenerator.addBonuses()            │
  │         ├─ StartingPlots.assignStartingPlots()    │
  │         └─ buildMapResult() → { 2D arrays }      │
  │  3. generateHeightmap(W, H, rng)                 │
  │  4. buildFinalMapData(scriptResult, heightmap)   │
  │     ├─ Attaches heightmap                        │
  │     ├─ Provides getTile() with river field map   │
  │     └─ Provides getElevation()                   │
  └──────────────────────────────────────────────────┘
                     |
                     v
  ┌──────────────────────────────────────────────────┐
  │  Final mapData object                            │
  │  { width, height, seed, settings,                │
  │    heightmap, plots, terrain, features,           │
  │    resources, rivers, startingLocations,          │
  │    getTile(), getElevation() }                   │
  └──────────────────────────────────────────────────┘
                     |
          ┌──────────┼──────────┐
          v          v          v
  TerrainBuilder  FeatureRenderer  TilePicker
  (heightmap,     (rivers, trees)  (tile info)
   vertex Y)
```

---

## 11. Differences from Old `mapGenerator.js`

| Aspect | Old `mapGenerator.js` | New Integration Layer |
|--------|----------------------|----------------------|
| Architecture | Monolithic 1240-line file | Thin wrapper → `index.js` → script modules |
| Map type dispatch | Giant `switch`/`if` block selecting fractal params | Script registry: `SCRIPT_MAP[mapType].generate()` |
| FractalWorld | Custom fractal implementation | Proper CyFractal-backed FractalWorld class |
| Terrain | Inline terrain generation | TerrainGenerator class with latitude model |
| Rivers | Custom elevation tracing | RiverGenerator with Civ4 altitude system |
| Features | Inline threshold checks | FeatureGenerator class with ice dual-band |
| Resources | Fixed percentages, flat minDist | BonusGenerator with XML-style rules |
| Starting plots | Single-pass greedy scorer | 8 normalization passes, regional starts |
| River field names | `riverFlowN` / `riverFlowW` | Internal: `riverNSDirection` / `riverWEDirection`; `getTile()` maps to legacy names |
| Heightmap | Generated inline | Generated in `index.js`, same algorithm |
| `shiftPlotTypes` | Operates on 2D arrays (incl. heightmap) | Handled internally by FractalWorld on 1D `plotTypes`; heightmap not shifted (see §3.3) |
| Custom options | Not supported | Per-script `customOption` (Pangaea Shoreline, etc.) |
| Grid sizes | Single table from `gameOptions.js` | Per-script `getGridSize()` with script-specific tables |
| Map wrapping | Always wrapX, never wrapY | Per-script `getWrapX()` / `getWrapY()` |
| Coast tiles | Inline BFS | `TerrainGenerator.addCoastTiles()` static method |

---

## 12. `gameOptions.js` Changes

### 12.1 Map Type IDs

Verify that the `mapTypes` array in `gameOptions.js` uses IDs that match the `SCRIPT_MAP` keys (after normalization). If IDs use spaces (`"inland sea"`), the normalization in `getMapScript()` handles it. If IDs use other formats, add entries to `SCRIPT_MAP`.

### 12.2 Grid Sizes

The old `mapSizes` table in `gameOptions.js` defines default grid dimensions:

```javascript
// Existing:
duel:     { gridWidth: 40,  gridHeight: 24 }   // etc.
```

These defaults remain as a **fallback** for scripts whose `getGridSize()` returns `null`. Each script that defines its own `getGridSize()` (Pangaea, Inland Sea, etc.) uses its own table. The helpers' `resolveGridSize()` function handles this:
- If `script.getGridSize(worldSize)` returns a grid → multiply by 4 for plot dimensions
- If it returns `null` → use the `mapSizes` table from `gameOptions.js`

**Implementation note**: The `_helpers.js` `resolveGridSize()` already handles this (Milestone 10, §3.1). When `getGridSize` returns `null`, the script must use a default table. Add a default grid table to `_helpers.js`:

```javascript
const DEFAULT_GRID = {
  duel:     [10, 6],    // 40×24
  tiny:     [13, 8],    // 52×32
  small:    [16, 10],   // 64×40
  standard: [21, 13],   // 84×52
  large:    [26, 16],   // 104×64
  huge:     [32, 20]    // 128×80
};
```

These match the Civ4 default `getGridSize()` values from `CvMapGeneratorUtil.py`.

---

## 13. CLAUDE.md Updates

After Milestone 12 is complete, update the `CLAUDE.md` file to reflect the new architecture:

### Section: Map Generation

Replace the current `mapGenerator.js` documentation with:

1. **Architecture**: Modular system under `src/game/mapgen/` — entry point dispatches to 10 map scripts
2. **Imports**: `import { generateMap, getMapStats, TERRAIN } from '../game/mapGenerator'` (unchanged)
3. **Usage**: Same `generateMap(settings)` API, same return structure
4. **Map scripts**: List all 10 scripts and their source files
5. **Engine classes**: CyFractal, FractalWorld, HintedWorld, MultilayeredFractal, TerrainGenerator, FeatureGenerator, RiverGenerator, BonusGenerator, StartingPlots

---

## 14. File Summary

| File | Action | Size Estimate |
|------|--------|--------------|
| `src/game/mapgen/index.js` | **Create** | ~250 lines |
| `src/game/mapgen/scripts/_helpers.js` | **Modify** | Add `generateHeightmap()` (~15 lines) |
| `src/game/mapGenerator.js` | **Replace** | ~40 lines (from ~1240) |
| `CLAUDE.md` | **Update** | Map generation section |

---

## 15. Verification Checklist

### 15.1 Build & Lint
- [ ] `npm run dev` — app starts, no console errors
- [ ] `npm run build` — production build succeeds with no errors
- [ ] `npm run lint` — no new lint warnings or errors

### 15.2 Functional: All Map Types
For each of the 10 map types:
- [ ] New Game → select map type → Start Game → map generates without errors
- [ ] Map renders in 3D (terrain mesh visible with height variation)
- [ ] `console.log(getMapStats(mapData))` shows reasonable stats
- [ ] `console.log(mapToAscii(mapData))` produces readable output

### 15.3 Rendering
- [ ] Terrain mesh has smooth elevation (heightmap working)
- [ ] Peaks are visually elevated, hills moderate, water depressed
- [ ] Grid overlay toggles correctly
- [ ] Feature rendering (forest/jungle cones) appears
- [ ] River lines display when river toggle is on

### 15.4 Tile Interaction
- [ ] Left-clicking a tile shows tile info in sidebar
- [ ] Tile info shows: terrain, elevation (hills/peaks), feature, resource, river
- [ ] `tile.hasRiver` is `true` for tiles adjacent to rivers
- [ ] `tile.riverFlowN` / `tile.riverFlowW` populated for river tiles
- [ ] `tile.isLake` is `true` for lake tiles (1-tile enclosed water)

### 15.5 Backward Compatibility
- [ ] `import { generateMap, getMapStats, TERRAIN } from '../game/mapGenerator'` works
- [ ] `import { FEATURE, ELEVATION } from '../game/mapGenerator'` works
- [ ] `import mapGen from '../game/mapGenerator'; mapGen.generateMap(...)` works
- [ ] `generatePangaea(settings)` convenience function works
- [ ] `generateContinents(settings)` convenience function works
- [ ] Return value has all expected fields: `width`, `height`, `seed`, `settings`, `heightmap`, `plots`, `terrain`, `features`, `resources`, `rivers`, `startingLocations`, `getTile()`, `getElevation()`

### 15.6 Determinism
- [ ] Same seed + same settings = identical map (run twice, compare ASCII output)
- [ ] Different seeds produce different maps

### 15.7 Per-Script Specifics
- [ ] **Continents**: 2+ landmasses, ~25% land, widest ocean at map edge
- [ ] **Pangaea**: Single dominant landmass (80%+ of land)
- [ ] **Archipelago**: Many small islands, no coastal peaks
- [ ] **Fractal**: Unpredictable landmass layout
- [ ] **Terra**: Old World + empty New World, all starts on largest mass
- [ ] **Inland Sea**: Ring of land around central water body
- [ ] **Lakes**: Mostly land with small water bodies (7-14%)
- [ ] **Oasis**: Desert-dominant terrain
- [ ] **Ice Age**: Heavy ice coverage, wide/short dimensions
- [ ] **Mirror**: Symmetrical land layout
