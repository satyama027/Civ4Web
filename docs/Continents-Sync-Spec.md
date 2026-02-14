# Continents.js Sync Spec — Align JS with Python Continents.py

## Objective

Align the JS `continents.js` map script and its supporting infrastructure (`_helpers.js`, `TerrainGenerator.js`, `index.js`) to exactly match the behavior of the original Civ4 `Continents.py` and the C++ engine defaults it relies on.

## Reference Files

| File | Role |
|------|------|
| `Civ4/PublicMaps/Continents.py` | Original Python map script |
| `Civ4/Assets/Python/CvMapGeneratorUtil.py` | FractalWorld, TerrainGenerator, FeatureGenerator classes |
| `Civ4/Assets/XML/GameInfo/CIV4ClimateInfo.xml` | Climate parameter values |
| `src/game/mapgen/scripts/continents.js` | JS port (target of changes) |
| `src/game/mapgen/scripts/_helpers.js` | Shared helper functions |
| `src/game/mapgen/TerrainGenerator.js` | JS TerrainGenerator class |
| `src/game/mapgen/index.js` | Orchestrator (default pipeline functions) |
| `src/game/mapgen/FractalWorld.js` | PLOT enum definition |

---

## Change 1: Remove `addCoastTiles` from Plot Generation

### Problem

In Civ4, there are only 4 plot types: `PLOT_OCEAN (0)`, `PLOT_LAND (1)`, `PLOT_HILLS (2)`, `PLOT_PEAK (3)`. There is no `PLOT_COAST`. Coast is a **terrain type** (`TERRAIN_COAST`), not a plot type. The distinction between ocean and coast water tiles is handled entirely by the terrain generator, which assigns `TERRAIN_COAST` to ocean plots adjacent to land.

The JS codebase invented `PLOT.COAST = 1` and shifted `PLOT.LAND` to 2, `PLOT.HILLS` to 3, `PLOT.PEAK` to 4. It then calls `TerrainGenerator.addCoastTiles()` after plot generation to convert some `PLOT.OCEAN` tiles to `PLOT.COAST`. This is architecturally wrong — it conflates the plot layer with the terrain layer.

### Changes

#### 1a. Update `PLOT` enum in `FractalWorld.js`

```javascript
// Before:
export const PLOT = {
  OCEAN: 0,
  COAST: 1,
  LAND: 2,
  HILLS: 3,
  PEAK: 4
};

// After (matches Civ4 PlotTypes exactly):
export const PLOT = {
  OCEAN: 0,
  LAND: 1,
  HILLS: 2,
  PEAK: 3
};
```

#### 1b. Remove `addCoastTiles()` from `TerrainGenerator.js`

Delete the static `addCoastTiles()` method entirely.

#### 1c. Move coast detection to `TerrainGenerator.generateTerrain()`

The terrain generator already assigns `TERRAIN.OCEAN` to `PLOT.OCEAN` tiles. Update it so that `PLOT.OCEAN` tiles adjacent to land (cardinal directions) get `TERRAIN.COAST` instead of `TERRAIN.OCEAN`. This matches the Civ4 C++ engine behavior.

In `generateTerrain()`, change the water pre-population logic:

```javascript
// Before:
for (let i = 0; i < W * H; i++) {
  if (plotTypes[i] === PLOT.OCEAN) terrain[i] = TERRAIN.OCEAN;
  else if (plotTypes[i] === PLOT.COAST) terrain[i] = TERRAIN.COAST;
  else terrain[i] = null;
}

// After:
for (let i = 0; i < W * H; i++) {
  if (plotTypes[i] === PLOT.OCEAN) {
    // Check cardinal neighbors for land adjacency → coast
    const x = i % W;
    const y = Math.floor(i / W);
    let adjacentLand = false;
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let nx = x + dx, ny = y + dy;
      if (this.wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;
      if (this.wrapY) ny = ((ny % H) + H) % H;
      else if (ny < 0 || ny >= H) continue;
      const nPlot = plotTypes[ny * W + nx];
      if (nPlot === PLOT.LAND || nPlot === PLOT.HILLS || nPlot === PLOT.PEAK) {
        adjacentLand = true;
        break;
      }
    }
    terrain[i] = adjacentLand ? TERRAIN.COAST : TERRAIN.OCEAN;
  } else {
    terrain[i] = null;
  }
}
```

#### 1d. Remove all `addCoastTiles()` calls

Remove from:
- `continents.js` line 64
- `fractal.js` (equivalent call)
- `index.js` `defaultGeneratePlotTypes()` line 130
- All other map scripts that call it: `pangaea.js`, `archipelago.js`, `terra.js`, `inlandSea.js`, `lakes.js`, `oasis.js`, `iceAge.js`, `mirror.js`

