# Milestone 10: Core Map Scripts — Implementation Specification

## Overview

**Files**:
- `src/game/mapgen/scripts/continents.js`
- `src/game/mapgen/scripts/pangaea.js`
- `src/game/mapgen/scripts/archipelago.js`
- `src/game/mapgen/scripts/fractal.js`

Ports of the four core Civ4 BTS map scripts: Continents.py, Pangaea.py, Archipelago.py, and Fractal.py. Each script is a self-contained module that orchestrates the full map generation pipeline using the engine classes built in Milestones 1–9.

Called by the integration layer (Milestone 12) which dispatches to the appropriate script based on map type selection.

---

## 1. Map Script Interface

Every script exports a single object conforming to this interface:

```javascript
export default {
  // Script identity
  id: 'continents',            // matches mapTypes id in gameOptions.js
  name: 'Continents',

  // Map properties (overrides)
  getWrapX()  { return true; },   // default
  getWrapY()  { return false; },  // default
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },

  // Custom map option (null if none)
  customOption: null,
  // or:
  // customOption: {
  //   name: 'Shoreline',
  //   values: ['Random', 'Natural', 'Pressed', 'Solid'],
  //   default: 0
  // },

  // Grid size override (null = use gameOptions.js default)
  getGridSize(worldSize) { return null; },

  // The full generation pipeline
  generate(settings, rng) { ... }
}
```

### `generate(settings, rng)` Return Contract

Returns the same data structure the integration layer expects (matches existing `mapGenerator.js` output):

```javascript
{
  width,                    // int — map width in plots
  height,                   // int — map height in plots
  plots: number[][],        // 2D [y][x] — PLOT enum values
  terrain: string[][],      // 2D [y][x] — TERRAIN enum values
  features: (string|null)[][],  // 2D [y][x] — FEATURE enum values or null
  resources: (string|null)[][],  // 2D [y][x] — bonus IDs or null
  rivers: Object[][],       // 2D [y][x] — river edge data
  lakes: boolean[][],       // 2D [y][x] — true if lake tile
  startingLocations: [{x, y}]
}
```

### `settings` Parameter Shape

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

## 2. Imports (Common to All Scripts)

```javascript
import { SeededRandom, clamp } from '../utils.js';
import { CyFractal, FRAC_WRAP_X, FRAC_WRAP_Y, FRAC_POLAR,
         FRAC_CENTER_RIFT, FRAC_INVERT_HEIGHTS } from '../CyFractal.js';
import { FractalWorld, PLOT } from '../FractalWorld.js';
import { HintedWorld } from '../HintedWorld.js';
import { MultilayeredFractal } from '../MultilayeredFractal.js';
import { TerrainGenerator, TERRAIN } from '../TerrainGenerator.js';
import { FeatureGenerator, FEATURE } from '../FeatureGenerator.js';
import { RiverGenerator } from '../RiverGenerator.js';
import { BonusGenerator, BONUS_DEFS } from '../BonusGenerator.js';
import { StartingPlots } from '../StartingPlots.js';
```

Each script imports only the classes it needs.

---

## 3. Shared Helpers

### 3.1 `resolveGridSize(worldSize, gridTable)`

Converts grid cells to plot dimensions. Each grid cell = 4×4 plots.

```javascript
function resolveGridSize(worldSize, gridTable) {
  const grid = gridTable[worldSize];
  return {
    width: grid[0] * 4,
    height: grid[1] * 4
  };
}
```

### 3.2 `resolveSeaLevelChange(seaLevel)`

Maps sea level setting to the Civ4 `seaLevelChange` integer:

```javascript
function resolveSeaLevelChange(seaLevel) {
  switch (seaLevel) {
    case 'low':    return -5;
    case 'medium': return 0;
    case 'high':   return 5;
    default:       return 0;
  }
}
```

### 3.3 `resolveClimateSettings(climate)`

Returns climate-dependent parameters for TerrainGenerator and FeatureGenerator:

```javascript
function resolveClimateSettings(climate) {
  const configs = {
    tropical:  { hillRange: 8,  peakPercent: 5,  jungleLatitude: 0.40 },
    temperate: { hillRange: 9,  peakPercent: 4,  jungleLatitude: 0.15 },
    rocky:     { hillRange: 12, peakPercent: 7,  jungleLatitude: 0.05 },
    arid:      { hillRange: 7,  peakPercent: 3,  jungleLatitude: 0.00 },
    cold:      { hillRange: 9,  peakPercent: 4,  jungleLatitude: 0.00 }
  };
  return configs[climate] || configs.temperate;
}
```

### 3.4 `getWorldSizeGrainAdjust(worldSize)`

Several generators add a world-size-dependent offset to their grain values:

```javascript
function getWorldSizeGrainAdjust(worldSize) {
  switch (worldSize) {
    case 'duel':
    case 'tiny':     return 0;
    case 'small':    return 0;
    case 'standard': return 1;
    case 'large':    return 1;
    case 'huge':     return 2;
    default:         return 0;
  }
}
```

### 3.5 `findBiggestLandArea(plotTypes, W, H, wrapX)`

BFS flood fill to find connected land regions. Returns the area ID of the largest landmass. Used by Pangaea's starting plot constraint.

```javascript
function findBiggestLandArea(plotTypes, W, H, wrapX) {
  const areas = new Array(W * H).fill(-1);
  let nextId = 0;
  const areaSizes = {};

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (areas[idx] !== -1) continue;
      if (plotTypes[idx] === PLOT.OCEAN || plotTypes[idx] === PLOT.COAST) continue;

      const areaId = nextId++;
      let size = 0;
      const queue = [{ x, y }];
      areas[idx] = areaId;

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift();
        size++;
        for (const [dx, dy] of [[0,-1],[0,1],[1,0],[-1,0]]) {
          let nx = cx + dx;
          let ny = cy + dy;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          const nIdx = ny * W + nx;
          if (areas[nIdx] !== -1) continue;
          if (plotTypes[nIdx] === PLOT.OCEAN || plotTypes[nIdx] === PLOT.COAST) continue;
          areas[nIdx] = areaId;
          queue.push({ x: nx, y: ny });
        }
      }
      areaSizes[areaId] = size;
    }
  }

  let biggestId = 0;
  let biggestSize = 0;
  for (const [id, size] of Object.entries(areaSizes)) {
    if (size > biggestSize) {
      biggestSize = size;
      biggestId = parseInt(id);
    }
  }

  return { areaId: biggestId, areas, areaSizes };
}
```