#### 1e. Update all `PLOT.COAST` references across the codebase

Every file that checks `PLOT.COAST` must be updated. The general pattern is:

| Old Pattern | New Pattern | Rationale |
|-------------|-------------|-----------|
| `plot === PLOT.OCEAN \|\| plot === PLOT.COAST` | `plot === PLOT.OCEAN` | Only one water plot type now |
| `plot <= PLOT.COAST` (water check) | `plot === PLOT.OCEAN` | Same |
| `plot >= PLOT.LAND` (land check) | `plot >= PLOT.LAND` | Still works (LAND=1 now) |
| `plotTypes: [PLOT.COAST]` (BonusGenerator) | Use terrain check: `terrain === TERRAIN.COAST` | Resources that require coast water should check TERRAIN, not PLOT |

**Files requiring updates** (21 source files):
- `FractalWorld.js` — enum definition
- `TerrainGenerator.js` — remove static method, update generateTerrain
- `index.js` — `isWater` check, `getMapStats`, `defaultGeneratePlotTypes`
- `_helpers.js` — `findBiggestLandArea`, `removeCoastalPeaks`, `scoreCitySite`
- `BonusGenerator.js` — resource placement checks (most complex; see below)
- `RiverGenerator.js` — water adjacency checks
- `FeatureGenerator.js` — water tile checks
- `StartingPlots.js` — scoring and eligibility checks
- All 10 map scripts that reference `PLOT.COAST`

**BonusGenerator special handling**: Resources like Fish, Clam, Crab, Whale have `plotTypes: [PLOT.COAST]`. These need to check `TERRAIN.COAST` instead. The `BonusGenerator.canPlaceBonusAt()` method must be updated to accept a terrain array and check terrain type for water resources alongside plot type for land resources.

#### 1f. Update `getTile()` in `index.js`

```javascript
// Before:
isWater: plot <= PLOT.COAST,
isLand: plot >= PLOT.LAND,

// After:
isWater: plot === PLOT.OCEAN,
isLand: plot >= PLOT.LAND,
```

Also add a `isCoast` convenience field based on terrain:
```javascript
isCoast: terrain2D[y][wx] === TERRAIN.COAST,
```

---

## Change 2: Fix `resolveClimateSettings()` to Match CIV4ClimateInfo.xml

### Problem

The `_helpers.js` `resolveClimateSettings()` function has incorrect values that don't match the Civ4 XML data. The XML uses a **change-based** system (additive adjustments to base defaults), not absolute values.

**Current (wrong) values in `_helpers.js`:**
```javascript
tropical:  { hillRange: 8,  peakPercent: 5,  jungleLatitude: 0.40, randIceLatitude: 0.30 },
temperate: { hillRange: 9,  peakPercent: 4,  jungleLatitude: 0.15, randIceLatitude: 0.30 },
rocky:     { hillRange: 12, peakPercent: 7,  jungleLatitude: 0.05, randIceLatitude: 0.30 },
arid:      { hillRange: 7,  peakPercent: 3,  jungleLatitude: 0.00, randIceLatitude: 0.30 },
cold:      { hillRange: 9,  peakPercent: 4,  jungleLatitude: 0.00, randIceLatitude: 0.60 }
```

**Actual values from `CIV4ClimateInfo.xml`:**

| Climate | iHillRange | iPeakPercent | iJungleLatitude | fRandIceLatitude | fIceLatitude | iDesertPercentChange | fSnowLatitudeChange | fTundraLatitudeChange | fGrassLatitudeChange | fDesertBottomLatitudeChange | fDesertTopLatitudeChange |
|---------|-----------|-------------|----------------|-----------------|-------------|---------------------|--------------------|-----------------------|---------------------|---------------------------|-------------------------|
| Temperate | 5 | 25 | 5 | 0.25 | 0.95 | 0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Tropical | 5 | 25 | 2 | 0.20 | 0.95 | -10 | +0.1 | +0.1 | 0.0 | 0.0 | 0.0 |
| Arid | 5 | 25 | 6 | 0.20 | 0.95 | +20 | 0.0 | 0.0 | 0.0 | -0.1 | +0.1 |
| Rocky | 7 | 35 | 5 | 0.25 | 0.95 | 0 | -0.025 | -0.05 | 0.0 | 0.0 | -0.05 |
| Cold | 5 | 25 | 6 | 0.50 | 0.90 | -10 | -0.1 | -0.15 | 0.0 | 0.0 | -0.1 |

### Changes

#### 2a. Expand `resolveClimateSettings()` to include ALL climate parameters

Replace the function with one that returns all XML fields:

```javascript
export function resolveClimateSettings(climate) {
  const configs = {
    temperate: {
      iHillRange: 5,
      iPeakPercent: 25,
      iJungleLatitude: 5,
      fRandIceLatitude: 0.25,
      fIceLatitude: 0.95,
      iDesertPercentChange: 0,
      fSnowLatitudeChange: 0.0,
      fTundraLatitudeChange: 0.0,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0,
      fDesertTopLatitudeChange: 0.0
    },
    tropical: {
      iHillRange: 5,
      iPeakPercent: 25,
      iJungleLatitude: 2,
      fRandIceLatitude: 0.20,
      fIceLatitude: 0.95,
      iDesertPercentChange: -10,
      fSnowLatitudeChange: 0.1,
      fTundraLatitudeChange: 0.1,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0,
      fDesertTopLatitudeChange: 0.0
    },
    arid: {
      iHillRange: 5,
      iPeakPercent: 25,
      iJungleLatitude: 6,
      fRandIceLatitude: 0.20,
      fIceLatitude: 0.95,
      iDesertPercentChange: 20,
      fSnowLatitudeChange: 0.0,
      fTundraLatitudeChange: 0.0,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: -0.1,
      fDesertTopLatitudeChange: 0.1
    },
    rocky: {
      iHillRange: 7,
      iPeakPercent: 35,
      iJungleLatitude: 5,
      fRandIceLatitude: 0.25,
      fIceLatitude: 0.95,
      iDesertPercentChange: 0,
      fSnowLatitudeChange: -0.025,
      fTundraLatitudeChange: -0.05,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0,
      fDesertTopLatitudeChange: -0.05
    },
    cold: {
      iHillRange: 5,
      iPeakPercent: 25,
      iJungleLatitude: 6,
      fRandIceLatitude: 0.50,
      fIceLatitude: 0.90,
      iDesertPercentChange: -10,
      fSnowLatitudeChange: -0.1,
      fTundraLatitudeChange: -0.15,
      fGrassLatitudeChange: 0.0,
      fDesertBottomLatitudeChange: 0.0,
      fDesertTopLatitudeChange: -0.1
    }
  };
  return configs[climate] || configs.temperate;
}
```

#### 2b. Update all callers of `resolveClimateSettings()`

Every place that reads `hillRange`, `peakPercent`, `jungleLatitude`, `randIceLatitude` must be updated to use the new field names (`iHillRange`, `iPeakPercent`, `iJungleLatitude`, `fRandIceLatitude`).

**FractalWorld constructor calls** (in `continents.js`, `defaultGeneratePlotTypes()`, and all other scripts):
```javascript
// Before:
hillGroupOneRange: climateConfig.hillRange,
hillGroupTwoRange: climateConfig.hillRange,
peakPercent: climateConfig.peakPercent,

// After:
hillGroupOneRange: climateConfig.iHillRange,
hillGroupTwoRange: climateConfig.iHillRange,
peakPercent: climateConfig.iPeakPercent,
```

**FeatureGenerator calls** (in `defaultAddFeatures()` and scripts):
```javascript
// Before:
jungleLatitude: climateConfig.jungleLatitude,
randIceLatitude: climateConfig.randIceLatitude,

// After:
jungleLatitude: climateConfig.iJungleLatitude,
randIceLatitude: climateConfig.fRandIceLatitude,
iceLatitude: climateConfig.fIceLatitude,
```

---

## Change 3: Pass Climate Settings to `defaultGenerateTerrain()`

### Problem

The Python `TerrainGenerator.__init__()` applies 7 climate-dependent adjustments to latitude thresholds via the C++ engine. The JS `defaultGenerateTerrain()` in `index.js` does not pass any climate config to `TerrainGenerator`, so all terrain is generated with temperate defaults regardless of the selected climate.

### Changes

#### 3a. Update `defaultGenerateTerrain()` in `index.js`

```javascript
// Before:
function defaultGenerateTerrain(W, H, plotTypes, settings, rng, wrapX, wrapY) {
  const tg = new TerrainGenerator(W, H, { wrapX, wrapY, mapSize: settings.mapSize });
  return tg.generateTerrain(rng, plotTypes);
}

// After:
function defaultGenerateTerrain(W, H, plotTypes, settings, rng, wrapX, wrapY) {
  const climateConfig = resolveClimateSettings(settings.climate);

  // Apply climate adjustments to base terrain thresholds (matching Civ4 TerrainGenerator.__init__)
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
```