### 3.6 `addCoastTiles(plotTypes1D, W, H, wrapX, wrapY)`

After plot generation, convert OCEAN tiles adjacent to land to COAST. Use `TerrainGenerator.addCoastTiles()` (static method already implemented in Milestone 5).

### 3.7 Default Grid Size Table

The default grid sizes from `gameOptions.js` (used when a script doesn't override):

| World Size | Grid (W×H) | Plots (W×H) |
|-----------|------------|-------------|
| Duel | 10×6 | 40×24 |
| Tiny | 13×8 | 52×32 |
| Small | 16×10 | 64×40 |
| Standard | 21×13 | 84×52 |
| Large | 26×16 | 104×64 |
| Huge | 32×20 | 128×80 |

These should be pulled from `gameOptions.js` at runtime, not hardcoded. Scripts that override `getGridSize()` return their own `[gridW, gridH]` pair.

---

## 4. Script: Continents (`continents.js`)

### 4.1 Overview

The simplest script. Uses default `FractalWorld` with default rift, polar attenuation, and `water_percent=75`. No custom options, no grid size override, no generator overrides.

**Civ4 source**: `Continents.py` by Soren Johnson.

### 4.2 Export

```javascript
export default {
  id: 'continents',
  name: 'Continents',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },
  customOption: null,
  getGridSize(_worldSize) { return null; },
  generate(settings, rng) { ... }
}
```

### 4.3 `generate(settings, rng)` — Full Pipeline

```javascript
generate(settings, rng) {
  const { mapSize, climate, seaLevel, numPlayers } = settings;
  const climateConfig = resolveClimateSettings(climate);
  const seaLevelChange = resolveSeaLevelChange(seaLevel);

  // 1. Resolve map dimensions (default grid size)
  const gridSize = this.getGridSize(mapSize);
  const { width: W, height: H } = gridSize
    ? resolveGridSize(mapSize, { [mapSize]: gridSize })
    : getDefaultDimensions(mapSize);  // from gameOptions

  // 2. Generate plot types
  const fw = new FractalWorld(W, H, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true,
    wrapY: false
  });

  fw.initFractal(rng, {
    continent_grain: 2,
    rift_grain: 2,
    has_center_rift: true,
    invert_heights: false,
    polar: true
  });

  const plotTypes1D = fw.generatePlotTypes(rng, {
    water_percent: 75,
    grain_amount: 3,
    shift_plot_types: true
  });

  // 3. Add coast tiles
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

  // 4. Generate terrain
  const tg = new TerrainGenerator(W, H, {
    wrapX: true, wrapY: false
  });
  const terrain1D = tg.generateTerrain(rng, plotTypes1D);

  // 5. Add rivers
  const rg = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
  const rivers1D = rg.addRivers(rng, plotTypes1D, terrain1D);

  // 6. Add lakes
  const lakes1D = rg.addLakes(plotTypes1D);

  // 7. Add features
  const fg = new FeatureGenerator(W, H, {
    jungleLatitude: climateConfig.jungleLatitude,
    wrapX: true, wrapY: false
  });
  const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

  // 8. Add bonuses
  const bg = new BonusGenerator(W, H, {
    numPlayers, wrapX: true, wrapY: false
  });
  const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

  // 9. Assign starting plots
  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: 0,
    wrapX: true, wrapY: false
  });
  const starts = sp.assignStartingPlots(
    numPlayers, rng, plotTypes1D, terrain1D, features1D, bonuses1D, rivers1D, lakes1D
  );

  // 10. Normalize
  sp.normalize(starts, plotTypes1D, terrain1D, features1D, bonuses1D, rivers1D, lakes1D, rng);

  // 11. Convert to 2D and return
  return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts);
}
```

### 4.4 `buildMapResult()` — Shared Output Builder

All scripts call this to convert 1D arrays to the 2D output format:

```javascript
function buildMapResult(W, H, settings, plots1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts) {
  const to2D = (arr) => Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => arr[y * W + x])
  );

  return {
    width: W,
    height: H,
    seed: settings.seed,
    settings,
    plots: to2D(plots1D),
    terrain: to2D(terrain1D),
    features: to2D(features1D),
    resources: to2D(bonuses1D),
    rivers: to2D(rivers1D),
    lakes: to2D(lakes1D),
    startingLocations: starts
  };
}
```

---

## 5. Script: Fractal (`fractal.js`)

### 5.1 Overview

The simplest possible script. Pure FractalWorld with no rift, no custom water percent, no custom options. Result is completely unpredictable.

**Civ4 source**: `Fractal.py` by Soren Johnson.

### 5.2 Export

```javascript
export default {
  id: 'fractal',
  name: 'Fractal',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },
  customOption: null,
  getGridSize(_worldSize) { return null; },
  generate(settings, rng) { ... }
}
```

### 5.3 `generate()` — Differences from Continents

Only two differences from the Continents pipeline:

```javascript
// 1. initFractal: no rift, no center rift
fw.initFractal(rng, {
  continent_grain: 2,
  rift_grain: -1,              // ← no rift fractal
  has_center_rift: false,      // ← no center rift
  invert_heights: false,
  polar: true
});

// 2. generatePlotTypes: default water_percent (78), NOT 75
const plotTypes1D = fw.generatePlotTypes(rng, {
  water_percent: 78,           // ← engine default, not 75
  grain_amount: 3,
  shift_plot_types: true
});
```

All other pipeline steps (terrain, rivers, lakes, features, bonuses, starting plots, normalization) are identical to Continents.

---

## 6. Script: Archipelago (`archipelago.js`)

### 6.1 Overview

Island world with adjustable grain (Snaky → Tiny Islands), extra peaks to counterbalance coastal peak removal, and a custom regional starting plot system.

**Civ4 source**: `Archipelago.py` by Bob Thomas (Sirian) and Soren Johnson.

### 6.2 Export

```javascript
export default {
  id: 'archipelago',
  name: 'Archipelago',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },

  customOption: {
    name: 'Landmass Type',
    values: ['Snaky Continents', 'Archipelago', 'Tiny Islands'],
    default: 1  // Archipelago
  },

  getGridSize(_worldSize) { return null; },  // uses default sizes
  generate(settings, rng) { ... }
}
```

### 6.3 Custom Option Mapping

| Option Index | Name | continent_grain | rift_grain | extra_peaks |
|-------------|------|----------------|------------|-------------|
| 0 | Snaky Continents | 3 | -1 | +15% |
| 1 | Archipelago | 4 | -1 | +30% |
| 2 | Tiny Islands | 5 | -1 | +45% |

The `extra_peaks` value is added to `peakPercent` from climate config. This counterbalances the coastal peak removal pass that runs before features.

```javascript
const optionIndex = settings.customOption != null ? settings.customOption : 1;
const grainMap = [3, 4, 5];
const continent_grain = grainMap[optionIndex];
const extraPeaks = 15 * (1 + optionIndex);  // +15, +30, +45
```

### 6.4 `generate()` — Plot Types

```javascript
// Adjusted peak percent
const adjustedPeakPercent = clamp(climateConfig.peakPercent + extraPeaks, 0, 100);

const fw = new FractalWorld(W, H, {
  seaLevelChange,
  hillGroupOneRange: climateConfig.hillRange,
  hillGroupTwoRange: climateConfig.hillRange,
  peakPercent: adjustedPeakPercent,  // ← boosted peaks
  wrapX: true, wrapY: false
});

fw.initFractal(rng, {
  continent_grain,
  rift_grain: -1,           // no rift
  has_center_rift: false,
  invert_heights: false,
  polar: true
});

const plotTypes1D = fw.generatePlotTypes(rng, {
  water_percent: 78,        // engine default
  grain_amount: 3,
  shift_plot_types: true
});
```

### 6.5 Coastal Peak Removal

After plot generation and coast tile addition, but **before** feature generation, any peak tile adjacent to ocean or coast is converted to hills:

```javascript
function removeCoastalPeaks(plotTypes1D, W, H, wrapX) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (plotTypes1D[idx] !== PLOT.PEAK) continue;

      // Check 8 neighbors for water
      let isCoastal = false;
      for (let dy = -1; dy <= 1 && !isCoastal; dy++) {
        for (let dx = -1; dx <= 1 && !isCoastal; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (wrapX) nx = ((nx % W) + W) % W;
          else if (nx < 0 || nx >= W) continue;
          if (ny < 0 || ny >= H) continue;
          const nPlot = plotTypes1D[ny * W + nx];
          if (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST) {
            isCoastal = true;
          }
        }
      }

      if (isCoastal) {
        plotTypes1D[idx] = PLOT.HILLS;
      }
    }
  }
}
```

Call this in the pipeline:

```javascript
// After coast tiles
TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

// Remove coastal peaks (Archipelago-specific)
removeCoastalPeaks(plotTypes1D, W, H, true);

// Then terrain, rivers, features, etc.
```

### 6.6 Custom Regional Starting Plot System

Archipelago overrides starting plot assignment with a region-based system that ensures players are spread across different island groups.

#### 6.6.1 Region Count Tables

```javascript
const REGION_COUNTS = {
  // [numPlayers] → numRegions
  tinyIslands:  [0, 3, 3, 3, 6, 6, 8, 8, 12, 12, 12, 15, 15, 15, 20, 20, 20, 20, 24],
  archipelago:  [0, 3, 3, 6, 6, 8, 8, 12, 12, 15, 15, 15, 20, 20, 20, 24, 24, 24, 24],
  snaky:        [0, 3, 3, 6, 6, 8, 8, 12, 12, 15, 15, 15, 20, 20, 20, 24, 24, 24, 24]
};
```

Snaky and Archipelago use the same table. Tiny Islands has fewer regions at low player counts.

#### 6.6.2 Minimum Distances by Region Count

```javascript
const MIN_DISTANCES = {
  //  numRegions: [minLon, minLat]
  3:  [0.10, 0.20],
  6:  [0.10, 0.125],
  8:  [0.07, 0.125],
  12: [0.07, 0.10],
  15: [0.06, 0.10],
  20: [0.06, 0.06],
  24: [0.05, 0.05]
};
```

#### 6.6.3 Region Placement Algorithm

```javascript
function placeRegions(numRegions, W, H, rng) {
  const [minLon, minLat] = MIN_DISTANCES[numRegions] || [0.05, 0.05];
  const minDistX = Math.floor(W * minLon);
  const minDistY = Math.floor(H * minLat);

  const regions = [];
  const maxAttempts = 1000;

  for (let r = 0; r < numRegions; r++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const cx = rng.nextInt(0, W - 1);
      const cy = rng.nextInt(0, H - 1);

      // Check distance from existing regions
      let valid = true;
      for (const existing of regions) {
        let dx = Math.abs(cx - existing.x);
        if (dx > W / 2) dx = W - dx;  // wrap
        const dy = Math.abs(cy - existing.y);
        if (dx < minDistX && dy < minDistY) {
          valid = false;
          break;
        }
      }

      if (valid) {
        regions.push({ x: cx, y: cy });
        placed = true;
      }
    }

    // Relaxation: if placement fails, place randomly
    if (!placed) {
      regions.push({ x: rng.nextInt(0, W - 1), y: rng.nextInt(0, H - 1) });
    }
  }

  return regions;
}
```

#### 6.6.4 Region Scoring

Each region is scored based on resources and land quality within a radius:

```javascript
function scoreRegion(cx, cy, radius, plotTypes1D, terrain1D, features1D,
                     bonuses1D, W, H, wrapX) {
  let score = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      const idx = ny * W + nx;
      const plot = plotTypes1D[idx];
      const terr = terrain1D[idx];

      if (plot === PLOT.OCEAN || plot === PLOT.COAST) {
        // Water food sources
        if (bonuses1D[idx]) score += 2;
        continue;
      }

      // Land yields
      if (terr === TERRAIN.GRASSLAND) score += 2;
      else if (terr === TERRAIN.PLAINS) score += 1;
      if (plot === PLOT.HILLS) score += 1;

      // Resources
      if (bonuses1D[idx]) score += 2;
    }
  }
  return score;
}
```

#### 6.6.5 Assignment: Worst Region First

```javascript
function assignStartsArchipelago(numPlayers, regions, plotTypes1D, terrain1D,
                                  features1D, bonuses1D, W, H, rng) {
  const radius = 5;
  const wrapX = true;

  // Score all regions
  const scored = regions.map((r, i) => ({
    ...r,
    index: i,
    score: scoreRegion(r.x, r.y, radius, plotTypes1D, terrain1D,
                       features1D, bonuses1D, W, H, wrapX)
  }));

  // Sort ascending (worst regions first)
  scored.sort((a, b) => a.score - b.score);

  // Shuffle players
  const playerOrder = Array.from({ length: numPlayers }, (_, i) => i);
  rng.shuffle(playerOrder);

  // Assign worst regions to players first (best pick within region)
  const starts = new Array(numPlayers);
  const usedRegions = new Set();

  for (let p = 0; p < numPlayers; p++) {
    // Pick worst unassigned region
    let region = null;
    for (const r of scored) {
      if (!usedRegions.has(r.index)) {
        region = r;
        usedRegions.add(r.index);
        break;
      }
    }

    if (!region) {
      // More players than regions: reuse regions
      region = scored[p % scored.length];
    }

    // Find best starting tile within region radius
    const best = findBestTileInRadius(region.x, region.y, radius,
                                       plotTypes1D, terrain1D, features1D,
                                       bonuses1D, W, H, wrapX);
    starts[playerOrder[p]] = best;
  }

  return starts;
}
```

#### 6.6.6 `findBestTileInRadius()`

Finds the best starting plot within a region, using the same scoring as `StartingPlots._scoreSingleTile()`:

```javascript
function findBestTileInRadius(cx, cy, radius, plotTypes1D, terrain1D,
                               features1D, bonuses1D, W, H, wrapX) {
  let bestScore = -Infinity;
  let bestTile = { x: cx, y: cy };

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;

      const idx = ny * W + nx;
      const plot = plotTypes1D[idx];
      if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) continue;

      // Score this as a city site (BFC scoring)
      const score = scoreCitySite(nx, ny, plotTypes1D, terrain1D,
                                   features1D, bonuses1D, W, H, wrapX);
      if (score > bestScore) {
        bestScore = score;
        bestTile = { x: nx, y: ny };
      }
    }
  }

  return bestTile;
}
```

### 6.7 Normalization Overrides

Archipelago disables `normalizeRemovePeaks`:

```javascript
const sp = new StartingPlots(W, H, {
  minStartingDistanceModifier: 0,
  skipRemovePeaks: true,       // ← Archipelago override
  wrapX: true, wrapY: false
});
```

### 6.8 Pipeline Order Summary

1. Resolve grid size (default)
2. `FractalWorld.generatePlotTypes()` with boosted peakPercent
3. `addCoastTiles()`
4. **`removeCoastalPeaks()`** ← Archipelago-specific
5. `TerrainGenerator.generateTerrain()`
6. `RiverGenerator.addRivers()` + `addLakes()`
7. `FeatureGenerator.generateFeatures()`
8. `BonusGenerator.addBonuses()`
9. **Custom regional `assignStartsArchipelago()`** ← Archipelago-specific
10. `StartingPlots.normalize()` with `skipRemovePeaks: true`
11. `buildMapResult()`

---

## 7. Script: Pangaea (`pangaea.js`)

### 7.1 Overview

The most complex core script. Offers four "Shoreline" variants, each using a different generation algorithm:

- **Natural**: `PangaeaMultilayeredFractal` type 0 (main landmass + subcontinents)
- **Pressed Equatorial**: `PangaeaMultilayeredFractal` type 1
- **Pressed Polar**: `PangaeaMultilayeredFractal` type 2
- **Solid (Soren's)**: `HintedWorld(8, 4)` with manual border/interior setup
- **Solid (Andy's)**: `HintedWorld(16, 8)` with continent growth

The "Random" option selects among these with a weighted distribution.

**Civ4 source**: `Pangaea.py` by Bob Thomas (Sirian), Soren Johnson, and Andy Szybalski.

### 7.2 Export

```javascript
export default {
  id: 'pangaea',
  name: 'Pangaea',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },

  customOption: {
    name: 'Shoreline',
    values: ['Random', 'Natural', 'Pressed', 'Solid'],
    default: 0
  },

  getGridSize(worldSize) {
    const table = {
      duel:     [8, 5],
      tiny:     [10, 6],
      small:    [13, 8],
      standard: [16, 10],
      large:    [21, 13],
      huge:     [26, 16]
    };
    return table[worldSize] || table.standard;
  },

  generate(settings, rng) { ... }
}
```

### 7.3 Custom Option Resolution

```javascript
function resolvePangaeaType(customOption, rng) {
  if (customOption === 1) return 'natural';
  if (customOption === 2) {
    // Pressed: 50/50 equatorial or polar
    return rng.next() < 0.5 ? 'pressed_equatorial' : 'pressed_polar';
  }
  if (customOption === 3) {
    // Solid: 50/50 Soren's or Andy's
    return rng.next() < 0.5 ? 'solid_soren' : 'solid_andy';
  }

  // Random (option 0): weighted selection
  // 40% Natural, 10% Pressed Eq, 20% Pressed Polar,
  // 20% Solid Irregular (Andy's), 10% Solid Round (Soren's)
  const roll = rng.next();
  if (roll < 0.40) return 'natural';
  if (roll < 0.50) return 'pressed_equatorial';
  if (roll < 0.70) return 'pressed_polar';
  if (roll < 0.90) return 'solid_andy';
  return 'solid_soren';
}
```

### 7.4 Grid Size — Reduced by One Level

Pangaea uses smaller grids than default, giving more land density:

| World Size | Grid (cells) | Plots |
|-----------|-------------|-------|
| Duel | 8×5 | 32×20 |
| Tiny | 10×6 | 40×24 |
| Small | 13×8 | 52×32 |
| Standard | 16×10 | 64×40 |
| Large | 21×13 | 84×52 |
| Huge | 26×16 | 104×64 |

### 7.5 `generate()` — Top-Level Dispatch

```javascript
generate(settings, rng) {
  const { mapSize, climate, seaLevel, numPlayers } = settings;
  const climateConfig = resolveClimateSettings(climate);
  const seaLevelChange = resolveSeaLevelChange(seaLevel);

  const gridSize = this.getGridSize(mapSize);
  const W = gridSize[0] * 4;
  const H = gridSize[1] * 4;

  const optionIndex = settings.customOption != null ? settings.customOption : 0;
  const pangaeaType = resolvePangaeaType(optionIndex, rng);

  // Generate plot types based on pangaea type
  let plotTypes1D;
  switch (pangaeaType) {
    case 'natural':
      plotTypes1D = generateMultilayered(W, H, 0, seaLevelChange, climateConfig, mapSize, rng);
      break;
    case 'pressed_equatorial':
      plotTypes1D = generateMultilayered(W, H, 1, seaLevelChange, climateConfig, mapSize, rng);
      break;
    case 'pressed_polar':
      plotTypes1D = generateMultilayered(W, H, 2, seaLevelChange, climateConfig, mapSize, rng);
      break;
    case 'solid_soren':
      plotTypes1D = generateSorensHinted(W, H, seaLevelChange, climateConfig, rng);
      break;
    case 'solid_andy':
      plotTypes1D = generateAndysHinted(W, H, seaLevelChange, climateConfig, rng);
      break;
  }

  // Add coast tiles
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

  // Terrain (default generator)
  const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false });
  const terrain1D = tg.generateTerrain(rng, plotTypes1D);

  // Cohesion repair
  applyCohesionRepair(plotTypes1D, terrain1D, W, H, pangaeaType,
                       seaLevelChange, climateConfig, rng);

  // Rivers
  const riverGen = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
  const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
  const lakes1D = riverGen.addLakes(plotTypes1D);

  // Features (default generator)
  const fg = new FeatureGenerator(W, H, {
    jungleLatitude: climateConfig.jungleLatitude,
    wrapX: true, wrapY: false
  });
  const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

  // Bonuses
  const bg = new BonusGenerator(W, H, {
    numPlayers, wrapX: true, wrapY: false
  });
  const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

  // Starting plots — biggest-area constraint
  const starts = assignStartsPangaea(
    numPlayers, plotTypes1D, terrain1D, features1D, bonuses1D,
    rivers1D, lakes1D, W, H, rng
  );

  // Normalize (all passes enabled)
  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: 0,
    wrapX: true, wrapY: false
  });
  sp.normalize(starts, plotTypes1D, terrain1D, features1D,
               bonuses1D, rivers1D, lakes1D, rng);

  return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts);
}
```

### 7.6 Soren's Hinted Pangaea — `generateSorensHinted()`

```javascript
function generateSorensHinted(W, H, seaLevelChange, climateConfig, rng) {
  const hw = new HintedWorld(W, H, 8, 4, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  // Set border cells to ocean (value 0)
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 4; by++) {
      if (bx === 0 || bx === 7 || by === 0 || by === 3) {
        hw.setValue(bx, by, 0);
      } else {
        // Interior cells = land (200-254)
        hw.setValue(bx, by, 200 + rng.nextInt(0, 54));
      }
    }
  }

  // Add 4 random bays (low values in interior)
  const interiorCells = [];
  for (let bx = 1; bx <= 6; bx++) {
    for (let by = 1; by <= 2; by++) {
      interiorCells.push([bx, by]);
    }
  }
  rng.shuffle(interiorCells);

  for (let i = 0; i < Math.min(4, interiorCells.length); i++) {
    const [bx, by] = interiorCells[i];
    hw.setValue(bx, by, rng.nextInt(0, 47));  // low value = water
  }

  // 50% chance of extra bay on left or right side
  if (rng.next() < 0.5) {
    const side = rng.next() < 0.5 ? 0 : 7;
    const by = rng.nextInt(1, 2);
    hw.setValue(side, by, rng.nextInt(0, 47));
  }

  return hw.generatePlotTypes(rng, {
    water_percent: -1,          // auto-calculate from hint values
    shift_plot_types: false
  });
}
```

### 7.7 Andy's Hinted Pangaea — `generateAndysHinted()`

```javascript
function generateAndysHinted(W, H, seaLevelChange, climateConfig, rng) {
  const hw = new HintedWorld(W, H, 16, 8, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  const numBlocks = 16 * 8;  // 128 total blocks
  const numBlocksLand = Math.floor(numBlocks * 0.33);  // 33% land

  // Place a single continent randomly
  const cx = rng.nextInt(4, 11);  // avoid extreme edges
  const cy = rng.nextInt(2, 5);
  hw.addContinent(rng, numBlocksLand, cx, cy);
  hw.buildAllContinents(rng);

  // Cohesion check: biggest area must be >= 90% of total land blocks
  const landBlocks = hw.data.filter(v => v !== null && v >= 192).length;
  if (landBlocks > 0) {
    const { biggestSize } = countBlockAreas(hw);
    if (biggestSize / landBlocks < 0.90) {
      // Retry with different placement (up to 3 retries)
      // On failure, proceed anyway
    }
  }

  return hw.generatePlotTypes(rng, {
    water_percent: -1,
    shift_plot_types: true
  });
}
```

### 7.8 Multilayered Pangaea — `generateMultilayered()`

This is the most complex variant. It creates a central landmass with two passes, then adds 4–7 subcontinents of varying shapes.

#### 7.8.1 Grain by World Size

```javascript
function getPangaeaGrain(worldSize) {
  switch (worldSize) {
    case 'duel':
    case 'tiny':     return 3;
    case 'small':
    case 'standard':
    case 'large':    return 4;
    case 'huge':     return 5;
    default:         return 4;
  }
}
```

#### 7.8.2 Sea Level Clamping

```javascript
const sea = clamp(seaLevelChange, -5, 5);
```

#### 7.8.3 Main Function

```javascript
function generateMultilayered(W, H, typeIndex, seaLevelChange, climateConfig, worldSize, rng) {
  const sea = clamp(seaLevelChange, -5, 5);
  const archGrain = getPangaeaGrain(worldSize);

  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: sea,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  const iFlags = FRAC_WRAP_X | FRAC_POLAR;

  // Determine main region bounds and subcontinent parameters based on type
  let mainWestLon, mainEastLon, mainSouthLat, mainNorthLat;
  let subcontinentDimension, numSubcontinents;
  let bSouthwardShift = false;

  if (typeIndex === 0) {
    // TYPE 0: NATURAL
    mainWestLon = 0.2;
    mainEastLon = 0.8;
    mainSouthLat = 0.2;
    mainNorthLat = 0.8;
    subcontinentDimension = 0.3;
    numSubcontinents = 4 + rng.nextInt(0, 2);  // 4-6

    // Random N/S shift ±0.075
    const shift = 0.075;
    if (rng.next() < 0.5) {
      mainSouthLat += shift;
      mainNorthLat += shift;
    } else {
      mainSouthLat -= shift;
      mainNorthLat -= shift;
    }
  } else if (typeIndex === 1) {
    // TYPE 1: PRESSED EQUATORIAL
    mainWestLon = 0.2;
    mainEastLon = 0.8;
    mainSouthLat = 0.2;
    mainNorthLat = 0.8;
    subcontinentDimension = 0.4;
    numSubcontinents = 2 + rng.nextInt(0, 3);  // 2-5 (biased toward 3)
  } else {
    // TYPE 2: PRESSED POLAR
    mainWestLon = 0.2;
    mainEastLon = 0.8;
    mainSouthLat = 0.2;
    mainNorthLat = 0.8;
    subcontinentDimension = 0.4;
    numSubcontinents = 3;

    // Large N/S shift ±0.175
    const shift = 0.175;
    if (rng.next() < 0.5) {
      mainSouthLat += shift;
      mainNorthLat += shift;
      bSouthwardShift = false;
    } else {
      mainSouthLat -= shift;
      mainNorthLat -= shift;
      bSouthwardShift = true;
    }
  }

  // Convert lon/lat fractions to plot coordinates
  const mainWestX  = Math.floor(mainWestLon * W);
  const mainEastX  = Math.floor(mainEastLon * W);
  const mainSouthY = Math.floor(mainSouthLat * H);
  const mainNorthY = Math.floor(mainNorthLat * H);
  const mainWidth  = mainEastX - mainWestX + 1;
  const mainHeight = mainNorthY - mainSouthY + 1;

  // PASS 1: Main landmass
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 55 + sea,
    iRegionWidth: mainWidth,
    iRegionHeight: mainHeight,
    iRegionWestX: mainWestX,
    iRegionSouthY: mainSouthY,
    iRegionGrain: 2,
    iRegionHillsGrain: 3,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: 2,
    has_center_rift: false,
    invert_heights: false
  });

  // PASS 2: Cohesion fill (inset 10% horiz, 25% vert)
  const cohInsetX = Math.floor(mainWidth * 0.10);
  const cohInsetY = Math.floor(mainHeight * 0.25);
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 60 + sea,
    iRegionWidth: mainWidth - 2 * cohInsetX,
    iRegionHeight: mainHeight - 2 * cohInsetY,
    iRegionWestX: mainWestX + cohInsetX,
    iRegionSouthY: mainSouthY + cohInsetY,
    iRegionGrain: 1,
    iRegionHillsGrain: 3,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    iStrip: 15,
    rift_grain: -1,
    has_center_rift: false,
    invert_heights: false
  });

  // SUBCONTINENTS
  addSubcontinents(mlf, rng, numSubcontinents, subcontinentDimension,
                    mainWestLon, mainEastLon, mainSouthLat, mainNorthLat,
                    W, H, sea, archGrain, iFlags, typeIndex, bSouthwardShift);

  // Extract 1D plot array from multilayered fractal
  const plotTypes1D = new Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      plotTypes1D[y * W + x] = mlf.getPlotType(x, y);
    }
  }

  return plotTypes1D;
}
```

#### 7.8.4 Subcontinent Slot Placement — `addSubcontinents()`

Subcontinents are placed in predefined "slot" positions around the main landmass. The slots vary by Pangaea type.

**Type 0 (Natural) — 8 Slots:**

```javascript
const TYPE0_SLOTS = [
  // [lonCenter, latCenter, lonVariance, latVariance]
  // Positions surrounding the main landmass
  { lonCenter: 0.10, latCenter: 0.50, lonVar: 0.05, latVar: 0.15 },  // far west
  { lonCenter: 0.90, latCenter: 0.50, lonVar: 0.05, latVar: 0.15 },  // far east
  { lonCenter: 0.30, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 },  // north-west
  { lonCenter: 0.70, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 },  // north-east
  { lonCenter: 0.30, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 },  // south-west
  { lonCenter: 0.70, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 },  // south-east
  { lonCenter: 0.50, latCenter: 0.90, lonVar: 0.15, latVar: 0.03 },  // north center
  { lonCenter: 0.50, latCenter: 0.10, lonVar: 0.15, latVar: 0.03 }   // south center
];
```

**Type 1 (Pressed Equatorial) — 4 Slots (east/west edges, wider):**

```javascript
const TYPE1_SLOTS = [
  { lonCenter: 0.07, latCenter: 0.50, lonVar: 0.03, latVar: 0.20 },
  { lonCenter: 0.93, latCenter: 0.50, lonVar: 0.03, latVar: 0.20 },
  { lonCenter: 0.50, latCenter: 0.88, lonVar: 0.20, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.12, lonVar: 0.20, latVar: 0.05 }
];
```

**Type 2 (Pressed Polar) — 4 Slots (opposite pole from main mass):**

```javascript
const TYPE2_SLOTS_SOUTH = [  // main mass shifted north
  { lonCenter: 0.25, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.10, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.75, latCenter: 0.15, lonVar: 0.10, latVar: 0.05 }
];

const TYPE2_SLOTS_NORTH = [  // main mass shifted south
  { lonCenter: 0.25, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.50, latCenter: 0.90, lonVar: 0.10, latVar: 0.05 },
  { lonCenter: 0.75, latCenter: 0.85, lonVar: 0.10, latVar: 0.05 }
];
```

**Subcontinent placement algorithm:**

```javascript
function addSubcontinents(mlf, rng, numSubcontinents, dimension,
                           mainWestLon, mainEastLon, mainSouthLat, mainNorthLat,
                           W, H, sea, archGrain, iFlags, typeIndex, bSouthwardShift) {
  // Select slot list based on type
  let slots;
  if (typeIndex === 0) slots = TYPE0_SLOTS;
  else if (typeIndex === 1) slots = TYPE1_SLOTS;
  else slots = bSouthwardShift ? TYPE2_SLOTS_NORTH : TYPE2_SLOTS_SOUTH;

  // Shuffle slots and use first numSubcontinents
  const slotsCopy = [...slots];
  rng.shuffle(slotsCopy);

  for (let i = 0; i < numSubcontinents && i < slotsCopy.length; i++) {
    const slot = slotsCopy[i];

    // Randomize position within slot variance
    const lonCenter = slot.lonCenter + (rng.next() - 0.5) * 2 * slot.lonVar;
    const latCenter = slot.latCenter + (rng.next() - 0.5) * 2 * slot.latVar;

    // Region dimensions
    const regionW = Math.floor(dimension * W);
    const regionH = Math.floor(dimension * H);
    const westX = Math.floor(lonCenter * W) - Math.floor(regionW / 2);
    const southY = Math.floor(latCenter * H) - Math.floor(regionH / 2);

    // Shape roll: determines subcontinent style
    const shape = rng.nextInt(0, 4);

    if (shape > 1) {
      // 60% — Regular subcontinent
      mlf.generatePlotsInRegion(rng, {
        iWaterPercent: 55 + sea,
        iRegionWidth: regionW,
        iRegionHeight: regionH,
        iRegionWestX: ((westX % W) + W) % W,
        iRegionSouthY: clamp(southY, 0, H - regionH),
        iRegionGrain: 1,
        iRegionHillsGrain: 3,
        iRegionPlotFlags: iFlags,
        iRegionTerrainFlags: iFlags,
        bShift: false,
        iStrip: 15,
        rift_grain: -1,
        has_center_rift: false,
        invert_heights: false
      });
    } else if (shape === 1) {
      // 20% — Irregular subcontinent
      mlf.generatePlotsInRegion(rng, {
        iWaterPercent: 66 + sea,
        iRegionWidth: regionW,
        iRegionHeight: regionH,
        iRegionWestX: ((westX % W) + W) % W,
        iRegionSouthY: clamp(southY, 0, H - regionH),
        iRegionGrain: 2,
        iRegionHillsGrain: 3,
        iRegionPlotFlags: iFlags,
        iRegionTerrainFlags: iFlags,
        bShift: false,
        iStrip: 15,
        rift_grain: 2,
        has_center_rift: false,
        invert_heights: false
      });
    } else {
      // 20% — Archipelago appendage
      mlf.generatePlotsInRegion(rng, {
        iWaterPercent: 77 + sea,
        iRegionWidth: regionW,
        iRegionHeight: regionH,
        iRegionWestX: ((westX % W) + W) % W,
        iRegionSouthY: clamp(southY, 0, H - regionH),
        iRegionGrain: archGrain,
        iRegionHillsGrain: archGrain + 1,
        iRegionPlotFlags: iFlags,
        iRegionTerrainFlags: iFlags,
        bShift: false,
        iStrip: 15,
        rift_grain: -1,
        has_center_rift: false,
        invert_heights: false
      });
    }
  }
}
```

### 7.9 Cohesion Repair — `applyCohesionRepair()`

After terrain generation, check if the biggest landmass is large enough. If not, fill in the center to connect land.

```javascript
function applyCohesionRepair(plotTypes1D, terrain1D, W, H, pangaeaType,
                              seaLevelChange, climateConfig, rng) {
  // Threshold depends on type
  const threshold = (pangaeaType === 'solid_soren' || pangaeaType === 'solid_andy')
    ? 0.90 : 0.80;

  // Count total land and biggest area
  let totalLand = 0;
  for (let i = 0; i < W * H; i++) {
    if (plotTypes1D[i] !== PLOT.OCEAN && plotTypes1D[i] !== PLOT.COAST) {
      totalLand++;
    }
  }
  if (totalLand === 0) return;

  const { areaSizes } = findBiggestLandArea(plotTypes1D, W, H, true);
  const biggestSize = Math.max(...Object.values(areaSizes));

  if (biggestSize / totalLand >= threshold) return;  // cohesion OK

  // Repair: fill center region with land
  const repairWestX = Math.floor(0.3 * W);
  const repairWidth = Math.floor(0.4 * W);  // 0.3 to 0.7
  const repairSouthY = Math.floor(0.3 * H);
  const repairHeight = Math.floor(0.4 * H);

  const repairFrac = new CyFractal();
  repairFrac.fracInit(repairWidth, repairHeight, 1, rng, FRAC_WRAP_X | FRAC_POLAR);

  const hillsFrac = new CyFractal();
  hillsFrac.fracInit(repairWidth, repairHeight, 3, rng, FRAC_WRAP_X | FRAC_POLAR);

  const peaksFrac = new CyFractal();
  peaksFrac.fracInit(repairWidth, repairHeight, 4, rng, FRAC_WRAP_X | FRAC_POLAR);

  const waterThreshold = repairFrac.getHeightFromPercent(40);
  const hillsBottom = hillsFrac.getHeightFromPercent(20);
  const hillsTop = hillsFrac.getHeightFromPercent(30);
  const hills2Bottom = hillsFrac.getHeightFromPercent(70);
  const hills2Top = hillsFrac.getHeightFromPercent(80);
  const peakThreshold = peaksFrac.getHeightFromPercent(25);

  for (let ry = 0; ry < repairHeight; ry++) {
    for (let rx = 0; rx < repairWidth; rx++) {
      const globalX = (repairWestX + rx) % W;
      const globalY = repairSouthY + ry;
      if (globalY >= H) continue;

      const globalIdx = globalY * W + globalX;

      // Only overwrite water with land — never remove existing land
      if (plotTypes1D[globalIdx] !== PLOT.OCEAN && plotTypes1D[globalIdx] !== PLOT.COAST) {
        continue;
      }

      const val = repairFrac.getHeight(rx, ry);
      if (val <= waterThreshold) continue;  // stays water

      const hillVal = hillsFrac.getHeight(rx, ry);
      if ((hillVal >= hillsBottom && hillVal <= hillsTop) ||
          (hillVal >= hills2Bottom && hillVal <= hills2Top)) {
        const peakVal = peaksFrac.getHeight(rx, ry);
        if (peakVal <= peakThreshold) {
          plotTypes1D[globalIdx] = PLOT.PEAK;
        } else {
          plotTypes1D[globalIdx] = PLOT.HILLS;
        }
      } else {
        plotTypes1D[globalIdx] = PLOT.LAND;
      }
    }
  }

  // Re-apply coast tiles after repair
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);
}
```

### 7.10 Starting Plots — Biggest Area Constraint

All players start on the biggest landmass. Uses default `StartingPlots` scoring but restricts candidates to tiles on the largest connected land area.

```javascript
function assignStartsPangaea(numPlayers, plotTypes1D, terrain1D, features1D,
                              bonuses1D, rivers1D, lakes1D, W, H, rng) {
  const { areaId: biggestAreaId, areas } = findBiggestLandArea(plotTypes1D, W, H, true);

  // Use StartingPlots but filter candidates to biggest area
  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: 0,
    wrapX: true, wrapY: false
  });

  // Score all tiles
  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  // Build candidate list filtered to biggest area
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      if (areas[idx] !== biggestAreaId) continue;  // ← biggest area only
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  // Multi-pass assignment with relaxing distance (same as StartingPlots)
  const baseRange = sp._startingPlotRange(numPlayers);
  let minDist = baseRange;
  const starts = [];

  for (let pass = 0; pass < 50 && starts.length < numPlayers; pass++) {
    for (const candidate of candidates) {
      if (starts.length >= numPlayers) break;
      if (starts.some(s => s.x === candidate.x && s.y === candidate.y)) continue;

      let tooClose = false;
      for (const existing of starts) {
        const dist = sp._wrappedDistance(candidate.x, candidate.y, existing.x, existing.y);
        if (dist < minDist) { tooClose = true; break; }
      }

      if (!tooClose) {
        starts.push({ x: candidate.x, y: candidate.y });
      }
    }
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}
```

---

## 8. Shared Helper: `buildMapResult()`

Place this in a shared location (e.g., `src/game/mapgen/scripts/_helpers.js`) or inline in each script:

```javascript
function buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts) {
  const to2D = (arr) => Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => arr[y * W + x])
  );

  return {
    width: W,
    height: H,
    seed: settings.seed,
    settings,
    plots: to2D(plotTypes1D),
    terrain: to2D(terrain1D),
    features: to2D(features1D),
    resources: to2D(bonuses1D),
    rivers: to2D(rivers1D),
    lakes: to2D(lakes1D),
    startingLocations: starts,
    // Helper methods for backward compatibility
    getTile(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return null;
      return {
        plot: this.plots[y][wx],
        terrain: this.terrain[y][wx],
        feature: this.features[y][wx],
        resource: this.resources[y][wx],
        river: this.rivers[y][wx],
        isLake: this.lakes[y][wx]
      };
    },
    getElevation(x, y) {
      const wx = ((x % W) + W) % W;
      if (y < 0 || y >= H) return 'FLAT';
      const p = this.plots[y][wx];
      if (p === PLOT.PEAK) return 'PEAKS';
      if (p === PLOT.HILLS) return 'HILLS';
      return 'FLAT';
    }
  };
}
```

---

## 9. File Structure

```
src/game/mapgen/scripts/
  _helpers.js            — Shared helpers (resolveGridSize, resolveSeaLevelChange,
                            resolveClimateSettings, buildMapResult,
                            findBiggestLandArea, removeCoastalPeaks, etc.)
  continents.js          — Continents script export
  fractal.js             — Fractal script export
  archipelago.js         — Archipelago script export (with regional starts)
  pangaea.js             — Pangaea script export (with multilayered/hinted variants)
```

---

## 10. Differences from Existing `mapGenerator.js`

| Aspect | Old `mapGenerator.js` | New Map Scripts |
|--------|----------------------|-----------------|
| Map type handling | Single function with param tweaks | Separate script modules with distinct algorithms |
| Pangaea | Simple grain=1 fractal | 5 sub-algorithms (Soren's/Andy's hinted, 3 multilayered types) |
| Pangaea cohesion | Not implemented | Fractal repair if biggest area < 80-90% |
| Archipelago peaks | Not implemented | Extra peaks + coastal peak removal |
| Archipelago starts | Default greedy | Region-based scoring system |
| Pangaea starts | Default greedy | Biggest-area constraint |
| Grid sizes | Same for all types | Pangaea uses reduced grid (one level down) |
| Custom options | Not supported | Per-script custom options (Shoreline, Landmass Type) |
| Fractal vs Continents | Different land % | Different: Fractal has no rift and uses water=78 |

---

## 11. Testing / Verification Criteria

### 11.1 Continents
1. Map has 2+ distinct landmasses separated by ocean
2. Land percentage ~25% (±5%)
3. Plot shift places widest ocean strip at map edge
4. All terrain types present in correct latitude bands
5. Starting locations spread across landmasses

### 11.2 Fractal
1. Map is unpredictable — no guaranteed continent separation
2. No vertical rift channel visible
3. Land percentage ~22% (±8%)
4. Sometimes produces Pangaea-like, sometimes continental layouts

### 11.3 Archipelago
1. Multiple islands of varying size
2. No coastal peaks (all peaks converted to hills)
3. Peak count is elevated inland (15-45% bonus)
4. Starting locations distributed across different island groups
5. `normalizeRemovePeaks` does NOT run

### 11.4 Pangaea
1. **All variants**: Single dominant landmass (80%+ of total land)
2. **Natural**: Main mass with 4-6 subcontinental appendages
3. **Pressed Equatorial**: Wide central landmass
4. **Pressed Polar**: Landmass shifted toward one pole
5. **Solid (Soren's)**: Compact mass with coastal bays
6. **Solid (Andy's)**: Organic shape from continent growth
7. **Cohesion repair**: If biggest area < threshold, center fill connects land
8. **Starting plots**: All players on the biggest landmass
9. **Grid sizes**: Smaller than default (32×20 for Duel, 104×64 for Huge)

### 11.5 General (All Scripts)
1. `npm run lint` — clean
2. `npm run build` — clean
3. Each script's `generate()` returns valid map data matching the return contract
4. Coast tiles present between ocean and land
5. Rivers flow from highlands to water
6. Lakes appear in enclosed depressions
7. Features (ice, jungle, forest, oasis, floodplains) placed in correct biomes
8. Resources respect terrain/spacing constraints
9. Starting locations are on valid land tiles
10. Normalization passes run (fresh water, food, no peaks near starts)

---

## 12. Implementation Order

Implement in this order to build complexity incrementally:

1. **`_helpers.js`** — Shared utilities first
2. **`fractal.js`** — Simplest script, validates the pipeline end-to-end
3. **`continents.js`** — Adds rift, verifies continent separation
4. **`archipelago.js`** — Adds coastal peak removal, custom starts
5. **`pangaea.js`** — Most complex, implement sub-algorithms in this order:
   a. `generateSorensHinted()` (simplest Pangaea variant)
   b. `generateAndysHinted()` (continent growth)
   c. `generateMultilayered()` type 0 (Natural)
   d. Types 1 and 2 (Pressed variants)
   e. Cohesion repair
   f. `assignStartsPangaea()` (biggest-area constraint)
   g. Random option dispatch