This exactly mirrors the Python pattern:
```python
iDesertPercent += self.gc.getClimateInfo(self.map.getClimate()).getDesertPercentChange()
fSnowLatitude += self.gc.getClimateInfo(self.map.getClimate()).getSnowLatitudeChange()
# ... etc, each clamped to [0, 1]
```

#### 3b. Update `defaultAddFeatures()` in `index.js`

Add `fIceLatitude` pass-through:

```javascript
// Before:
const fg = new FeatureGenerator(W, H, {
  jungleLatitude: climateConfig.jungleLatitude,
  randIceLatitude: climateConfig.randIceLatitude,
  mapSize: settings.mapSize,
  wrapX, wrapY
});

// After:
const fg = new FeatureGenerator(W, H, {
  jungleLatitude: climateConfig.iJungleLatitude,
  randIceLatitude: climateConfig.fRandIceLatitude,
  iceLatitude: climateConfig.fIceLatitude,
  mapSize: settings.mapSize,
  wrapX, wrapY
});
```

#### 3c. Add `iceLatitude` support to `FeatureGenerator`

The Python `FeatureGenerator.addIceAtPlot()` uses `fIceLatitude` (from the XML) as the base latitude threshold. The JS `FeatureGenerator` currently doesn't have this parameter.

Check the constructor and `addIceAtPlot()` to ensure `iceLatitude` is accepted and used consistently with the Python two-tier ice probability formula:

```python
# Python formula:
rand < 8 * (lat - (1.0 - (getRandIceLatitude() / 2.0)))   # tier 1
rand < 4 * (lat - (1.0 - getRandIceLatitude()))             # tier 2
```

---

## Change 4: Simplify `continents.js` to Match Python

### Problem

The JS `continents.js` is more verbose than needed — it explicitly passes parameters that are defaults, and it handles concerns (climate, sea level) that should be handled by the engine classes and orchestrator, not the script.

### Changes

Simplify `continents.js` to match the Python's minimal structure. The script should only override `generatePlotTypes` since that's the only function the Python script defines beyond defaults.

```javascript
import { FractalWorld } from '../FractalWorld.js';

export default {
  id: 'continents',
  name: 'Continents',
  description: 'Two to four large continents separated by ocean.',
  isAdvancedMap: false,
  customOptions: [],

  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  isBonusIgnoreLatitude() { return false; },
  startHumansOnSameTile() { return false; },
  minStartingDistanceModifier() { return 0; },

  generatePlotTypes(W, H, settings, rng) {
    const fw = new FractalWorld(W, H, settings);
    fw.initFractal(rng, { polar: true });
    return fw.generatePlotTypes(rng, { water_percent: 75 });
  }
};
```

This requires the FractalWorld constructor to resolve climate/seaLevel internally from `settings` (see Change 5).

**What's removed:**
- `resolveClimateSettings()` / `resolveSeaLevelChange()` imports — these are engine concerns
- `TerrainGenerator.addCoastTiles()` call — removed per Change 1
- Explicit `continent_grain: 2`, `rift_grain: 2`, `has_center_rift: true`, `invert_heights: false` — these are the Python defaults
- Explicit `grain_amount: 3`, `shift_plot_types: true` — these are the Python defaults

**What's kept:**
- `polar: true` — the Python script explicitly passes this (default is `false`)
- `water_percent: 75` — the Python script explicitly passes this (default is `78`)

**No `generateTerrain` or `addFeatures` overrides** — the Python script uses the default TerrainGenerator and FeatureGenerator, so the JS should too (via the orchestrator's `defaultGenerateTerrain` and `defaultAddFeatures`).

---

## Change 5: FractalWorld Should Resolve Climate/SeaLevel from Settings

### Problem

Currently each map script manually calls `resolveClimateSettings()` and `resolveSeaLevelChange()` and passes the results to the FractalWorld constructor. In the Python, `FractalWorld.__init__()` reads these values from the C++ engine automatically. The JS should do the same — the FractalWorld constructor should accept a `settings` object and resolve climate/seaLevel internally.

### Changes

#### 5a. Update `FractalWorld` constructor to accept `settings`

When a `settings` object (with `climate`, `seaLevel` keys) is passed, resolve climate and sea level internally:

```javascript
constructor(W, H, options = {}) {
  // If a full settings object is passed, resolve climate/seaLevel from it
  if (options.climate || options.seaLevel) {
    const climateConfig = resolveClimateSettings(options.climate || 'temperate');
    const seaLevelChange = resolveSeaLevelChange(options.seaLevel || 'medium');
    this.seaLevelChange = seaLevelChange;
    this.hillGroupOneRange = climateConfig.iHillRange;
    this.hillGroupTwoRange = climateConfig.iHillRange;
    this.peakPercent = climateConfig.iPeakPercent;
  } else {
    // Direct parameter passing (backward compat for scripts that set values manually)
    this.seaLevelChange = options.seaLevelChange ?? 0;
    this.hillGroupOneRange = options.hillGroupOneRange ?? 5;
    this.hillGroupTwoRange = options.hillGroupTwoRange ?? 5;
    this.peakPercent = options.peakPercent ?? 25;
  }
  // ... rest of constructor unchanged
}
```

Note the default values for `hillGroupOneRange` (5), `hillGroupTwoRange` (5), and `peakPercent` (25) now match temperate climate XML values, not the previous wrong values of 9, 9, and 4.

#### 5b. Update `defaultGeneratePlotTypes()` in `index.js`

```javascript
// Before:
function defaultGeneratePlotTypes(W, H, settings, rng, wrapX, wrapY) {
  const climateConfig = resolveClimateSettings(settings.climate);
  const seaLevelChange = resolveSeaLevelChange(settings.seaLevel);
  const fw = new FractalWorld(W, H, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX, wrapY
  });
  // ...
  TerrainGenerator.addCoastTiles(plotTypes, W, H, wrapX, wrapY);
  return plotTypes;
}

// After:
function defaultGeneratePlotTypes(W, H, settings, rng, wrapX, wrapY) {
  const fw = new FractalWorld(W, H, { ...settings, wrapX, wrapY });
  fw.initFractal(rng, { polar: true });
  return fw.generatePlotTypes(rng, { water_percent: 75 });
}
```

---

## Change 6: Verify FeatureGenerator `iceLatitude` Support

### Problem

The Python FeatureGenerator uses `fIceLatitude` from the XML in its `addIceAtPlot()` method. The current `_helpers.js` doesn't include this field, and the JS FeatureGenerator may not support it.

### Changes

#### 6a. Verify `FeatureGenerator` constructor accepts `iceLatitude`

Check that the constructor stores `settings.iceLatitude` and that `addIceAtPlot()` uses it in the two-tier probability formula matching the Python:

```python
# Python:
rand < 8 * (lat - (1.0 - (getRandIceLatitude() / 2.0)))
rand < 4 * (lat - (1.0 - getRandIceLatitude()))
```

If `iceLatitude` is not used in the current JS implementation, it needs to be added. The `fIceLatitude` field is NOT the same as `fRandIceLatitude` — it's a separate hard threshold for guaranteed ice.

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/game/mapgen/FractalWorld.js` | Remove `PLOT.COAST`, renumber enum, update constructor to resolve settings |
| `src/game/mapgen/TerrainGenerator.js` | Remove `addCoastTiles()`, add coast-as-terrain logic in `generateTerrain()` |
| `src/game/mapgen/scripts/_helpers.js` | Fix `resolveClimateSettings()` with correct XML values and all fields |
| `src/game/mapgen/scripts/continents.js` | Simplify to match Python minimal structure |
| `src/game/mapgen/index.js` | Pass climate to `defaultGenerateTerrain()`, remove `addCoastTiles` call, fix PLOT.COAST refs |
| `src/game/mapgen/FeatureGenerator.js` | Add `iceLatitude` support, update PLOT.COAST refs |
| `src/game/mapgen/BonusGenerator.js` | Change coast resource checks from PLOT to TERRAIN |
| `src/game/mapgen/RiverGenerator.js` | Update PLOT.COAST refs to PLOT.OCEAN |
| `src/game/mapgen/StartingPlots.js` | Update PLOT.COAST refs to PLOT.OCEAN |
| `src/game/mapgen/scripts/*.js` (all 10) | Remove `addCoastTiles()` calls, update PLOT.COAST refs, simplify FractalWorld construction where applicable |

## Execution Order

1. **Change 2** first — fix `resolveClimateSettings()` values (no breaking API change)
2. **Change 3** — pass climate to TerrainGenerator/FeatureGenerator (functional fix, no API break)
3. **Change 6** — verify/add `iceLatitude` support
4. **Change 5** — FractalWorld auto-resolves settings (internal refactor)
5. **Change 4** — simplify `continents.js` (depends on Change 5)
6. **Change 1** — remove PLOT.COAST (largest change, touches most files, do last)

## Testing

After each change, run `npm run build` to verify no compilation errors. Generate maps with all 5 climate types and verify:
- Terrain distribution changes with climate (more desert for arid, less for tropical/cold)
- Snow/tundra bands shift appropriately
- Coast tiles appear in the terrain layer (not the plot layer)
- Resources still spawn correctly on coast water tiles
- River generation still works (rivers end at water)
- Starting locations still generate on land
