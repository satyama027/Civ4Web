# Map Generation Rewrite: Civ4 BTS Exact Implementation Plan

## Progress Tracking

| Milestone | Status | Date Completed |
|-----------|--------|----------------|
| 1. CyFractal Engine | ✅ Complete | 2026-02-04 |
| 2. FractalWorld Class | ✅ Complete | 2026-02-04 |
| 3. HintedWorld Class | ⬚ Not Started | |
| 4. MultilayeredFractal Class | ⬚ Not Started | |
| 5. TerrainGenerator | ⬚ Not Started | |
| 6. FeatureGenerator | ⬚ Not Started | |
| 7. River Generation + Lakes | ⬚ Not Started | |
| 8. Bonus/Resource Placement | ⬚ Not Started | |
| 9. Starting Plots + Normalization | ⬚ Not Started | |
| 10. Core Map Scripts | ⬚ Not Started | |
| 11. Advanced Map Scripts | ⬚ Not Started | |
| 12. Integration + Backward Compatibility | ⬚ Not Started | |

## Table of Contents

1. [Gap Analysis](#1-gap-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Milestone 1: CyFractal Engine](#milestone-1-cyfractal-engine) ✅
4. [Milestone 2: FractalWorld Class](#milestone-2-fractalworld-class) ✅
5. [Milestone 3: HintedWorld Class](#milestone-3-hintedworld-class)
6. [Milestone 4: MultilayeredFractal Class](#milestone-4-multilayeredfractal-class)
7. [Milestone 5: TerrainGenerator](#milestone-5-terraingenerator)
8. [Milestone 6: FeatureGenerator](#milestone-6-featuregenerator)
9. [Milestone 7: River Generation + Lakes](#milestone-7-river-generation--lakes)
10. [Milestone 8: Bonus/Resource Placement](#milestone-8-bonusresource-placement)
11. [Milestone 9: Starting Plots + Normalization](#milestone-9-starting-plots--normalization)
12. [Milestone 10: Core Map Scripts](#milestone-10-core-map-scripts)
13. [Milestone 11: Advanced Map Scripts](#milestone-11-advanced-map-scripts)
14. [Milestone 12: Integration + Backward Compatibility](#milestone-12-integration--backward-compatibility)
15. [Reference Constants](#reference-constants)

---

## 1. Gap Analysis

The current `src/game/mapGenerator.js` (~1500 lines, single file) implements an approximation of Civ4 map generation. Here is what it gets right and what it misses:

### What Exists and Works

| Component | Status | Notes |
|-----------|--------|-------|
| Diamond-square fractal | Partial | Works but missing rift/hint/invert support |
| FRAC_POLAR | Yes | Attenuates heights toward poles |
| FRAC_CENTER_RIFT | Yes | Attenuates heights along vertical center |
| Three-fractal plot model | Yes | Continent + hills + peaks fractals |
| Two-band hills system | Yes | Bands at 25% and 75% percentile |
| Latitude-band terrain | Yes | Snow/tundra/grass/desert/plains bands |
| Desert/plains fractals | Yes | Fractal thresholds for terrain placement |
| Edge-based rivers | Yes | isNOfRiver/isWOfRiver representation |
| Fractal jungle/forest | Yes | Threshold-based placement |
| Resource placement | Partial | Fixed percentages, min spacing 3 |
| Starting locations | Partial | Single-pass greedy scorer |
| 10 map types | Partial | All use simple FractalWorld params |

### What Is Missing or Wrong

| Gap | Civ4 Reality | Current Code |
|-----|-------------|--------------|
| **HintedWorld** | Block-hint system for Pangaea/Balanced/Inland Sea/Team Battleground | Not implemented. Pangaea uses grain=1 fractal instead |
| **MultilayeredFractal** | Multi-region layering for Terra/Oasis/Pangaea(Multilayered)/Hub/Islands/Ring | Not implemented. Terra uses single fractal |
| **`fracInitRifts()`** | Rift fractal modulates continent fractal | Approximated with post-hoc attenuation |
| **`fracInitHints()`** | Block hints seed the fractal | Not implemented |
| **`FRAC_INVERT_HEIGHTS`** | Inverts fractal (for Lakes/Fantasy) | Not implemented |
| **`FRAC_WRAP_X/Y`** | Per-axis wrapping flags | Not implemented (always wraps X) |
| **`shiftPlotTypes()`** | Weighted strip scoring: center-peak weights + 30 land bonus | Simplified: just counts land in strip |
| **`addCoastTiles()`** | Ocean tiles adjacent to land become coast | Implemented but ordering may differ |
| **Mountain terrain** | iMountainTopPercent=75, iMountainBottomPercent=60 bands on peaks/hills | Missing — peaks use same terrain as flat tiles |
| **Ice dual-band** | `rand < 8*(lat - threshold1)` and `rand < 4*(lat - threshold2)` | Uses different formula |
| **Jungle latitude falloff** | `iJungleBottom + (iJungleTop - iJungleBottom) * jungleLatitude * lat` | Simpler cutoff |
| **Generic feature pass** | Checks all feature types via `getAppearanceProbability()` before specific placement | Missing |
| **`addLakes()`** | Converts enclosed 1-tile water to lake type | Missing |
| **River altitude system** | `getRiverAltitude()` based on plot type + terrain + features | Custom elevation tracing instead |
| **Start normalization** | 8 separate passes (river, peaks, lakes, features, terrain, food, extras) | None — single-pass greedy only |
| **Resource one-area rule** | If `isOneArea()`, all instances on same landmass | Missing |
| **Resource unique range** | No same bonus within `iUniqueRange` Manhattan distance | Uses flat minDist=3 for all |
| **Resource group range** | No same bonus class within `iGroupRange` | Missing |
| **Resource count formula** | `(numTiles * classRatio / numInClass) * sizeModifier` | Fixed percentages instead |
| **Per-script customization** | Each map script overrides generators with custom params | All types use same generator with param tweaks |
| **Map-type grid sizes** | Each script defines custom `getGridSize()` per world size | Uses single size table from gameOptions |
| **Goodies (tribal villages)** | `addGoodies()` places improvement huts | Not implemented |
| **Map wrapping config** | Per-script `getWrapX()`/`getWrapY()` overrides | Always wraps X, never Y |
| **Latitude range config** | Per-script `getTopLatitude()`/`getBottomLatitude()` | Always ±90 |

---

## 2. Target Architecture

Refactor the monolithic `mapGenerator.js` into modular files mirroring Civ4's Python class structure:

```
src/game/mapgen/
  index.js                  - generateMap() entry point, dispatches to map scripts
  utils.js                  - SeededRandom, create2DArray, clamp, lerp, cardinal_directions
  fractal.js                - CyFractal class (fracInit, fracInitRifts, fracInitHints, getHeight, getHeightFromPercent)
  FractalWorld.js           - FractalWorld class (generatePlotTypes, shiftPlotTypes, initFractal)
  HintedWorld.js            - HintedWorld(FractalWorld) class (block hints, continents)
  MultilayeredFractal.js    - MultilayeredFractal class (regional layering)
  TerrainGenerator.js       - TerrainGenerator class (latitude-band terrain assignment)
  FeatureGenerator.js       - FeatureGenerator class (ice, jungle, forest, oasis, floodplains)
  RiverGenerator.js         - addRivers() + addLakes()
  BonusGenerator.js         - addBonuses() with XML-style rules
  StartingPlots.js          - assignStartingPlots() + 8 normalization passes
  scripts/
    continents.js           - Continents.py port
    pangaea.js              - Pangaea.py port (HintedWorld + MultilayeredFractal)
    archipelago.js          - Archipelago.py port
    terra.js                - Terra.py port (MultilayeredFractal)
    fractal.js              - Fractal.py port
    inlandSea.js            - Inland_Sea.py port (HintedWorld + template starts)
    lakes.js                - Lakes.py port (inverted fractal)
    oasis.js                - Oasis.py port (MultilayeredFractal + custom terrain)
    iceAge.js               - Ice_Age.py port
    mirror.js               - Mirror.py port (half-map + mirroring)
```

The old `src/game/mapGenerator.js` becomes a thin re-export wrapper to maintain backward compatibility with `Game.jsx` and other consumers.

### Return Data Contract (unchanged)

```javascript
{
  width, height, seed, settings,
  plots: number[][],        // PLOT.OCEAN/COAST/LAND/HILLS/PEAK
  terrain: string[][],      // TERRAIN enum values
  features: string[][],     // FEATURE enum values (null if none)
  resources: string[][],    // Resource IDs (null if none)
  rivers: Object[][],       // { hasRiver, isNOfRiver, isWOfRiver, riverNSDirection, riverWEDirection }
  startingLocations: [{x, y}],
  getTile(x, y): Object,
  getElevation(x, y): string
}
```

---

## Milestone 1: CyFractal Engine

**File**: `src/game/mapgen/fractal.js`

### What to Build

A `CyFractal` class that exactly matches Civ4's fractal behavior. This is the foundation — every other class depends on it.

### API

```javascript
class CyFractal {
  constructor(fracXExp = 7, fracYExp = 6) // Internal resolution 2^exp

  // Initialize with diamond-square, apply flags
  fracInit(grain, rng, flags)

  // Initialize modulated by a rift fractal
  fracInitRifts(riftsFrac, has_center_rift, grain, rng, flags)

  // Initialize seeded by block hint data (for HintedWorld)
  fracInitHints(hintData, hintWidth, hintHeight, grain, rng, flags)

  // Lookup height at map coordinate (bilinear interpolation)
  getHeight(mapX, mapY)

  // Get the height value at a given percentile (0-100)
  getHeightFromPercent(percent)
}
```

### Flags

| Flag | Value | Effect |
|------|-------|--------|
| `FRAC_POLAR` | 1 | Multiply heights by `sin(PI * y / height)` — attenuates to 0 at top/bottom |
| `FRAC_CENTER_RIFT` | 2 | Multiply heights by distance-from-center factor along X axis (12% width rift zone, quadratic falloff) |
| `FRAC_INVERT_HEIGHTS` | 4 | Invert all heights: `maxHeight - height` |
| `FRAC_WRAP_X` | 8 | Wrap X coordinates in fractal generation (seamless horizontal tiling) |
| `FRAC_WRAP_Y` | 16 | Wrap Y coordinates in fractal generation (seamless vertical tiling) |

### Diamond-Square Algorithm Details

1. Internal grid size: `w = 2^(fracXExp - grain) + 1`, `h = 2^(fracYExp - grain) + 1`
   - Default fracXExp=7, fracYExp=6. So grain=2 gives `2^5+1 = 33` x `2^4+1 = 17`
2. Roughness factor: **0.55** (controls how rapidly variation decreases with scale)
3. Initialize corners with random values `[0, 1)`
4. Diamond step: average of 4 corners + random displacement
5. Square step: average of 4 diamond neighbors + random displacement
6. If `FRAC_WRAP_X`: left edge wraps to right edge during generation
7. If `FRAC_WRAP_Y`: top edge wraps to bottom edge
8. After generation, resample to map dimensions using bilinear interpolation
9. Apply flags (polar attenuation, rift, inversion) as post-processing

### `fracInitRifts()` Behavior

1. Generate a separate rift fractal at the given rift grain
2. If `has_center_rift`: the rift fractal has `FRAC_CENTER_RIFT` applied
3. The rift fractal modulates the continent fractal — where the rift fractal is low, continent heights are pulled down
4. Effect: creates a vertical channel of low height that separates landmasses

### `fracInitHints()` Behavior

1. Takes a block grid (e.g., 16x8) of hint values (0-255)
2. Values >= 192 indicate land, < 192 indicate water
3. The hint grid is upscaled and used to bias the fractal — high hint values raise the fractal, low values lower it
4. The fractal still has its own variation, so boundaries are organic rather than blocky

### `getHeightFromPercent(percent)` Algorithm

1. After fractal generation, sort all height values (or maintain a cumulative distribution)
2. Return the height value at the given percentile
3. Example: `getHeightFromPercent(75)` returns the height below which 75% of values fall
4. Implementation: build sorted array of all heights once, index by `floor(percent / 100 * length)`

### Verification

- Generate a fractal with grain=2, FRAC_POLAR. Verify heights are ~0 at top/bottom rows and maximal at center.
- Generate with FRAC_CENTER_RIFT. Verify a vertical band of low heights at map center.
- Generate with FRAC_INVERT_HEIGHTS. Verify highest areas become lowest.
- `getHeightFromPercent(50)` should return the median height.

---

## Milestone 2: FractalWorld Class

**File**: `src/game/mapgen/FractalWorld.js`

### What to Build

Direct port of `CvMapGeneratorUtil.FractalWorld`. This is the primary plot type generator used by Continents, Archipelago, Fractal, Lakes, Ice Age, and as the base class for HintedWorld.

### Constructor Parameters (Instance Variables)

```javascript
class FractalWorld {
  constructor(fracXExp = 7, fracYExp = 6) {
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.plotTypes = new Array(W * H).fill(PLOT.OCEAN);

    // Three CyFractal instances
    this.continentsFrac = new CyFractal(fracXExp, fracYExp);
    this.hillsFrac = new CyFractal(fracXExp, fracYExp);
    this.peaksFrac = new CyFractal(fracXExp, fracYExp);

    // Sea level from game settings
    this.seaLevelChange = seaLevelConfig.change;  // e.g., -5 for low, 0 for medium, +5 for high
    this.seaLevelMax = 100;
    this.seaLevelMin = 0;

    // Hills configuration (from climate XML)
    this.hillGroupOneBase = 25;
    this.hillGroupOneRange = climateConfig.hillRange;  // typically 9
    this.hillGroupTwoBase = 75;
    this.hillGroupTwoRange = climateConfig.hillRange;

    // Peaks (from climate XML)
    this.peakPercent = climateConfig.peakPercent;  // typically 4

    // Shift
    this.stripRadius = 15;
  }
}
```

### `initFractal(continent_grain=2, rift_grain=2, has_center_rift=true, invert_heights=false, polar=false)`

```
1. flags = map.getMapFractalFlags()  // base flags (FRAC_WRAP_X typically)
2. if invert_heights: flags |= FRAC_INVERT_HEIGHTS
3. if polar: flags |= FRAC_POLAR
4. if rift_grain >= 0:
     riftsFrac = new CyFractal()
     riftsFrac.fracInit(rift_grain, rng, flags)
     riftFlags = flags
     if has_center_rift: riftFlags |= FRAC_CENTER_RIFT
     continentsFrac.fracInitRifts(riftsFrac, has_center_rift, continent_grain, rng, riftFlags)
   else:
     continentsFrac.fracInit(continent_grain, rng, flags)
```

### `generatePlotTypes(water_percent=78, shift_plot_types=true, grain_amount=3)`

This is the core algorithm. Exact steps:

```
1. checkForOverrideDefaultUserInputVariances()  // no-op in base class
2. hillsFrac.fracInit(grain_amount, rng, flags)
3. peaksFrac.fracInit(grain_amount + 1, rng, flags)
4. water_percent += seaLevelChange
5. water_percent = clamp(water_percent, seaLevelMin, seaLevelMax)

6. Compute thresholds:
   iWaterThreshold = continentsFrac.getHeightFromPercent(water_percent)

   iHills1Bottom = hillsFrac.getHeightFromPercent(max(hillGroupOneBase - hillGroupOneRange, 0))
   iHills1Top    = hillsFrac.getHeightFromPercent(min(hillGroupOneBase + hillGroupOneRange, 100))
   iHills2Bottom = hillsFrac.getHeightFromPercent(max(hillGroupTwoBase - hillGroupTwoRange, 0))
   iHills2Top    = hillsFrac.getHeightFromPercent(min(hillGroupTwoBase + hillGroupTwoRange, 100))

   iPeakThreshold = peaksFrac.getHeightFromPercent(peakPercent)

7. For each tile (x, y):
   val = continentsFrac.getHeight(x, y)
   if val <= iWaterThreshold:
     plotTypes[y * W + x] = PLOT.OCEAN
   else:
     hillVal = hillsFrac.getHeight(x, y)
     if (hillVal >= iHills1Bottom && hillVal <= iHills1Top) ||
        (hillVal >= iHills2Bottom && hillVal <= iHills2Top):
       peakVal = peaksFrac.getHeight(x, y)
       if peakVal <= iPeakThreshold:
         plotTypes[y * W + x] = PLOT.PEAK
       else:
         plotTypes[y * W + x] = PLOT.HILLS
     else:
       plotTypes[y * W + x] = PLOT.LAND

8. if shift_plot_types: shiftPlotTypes()
9. return plotTypes
```

### `shiftPlotTypes()` Algorithm

```
1. bestShiftX = findBestSplitX(stripRadius)
2. bestShiftY = findBestSplitY(stripRadius)
3. shiftPlotTypesBy(bestShiftX, bestShiftY)
```

### `findBestSplitX(stripRadius)` — Exact Civ4 Algorithm

```
1. stripSize = 2 * stripRadius
2. if stripSize > iNumPlotsX: return 0
3. scores = array of iNumPlotsX zeros
4. weights = calcWeights(stripRadius)

5. For each column x in [0, iNumPlotsX):
   landCount = count of non-ocean tiles in this column
   if landCount > 0: landCount += 30    // <-- THE +30 BONUS for any land
   // Distribute this column's score across the strip centered on it
   For each offset i in [0, stripSize):
     targetCol = (x - stripRadius + i) % iNumPlotsX
     scores[targetCol] += landCount * weights[i]

6. return argmin(scores).index  // column with minimum score = best split point
```

### `calcWeights(stripRadius)` — Exact Civ4 Algorithm

```
stripSize = 2 * stripRadius
weights = array of stripSize values

For i in [0, stripSize):
  distFromEdge = min(i + 1, stripSize - i)
  landWeight = distFromEdge
  distFromCenter = abs(i - stripRadius)
  if distFromCenter <= 1:
    landWeight *= stripRadius
  if distFromCenter == 0:
    landWeight *= 2
  weights[i] = landWeight

return weights
```

This creates a weight curve that sharply peaks at the center of the strip. The effect: the algorithm finds where placing the strip center minimizes land, weighted so that land right at the center counts much more heavily.

### `findBestSplitY(stripRadius)` — Same algorithm but over rows

Same as `findBestSplitX` but iterates rows instead of columns.

### `shiftPlotTypesBy(xshift, yshift)`

```
newPlots = copy of plotTypes
For each (x, y):
  srcX = (x + xshift) % iNumPlotsX
  srcY = (y + yshift) % iNumPlotsY  // only if Y wraps, otherwise srcY = y + yshift clamped
  newPlots[y * W + x] = plotTypes[srcY * W + srcX]
plotTypes = newPlots
```

### Verification

- Generate with water_percent=75, grain=2, polar, rift. Count land tiles. Should be ~25% of total.
- Generate with shift_plot_types=true. Verify the widest ocean strip is at map edge.
- Hills should be ~18% of land tiles (two bands of ~9% each from hillRange=9).
- Peaks should be ~4% of hill tiles.

---

## Milestone 3: HintedWorld Class

**File**: `src/game/mapgen/HintedWorld.js`

### What to Build

Port of `CvMapGeneratorUtil.HintedWorld(FractalWorld)`. Used by Pangaea (Soren's method), Balanced, Inland Sea, Team Battleground (some modes), and Lakes (via inverted fractal).

### Constructor

```javascript
class HintedWorld extends FractalWorld {
  constructor(w = 16, h = 8, fracXExp = 7, fracYExp = 6) {
    super(fracXExp, fracYExp);
    this.w = w;  // block grid width
    this.h = h;  // block grid height
    this.plotsPerBlockX = Math.floor(this.iNumPlotsX / w);
    this.plotsPerBlockY = Math.floor(this.iNumPlotsY / h);
    this.data = new Array(w * h).fill(null);  // null = unassigned
    this.continents = [];
  }
}
```

### Key Methods

**`normalizeBlock(x, y)`**: Wraps block coordinates if map wraps (modular arithmetic).

**`setValue(x, y, val)` / `getValue(x, y)`**: Access `data[y * w + x]`.

**`blockToPlot(blockX, blockY)`**: Returns `(floor(blockX * plotsPerBlockX), floor(blockY * plotsPerBlockY))`.

**`isValid(x, y, continent = null)`**:
```
1. Must be in bounds (or wrappable)
2. If continent.maxradius > 0:
     Manhattan distance from continent center must be <= maxradius
3. Block must be null (unassigned)
4. All 8 neighbors must NOT have value >= 192 belonging to a different continent
```

**`addContinent(numBlocks, x = -1, y = -1, maxDist = -1, maxRadius = -1)`**:
```
1. If x == -1: pick random valid position
2. Create Continent object with center (x, y), targetNumBlocks, maxRadius
3. Set center block value = 192 + rng.nextInt(0, 63)
4. Add to continents list
```

**`expandContinentBy(continent, numBlocks)`**: Expands by finding valid adjacent blocks, setting value = `208 + rng.nextInt(0, 47)`.

**`buildAllContinents()`**: Round-robin expansion — each continent grows by 1 block per pass until all reach target size.

### Block Value Semantics

| Range | Meaning |
|-------|---------|
| `null` | Unassigned |
| `0 - 191` | Water/ocean |
| `192 - 255` | Land (higher = more land in fractal) |
| `192 - 255` (initial) | `192 + rand(0..63)` — continent center |
| `208 - 255` (expand) | `208 + rand(0..47)` — expanded continent blocks |

### `generatePlotTypes(water_percent = -1, shift_plot_types = false)`

```
1. Fill null entries with random(0..47)  (low values = water)
2. Call fracInitHints() with data array, w, h
3. If water_percent == -1:
     Auto-calculate: count blocks with value < 192 → percentage
4. Call parent FractalWorld.generatePlotTypes(water_percent, shift_plot_types)
```

### `shiftHintsToMap()` / `bestHintsSplitX/Y()`

Same algorithm as `shiftPlotTypes` but operates on the block grid. Counts blocks >= 192 as land.

### Nested Class: `Continent`

```javascript
class Continent {
  constructor(centerX, centerY, targetNumBlocks, maxRadius) {
    this.centerx = centerX;
    this.centery = centerY;
    this.targetNumBlocks = targetNumBlocks;
    this.maxradius = maxRadius;
    this.blocks = [[centerX, centerY]];
    this.rects = [];  // computed plot-space rectangles
  }

  containsPlot(x, y)    // point-in-rect test against all rects
  getCenterPlot()        // (plotsPerBlockX * (centerx + 0.5), plotsPerBlockY * (centery + 0.5))
  findStartingPlot(playerID)  // constrains to continent plots
}
```

### Verification

- Create `HintedWorld(8, 4)`. Set borders to 0, interior to 200+. Call `generatePlotTypes()`. Verify Pangaea-like single landmass.
- Create `HintedWorld(16, 8)`. Call `addContinent(33% blocks)`. Verify continent grows organically.

---

## Milestone 4: MultilayeredFractal Class

**File**: `src/game/mapgen/MultilayeredFractal.js`

### What to Build

Port of `CvMapGeneratorUtil.MultilayeredFractal`. Used by Terra, Pangaea (multilayered variant), Oasis, Hub, Islands, Ring, Wheel, Custom Continents.

### Constructor

```javascript
class MultilayeredFractal {
  constructor(fracXExp = 7, fracYExp = 6) {
    this.fracXExp = fracXExp;
    this.fracYExp = fracYExp;
    this.iNumPlotsX = mapWidth;
    this.iNumPlotsY = mapHeight;
    this.wholeworldPlotTypes = new Array(W * H).fill(PLOT.OCEAN);

    this.iHorzFlags = FRAC_WRAP_X | FRAC_POLAR;
    this.iVertFlags = FRAC_WRAP_Y | FRAC_POLAR;
    this.iRoundFlags = FRAC_POLAR;

    // Hills config (same as FractalWorld)
    this.hillGroupOneBase = 25;
    this.hillGroupOneRange = climateConfig.hillRange;
    this.hillGroupTwoBase = 75;
    this.hillGroupTwoRange = climateConfig.hillRange;
    this.peakPercent = climateConfig.peakPercent;
  }
}
```

### `generatePlotsInRegion(params)` — 16 Parameters

```javascript
generatePlotsInRegion({
  iWaterPercent,         // Water % for this region
  iRegionWidth,          // Region width in plots
  iRegionHeight,         // Region height in plots
  iRegionWestX,          // SW corner X
  iRegionSouthY,         // SW corner Y
  iRegionGrain,          // Continent fractal grain
  iRegionHillsGrain,     // Hills fractal grain
  iRegionPlotFlags,      // Fractal flags for continents
  iRegionTerrainFlags,   // Fractal flags for hills/peaks
  iRegionFracXExp = -1,  // Override fracXExp (-1 = use default)
  iRegionFracYExp = -1,  // Override fracYExp (-1 = use default)
  bShift = true,         // Whether to shift region plots
  iStrip = 15,           // Strip size for shifting
  rift_grain = -1,       // Rift grain (-1 = no rifts)
  has_center_rift = false,
  invert_heights = false
})
```

### Algorithm

```
1. Create regional array, all PLOT.OCEAN, size iRegionWidth * iRegionHeight
2. Resolve fracXExp/fracYExp (use defaults if -1)
3. Create 3 fractals: continents, hills (hillsGrain), peaks (hillsGrain + 1)
4. Init continents fractal:
   - If rift_grain >= 0: create riftsFrac, call fracInitRifts()
   - Else: fracInit(iRegionGrain, rng, iRegionPlotFlags)
5. Init hills/peaks fractals with iRegionTerrainFlags

6. Compute thresholds (same as FractalWorld):
   iWaterThreshold = continentsFrac.getHeightFromPercent(iWaterPercent)
   Hills bands: [25±range] and [75±range]
   iPeakThreshold = peaksFrac.getHeightFromPercent(peakPercent)

7. Assign regional plots (same 3-fractal logic as FractalWorld)

8. If bShift: shiftRegionPlots(regionalArray, iRegionWidth, iRegionHeight, iStrip)

9. LAYER onto global array:
   For each (rx, ry) in region:
     if regionalPlot != PLOT.OCEAN:
       globalX = (iRegionWestX + rx) % iNumPlotsX
       globalY = (iRegionSouthY + ry)  // no Y wrap usually
       wholeworldPlotTypes[globalY * W + globalX] = regionalPlot
   // KEY: ocean plots in region are SKIPPED — they don't erase existing land
```

### `shiftRegionPlots()`, `findBestRegionSplitX/Y()`, `calcWeights()`

Same algorithms as `FractalWorld.shiftPlotTypes()` but scoped to the regional array dimensions.

### `generatePlotsByRegion()`

Template method — must be overridden by each map script. Calls `generatePlotsInRegion()` for each region. Typical pattern:

```javascript
// Terra example:
generatePlotsByRegion() {
  // 1. Eurasia main (wide region, grain 2, rift)
  this.generatePlotsInRegion({ ... });
  // 2. Eurasia cohesion (inner region, grain 1)
  this.generatePlotsInRegion({ ... });
  // 3. North America
  this.generatePlotsInRegion({ ... });
  // ... 10+ more regions
}
```

### Typical Grain Table (by world size)

| World Size | archGrain | contGrain | gaeaGrain | eurasiaGrain |
|-----------|-----------|-----------|-----------|-------------|
| Duel/Tiny | 3 | 2 | 1 | 2 |
| Small/Standard/Large | 4 | 2 | 1 | 2 |
| Huge | 5 | 2 | 1 | 2 |

### Verification

- Create two overlapping regions. Region A is land. Region B overlaps partially. Verify: B's land overwrites A's ocean, but B's ocean does NOT erase A's land.

---

## Milestone 5: TerrainGenerator

**File**: `src/game/mapgen/TerrainGenerator.js`

### What to Build

Exact port of `CvMapGeneratorUtil.TerrainGenerator`. Assigns terrain types (grass/plains/desert/tundra/snow) based on latitude + fractal thresholds.

### Constructor Defaults

| Parameter | Default | Description |
|-----------|---------|-------------|
| `iDesertPercent` | **32** | % of fractal range allocated to desert |
| `iPlainsPercent` | **18** | % allocated to plains |
| `fSnowLatitude` | **0.7** | Latitude >= this → snow |
| `fTundraLatitude` | **0.6** | Latitude >= this → tundra |
| `fGrassLatitude` | **0.1** | Latitude < this → forced grass |
| `fDesertBottomLatitude` | **0.2** | Desert only above this latitude |
| `fDesertTopLatitude` | **0.5** | Desert only below this latitude |
| `grain_amount` | **4** | Base grain (adjusted by world size) |

### Computed Thresholds

```
iDesertBottomPercent = max(0, 100 - iDesertPercent)         = 68
iPlainsBottomPercent = max(0, 100 - iDesertPercent - iPlainsPercent)  = 50
iMountainTopPercent = 75
iMountainBottomPercent = 60
```

### Fractals Created

```
desert fractal:    grain = grain_amount + worldSizeAdjust
plains fractal:    grain = grain_amount + 1 + worldSizeAdjust
variation fractal: grain = grain_amount + 1 + worldSizeAdjust  (for latitude jitter)
mountain fractal:  grain = grain_amount    (for mountain terrain override)
```

### `getLatitudeAtPlot(x, y)` — Exact Civ4 Algorithm

```javascript
// Distance from equator, normalized 0.0 to 1.0
lat = Math.abs((iNumPlotsY / 2) - y) / (iNumPlotsY / 2);

// Add variation from fractal: ±0.1 range
// variation fractal returns values 0-255
lat += (128 - variation.getHeight(x, y)) / (255.0 * 5.0);

// Clamp
lat = clamp(lat, 0.0, 1.0);

return lat;
```

The `(128 - height) / (255 * 5)` formula gives approximately ±0.1 variation. Height=0 → +0.1, Height=255 → -0.1, Height=128 → 0.

### `generateTerrainAtPlot(x, y)` — Exact Civ4 Algorithm

```javascript
// 1. Skip water tiles
if (isWater(x, y)) return currentTerrain;  // ocean/coast unchanged

// 2. Default
terrain = TERRAIN.GRASSLAND;

// 3. Latitude check
lat = getLatitudeAtPlot(x, y);

if (lat >= fSnowLatitude) {           // >= 0.7
  terrain = TERRAIN.SNOW;
} else if (lat >= fTundraLatitude) {   // >= 0.6
  terrain = TERRAIN.TUNDRA;
} else if (lat < fGrassLatitude) {     // < 0.1
  terrain = TERRAIN.GRASSLAND;        // forced grass near equator
} else {
  // 4. Desert/plains fractal zone (0.1 to 0.6)
  desertVal = desertFrac.getHeight(x, y);
  plainsVal = plainsFrac.getHeight(x, y);

  if (desertVal >= iDesertBottomPercent_height &&   // top 32%
      lat >= fDesertBottomLatitude &&                 // >= 0.2
      lat < fDesertTopLatitude) {                     // < 0.5
    terrain = TERRAIN.DESERT;
  } else if (plainsVal >= iPlainsBottomPercent_height) {  // top 50%
    terrain = TERRAIN.PLAINS;
  }
  // else: stays GRASSLAND
}

// 5. Mountain terrain override (for peaks and high hills)
mountainVal = mountainFrac.getHeight(x, y);
if (isHills(x, y) || isPeak(x, y)) {
  mountainHeight = mountainFrac.getHeightFromPercent(iMountainTopPercent);  // 75th percentile
  mountainBottom = mountainFrac.getHeightFromPercent(iMountainBottomPercent);  // 60th percentile
  if (mountainVal >= mountainBottom && mountainVal <= mountainHeight) {
    // Mountains in this fractal band get snow if at tundra+ latitude
    if (lat >= fTundraLatitude) {
      terrain = TERRAIN.SNOW;
    }
  }
}

return terrain;
```

**Note**: The mountain terrain override is often missed. In Civ4, some hills/peaks at tundra latitudes get forced to snow based on a separate mountain fractal.

### Per-Script Overrides

Several scripts override the terrain generator:

| Script | Changes |
|--------|---------|
| Inland Sea | Latitude compressed: `lat = 0.07 + 0.56 * lat` → range [0.07, 0.63]. No snow/ice. |
| Ice Age | iDesertPercent=20, iPlainsPercent=50, fSnowLatitude=0.4, fTundraLatitude=0.3, fDesertBottom=0.1, fDesertTop=0.2. Latitude × 0.6. |
| Oasis | Custom 4-zone bands: oasis zone (0.3-0.69) is 9% grass, 16% plains, rest desert |
| Hub/Ring | 2-zone: center=ice/tundra/plains, outer=desert/plains/grass |
| Great Plains | Uses X/Width as latitude (east-west = climate) |
| Fantasy Realm | No latitude at all — fractal bands only |
| Balanced | Latitude compressed: `lat = 0.05 + 0.75 * lat` → [0.05, 0.75] |
| Tilted Axis | Latitude = X axis: `lat = abs((W/2) - x) / (W/2)` |

Each script that overrides terrain should subclass `TerrainGenerator` and override `getLatitudeAtPlot()` and/or `generateTerrainAtPlot()`.

### Verification

- Generate terrain on Continents map. Check latitude bands:
  - y=0 and y=max should be mostly snow
  - y=~25% from center should be tundra
  - Equatorial should be grassland
  - Desert should appear in band between 20% and 50% latitude
- Count terrain types: ~32% of non-water land should be desert-eligible, ~18% plains.

---

## Milestone 6: FeatureGenerator

**File**: `src/game/mapgen/FeatureGenerator.js`

### What to Build

Exact port of `CvMapGeneratorUtil.FeatureGenerator`.

### Constructor Defaults

| Parameter | Default |
|-----------|---------|
| `iJunglePercent` | **80** |
| `iForestPercent` | **60** |
| `jungle_grain` | **5** |
| `forest_grain` | **6** |

### Fractals Created

```
jungle fractal:  grain = jungle_grain + worldSizeAdjust
forest fractal:  grain = forest_grain + worldSizeAdjust
```

### `addFeaturesAtPlot(x, y)` — Exact Order

```
1. GENERIC FEATURES: For every feature type defined in XML:
     roll = rng.nextInt(0, 9999)
     if roll < feature.getAppearanceProbability():
       if plot.canHaveFeature(featureType):
         set feature
         return
   (We skip this for now — no custom XML features in web version)

2. ICE: addIceAtPlot(x, y, lat)

3. JUNGLE: addJunglesAtPlot(x, y, lat)

4. FOREST: addForestsAtPlot(x, y, lat)
```

### `addIceAtPlot(x, y, lat)` — Exact Civ4 Algorithm

```javascript
if (plot is water) {
  // Edge rows: always ice
  if (y === 0 || y === iNumPlotsY - 1) {
    setFeature(FEATURE.ICE);
    return;
  }

  // Dense ice band
  // randIceLatitude is generated once: rng.nextFloat(0, 0.2) approximately
  rand = rng.next();  // [0, 1)
  if (rand < 8.0 * (lat - (1.0 - randIceLatitude / 2.0))) {
    setFeature(FEATURE.ICE);
    return;
  }

  // Sparse ice band
  rand = rng.next();
  if (rand < 4.0 * (lat - (1.0 - randIceLatitude))) {
    setFeature(FEATURE.ICE);
    return;
  }
}
```

### `addJunglesAtPlot(x, y, lat)` — Exact Civ4 Algorithm

```javascript
if (plot is not land/hills) return;  // no jungle on water/peaks
if (terrain is not grassland) return;  // jungle only on grass

// Jungle fractal threshold rises with latitude (less jungle farther from equator)
// iJungleTop = jungleFrac.getHeightFromPercent(iJunglePercent)  // 80th percentile
// iJungleBottom = jungleFrac.getHeightFromPercent(0)  // minimum
// jungleLatitude = some threshold (typically around 0.3-0.4)

adjustedBottom = iJungleBottom + (iJungleTop - iJungleBottom) * jungleLatitude * lat;

jungleHeight = jungleFrac.getHeight(x, y);
if (jungleHeight >= adjustedBottom && jungleHeight <= iJungleTop) {
  setFeature(FEATURE.JUNGLE);
}
```

The `jungleLatitude * lat` term means: at lat=0 (equator), adjustedBottom = iJungleBottom (maximum jungle). At high lat, adjustedBottom approaches iJungleTop (no jungle).

### `addForestsAtPlot(x, y, lat)` — Exact Civ4 Algorithm

```javascript
if (plot is not land/hills) return;
if (terrain is desert || terrain is ocean || terrain is coast) return;
if (feature is not null) return;  // already has a feature

iForestLevel = forestFrac.getHeightFromPercent(100 - iForestPercent);  // 40th percentile

if (forestFrac.getHeight(x, y) >= iForestLevel) {
  setFeature(FEATURE.FOREST);
}
```

No latitude dependency for forests — purely fractal threshold.

### Oasis Placement (in Civ4's C++ addFeatures)

```javascript
// On desert flat land, no adjacent water, no adjacent oasis
// Probability driven by XML (typically ~3-5%)
if (terrain === TERRAIN.DESERT && elevation === FLAT) {
  if (noAdjacentWater && noAdjacentOasis) {
    if (rng.next() < oasisProbability) {
      setFeature(FEATURE.OASIS);
    }
  }
}
```

### Floodplains Placement

```javascript
// Desert + flat + has river = floodplains
if (terrain === TERRAIN.DESERT && elevation === FLAT && hasRiver) {
  setFeature(FEATURE.FLOODPLAINS);
}
```

### Per-Script Overrides

| Script | Changes |
|--------|---------|
| Archipelago | Coastal peak removal before features: peaks adjacent to coast → hills |
| Ice Age | Jungle 30%, forest 50%, jungle_grain=7. Aggressive ice: multiple bands down to lat 0.27 |
| Fantasy Realm | Jungle 20%, forest 30%. Ice: 3/35 chance on any water. Snow floodplains allowed. |
| Balanced | Latitude compressed (0.05 + 0.75*lat) |

### Verification

- Count features on standard Continents map:
  - Ice should be at top/bottom rows and nearby water
  - Jungle should cluster near equator on grassland
  - Forest should be scattered on grass/plains/tundra
  - Oasis only on desert, no adjacent water
  - Floodplains only on desert with river

---

## Milestone 7: River Generation + Lakes

**File**: `src/game/mapgen/RiverGenerator.js`

### What to Build

Port of Civ4's C++ `CvMapGenerator::addRivers()` and `addLakes()`. The current code has a custom edge-based river system that works but doesn't match Civ4's altitude/direction model.

### `addRivers()` — Civ4 Algorithm

```
1. Build altitude map: getRiverAltitude(x, y) for every tile
2. Sort all tiles by altitude (highest first)
3. For each tile (highest to lowest):
   if tile already has river: skip
   if tile is water: skip
   direction = getRiverStartCardinalDirection(x, y)
   if direction is valid:
     doRiver(x, y, direction)
```

### `getRiverAltitude(x, y)` — From C++ CvPlot

```javascript
// Base altitude from plot type
if (isPeak)  altitude = 4;
else if (isHills) altitude = 3;
else if (isLand) altitude = 2;
else altitude = 1;  // water

// Terrain modifier
if (terrain is desert || terrain is snow) altitude += 1;

// Feature modifier
if (feature is jungle || feature is forest) altitude += 1;

// Multiply by large constant and add randomness
altitude = altitude * 10 + rng.nextInt(0, 9);

return altitude;
```

### `getRiverStartCardinalDirection(x, y)` — From C++ CvMapGenerator

```javascript
// Look at 4 cardinal neighbors. If any is lower altitude, river can start flowing that way.
// Preference: toward water > toward lower land
// If no valid direction: return null (no river starts here)
```

### `doRiver(x, y, direction)` — Edge-Based Flow

Rivers in Civ4 flow along tile edges, not through tiles. The representation:

- `isNOfRiver`: a river runs along the NORTH edge of tile (x, y) — i.e., between tile (x, y) and tile (x, y+1)
- `isWOfRiver`: a river runs along the WEST edge of tile (x, y) — i.e., between tile (x, y) and tile (x-1, y)
- `riverNSDirection`: for isNOfRiver, which way the river flows (EAST or WEST)
- `riverWEDirection`: for isWOfRiver, which way the river flows (NORTH or SOUTH)

The `doRiver` function traces from the starting tile, placing river edges, until reaching water or getting stuck.

### `addLakes()` — From C++ CvMapGenerator

```
1. Find all water tiles (PLOT.OCEAN) that are completely surrounded by land
   (all 8 neighbors are non-water)
2. Convert these to lake tiles
3. In our representation: keep PLOT.OCEAN but mark terrain as "lake" or keep as fresh water
```

In Civ4, lakes are 1-tile enclosed water bodies. The `addLakes()` pass specifically:
- Finds all single-tile ocean plots with no adjacent ocean
- Converts them to `PLOT_OCEAN` with lake area type
- This affects fresh water calculations (lakes provide fresh water to adjacent tiles)

### Verification

- Rivers should flow from peaks/hills downhill to ocean
- No rivers should start in water
- Lakes should appear in enclosed depressions
- River edges (isNOfRiver/isWOfRiver) should be consistent with flow direction

---

## Milestone 8: Bonus/Resource Placement

**File**: `src/game/mapgen/BonusGenerator.js`

### What to Build

Port of Civ4's `CvMapGenerator::addBonuses()` and per-bonus `addBonusType()`. The current code uses simplified fixed percentages; Civ4 uses XML-driven rules with sophisticated spacing.

### Civ4 Bonus XML Data Structure

Each bonus type has:

```javascript
{
  id: 'iron',
  bonusClass: 'BONUSCLASS_GENERAL',  // or BONUSCLASS_ANCIENT, BONUSCLASS_MODERN, etc.
  techReveal: 'iron_working',         // tech needed to see
  techCityTrade: null,
  isOneArea: true,                     // all instances on same landmass
  iGroupRange: 3,                      // min dist from same bonusClass
  iUniqueRange: 3,                     // min dist from same bonus
  terrainBooleans: { plains: true, ... },  // which terrains allowed
  featureBooleans: { forest: true, ... },  // which features allowed
  requiresFlatlands: false,
  requiresHills: true,
  peakAllowed: false,
  waterOnly: false,
  latitudeRange: [0, 90],             // latitude bounds
  player: { amount: 2, ... },         // count scaling
}
```

### `addBonuses()` — Main Loop

```
For each bonusType in bonusInfos (XML order):
  addBonusType(bonusType)
```

### `addBonusType(bonusType)` — Exact Civ4 Algorithm

```
1. Calculate count:
   numPossible = count tiles where canPlaceBonusAt(x, y, bonus) is true
   classRatio = bonusClassInfo.uniqueRange  // depends on class
   sizeModifier = max(0, (numPlayers * 3/2) + random(0, numPlayers/2))
   // Simplified: count = floor(numPossible * classRatio) + sizeModifier adjustments

2. If isOneArea:
   Find the landmass with most valid tiles for this bonus
   Restrict placement to that area

3. Placement loop (count times):
   Shuffle valid tile list
   For each candidate tile:
     if canPlaceBonusAt(x, y, bonus):
       place bonus
       break
```

### `canPlaceBonusAt(x, y, bonus)` — Validation

```
1. Tile already has a bonus? → false
2. Terrain matches? (terrainBooleans check)
3. Feature matches? (featureBooleans check)
4. Elevation: hills required? flatlands required? peak allowed?
5. Water: waterOnly matches plot type?
6. Latitude in range?
7. Unique range: no same bonus within iUniqueRange Manhattan distance
8. Group range: no same bonusClass within iGroupRange Manhattan distance
9. Adjacency preference: no other bonus in 8 adjacent tiles (soft constraint)
```

### Civ4 BTS Bonus Definitions (Complete List)

**Strategic Resources:**

| Bonus | Terrain | Elevation | Feature | UniqueRange | OneArea | Notes |
|-------|---------|-----------|---------|-------------|---------|-------|
| Aluminum | Hills | Hills | — | 3 | Yes | Requires Industrialism |
| Coal | Hills | Hills | — | 3 | Yes | Requires Steam Power |
| Copper | Hills | Hills | — | 3 | Yes | Requires Bronze Working |
| Horse | Plains, Grassland | Flat | — | 3 | Yes | Requires Animal Husbandry |
| Iron | Hills | Hills | — | 3 | Yes | Requires Iron Working |
| Marble | Plains, Grassland, Tundra | Flat/Hills | — | 3 | Yes | Requires Masonry |
| Oil | Desert, Tundra, Coast | Flat | — | 3 | Yes | Requires Combustion |
| Stone | Plains, Grassland, Tundra | Flat | — | 3 | No | Requires Masonry |
| Uranium | Plains, Desert, Tundra | Flat/Hills | Forest | 3 | Yes | Requires Physics |

**Luxury Resources:**

| Bonus | Terrain | Elevation | Feature | UniqueRange |
|-------|---------|-----------|---------|-------------|
| Dye | Grassland | Flat | Jungle | 5 |
| Fur | Tundra | Flat/Hills | Forest | 5 |
| Gems | Hills | Hills | Jungle | 5 |
| Gold | Hills | Hills | — | 5 |
| Incense | Desert | Flat | — | 5 |
| Ivory | Plains | Flat | — | 5 |
| Silk | Grassland | Flat | Forest | 5 |
| Silver | Hills, Tundra | Hills | — | 5 |
| Spices | Grassland | Flat | Jungle | 5 |
| Sugar | Grassland | Flat | Floodplains | 5 |
| Wine | Plains, Grassland | Flat/Hills | — | 5 |
| Whale | Coast | Water | — | 5 |

**Bonus (Food) Resources:**

| Bonus | Terrain | Elevation | Feature | UniqueRange |
|-------|---------|-----------|---------|-------------|
| Banana | Grassland | Flat | Jungle | 3 |
| Clam | Coast | Water | — | 3 |
| Corn | Plains, Grassland | Flat | — | 3 |
| Cow | Grassland | Flat | — | 3 |
| Crab | Coast | Water | — | 3 |
| Deer | Tundra | Flat/Hills | Forest | 3 |
| Fish | Coast | Water | — | 3 |
| Pig | Grassland | Flat | Forest | 3 |
| Rice | Grassland | Flat | — | 3 |
| Sheep | Plains, Grassland | Flat/Hills | — | 3 |
| Wheat | Plains | Flat | — | 3 |

### Verification

- Each resource should only appear on valid terrain
- No two of the same resource within `iUniqueRange` Manhattan distance
- `isOneArea` resources should all be on the same landmass
- Total resource counts should scale with map size and player count

---

## Milestone 9: Starting Plots + Normalization

**File**: `src/game/mapgen/StartingPlots.js`

### What to Build

Port of Civ4's starting plot assignment and the 8 normalization passes. This is critical for balanced gameplay.

### `assignStartingPlots()` — Default Algorithm

Civ4's C++ `CvMapGenerator::assignStartingPlots()`:

```
1. For each player:
   a. Call AI_updateFoundValues(true) — scores every tile for city value
      (We approximate this with a heuristic scorer — see below)
   b. Get startingPlotRange() — minimum distance from other starts
   c. Multi-pass loop:
      - Find tile with highest foundValue
      - Check no other player's start is within range (relaxes each pass)
      - Set as starting plot
```

### Heuristic City Value Scorer (our approximation)

Since we don't have Civ4's AI, we score tiles based on the BFC (big fat cross — 21 tiles within 2 radius):

```javascript
function scoreStartingPlot(x, y, mapData) {
  let score = 0;
  for each tile in radius 2 (21 tiles):
    // Food
    if (terrain === grassland) score += 3;
    if (terrain === plains) score += 2;
    if (terrain === desert) score -= 1;
    if (terrain === tundra) score -= 1;
    if (terrain === snow) score -= 3;

    // Production
    if (elevation === hills) score += 2;

    // Features
    if (feature === forest) score += 1;
    if (feature === jungle) score -= 1;  // before clearing

    // Resources
    if (resource !== null) score += 4;
    if (isStrategicResource) score += 2;

    // Fresh water
    if (hasRiver) score += 3;
    if (isLake) score += 2;

    // Coastal access
    if (isCoastal) score += 3;

  // Penalties
  if (!hasFreshWater) score -= 5;
  if (tileIsNotLand) score = -999;

  return score;
}
```

### `minStartingDistanceModifier()` — Per-Script Values

| Script | Modifier | Effect |
|--------|----------|--------|
| Default | 0 | Normal distance |
| Terra | -20 | Reduced (crowded Old World) |
| Inland Sea | -95 | Very reduced (small map) |
| Oasis | -35 | Reduced |
| Highlands | -35 | Reduced |
| Mirror | -65 | Reduced (half-map) |
| Hub | -95 | Very reduced (template) |
| Team Battleground | -65 | Reduced |
| Balanced | 0 | Default |
| Lakes | -15 | Slightly reduced |

### 8 Normalization Passes — Exact Civ4 Order

#### Pass 1: `normalizeStartingPlotLocations()`
Group team members closer together. Move starts toward teammates.

#### Pass 2: `normalizeAddRiver()`
If no river within 2 tiles of start, add one. Find the best tile for a new river and add river edges.

#### Pass 3: `normalizeRemovePeaks()`
Convert any peak within 2 tiles of start to hills.

#### Pass 4: `normalizeAddLakes()`
If start has no fresh water (no river, no lake within 2 tiles), convert a nearby flat land tile to lake.

#### Pass 5: `normalizeRemoveBadFeatures()`
Remove jungle within 2 tiles of start. (Jungle is bad early game — requires tech to clear.)

#### Pass 6: `normalizeRemoveBadTerrain()`
Convert desert/snow/tundra within 1 tile of start to plains or grassland.

#### Pass 7: `normalizeAddFoodBonuses()`
If insufficient food resources near start, add a food bonus (wheat, corn, rice, etc.) on a valid tile within 2 tiles.

#### Pass 8: `normalizeAddGoodTerrain()`
Improve terrain quality near start. Convert plains to grassland or add hills for production.

#### Pass 9: `normalizeAddExtras()`
Final adjustments — add extra resources if needed. The `Balanced.py` script overrides this to place strategic resources within 5 tiles of each start.

### Which Scripts Disable Which Normalizations

| Script | Disabled Passes |
|--------|----------------|
| Archipelago | normalizeRemovePeaks |
| Mirror | ALL normalizations |
| Highlands | normalizeRemovePeaks, normalizeRemoveBadTerrain, normalizeAddGoodTerrain |
| Oasis | ALL normalizations |
| Great Plains | ALL normalizations |
| Hub | (uses template starts, custom normalization) |

### Verification

- Every start should have at least one food resource within 2 tiles
- No peaks within 2 tiles of any start
- Fresh water (river or lake) accessible from every start
- No jungle within 2 tiles of start (unless normalization disabled)

---

## Milestone 10: Core Map Scripts

**Files**: `src/game/mapgen/scripts/continents.js`, `pangaea.js`, `archipelago.js`, `fractal.js`

### Continents.py — The Simplest Script

```javascript
// Parameters
polar = true
continent_grain = 2  // default
rift_grain = 2       // default
has_center_rift = true  // default
water_percent = 75

// Generation
fw = new FractalWorld()
fw.initFractal(continent_grain, rift_grain, has_center_rift, false, polar)
fw.generatePlotTypes(water_percent, true, 3)  // shift=true, hills_grain=3

// Terrain/Features: default TerrainGenerator(), default FeatureGenerator()
// Starting plots: default C++ (our approximation)
```

### Pangaea.py — Complex Multi-Algorithm Script

**Custom grid sizes (reduced by one level):**

| World Size | Grid |
|-----------|------|
| Duel | 8×5 |
| Tiny | 10×6 |
| Small | 13×8 |
| Standard | 16×10 |
| Large | 21×13 |
| Huge | 26×16 |

**Custom option — Shoreline (4 values):**
- **Random**: Weighted: 40% Natural, 10% Pressed Eq, 20% Pressed Polar, 20% Solid Irregular, 10% Solid Round
- **Natural**: PangaeaMultilayeredFractal type 0
- **Pressed**: PangaeaMultilayeredFractal type 1 or 2 (50/50 equatorial/polar)
- **Solid**: PangaeaHintedWorld (Soren's or Andy's, 50/50)

**Soren's Hinted Pangaea (`generateSorensHintedPangaea()`):**
```javascript
hw = new HintedWorld(8, 4)  // 8 wide, 4 tall blocks
// Set border blocks to 0 (ocean)
// Set interior blocks to 200 + rng.nextInt(0, 54)  (land)
// Set 4 random interior blocks to low values (bays)
// 50% chance of extra low cell on side
hw.generatePlotTypes()
```

**Andy's Hinted Pangaea (`generateAndysHintedPangaea()`):**
```javascript
hw = new HintedWorld(16, 8)
numBlocksLand = Math.floor(numBlocks * 0.33)  // 33% land
hw.addContinent(numBlocksLand, randomX, randomY)
hw.buildAllContinents()
// Cohesion check: biggest area >= 90% of total land
hw.generatePlotTypes(shift_plot_types=true)
```

**PangaeaMultilayeredFractal (3 types):**

All types use two passes for main landmass:
- Pass 1: `waterPercent=55+sea`, grain=2, strip=15, rift_grain=2
- Pass 2 (cohesion): inset 10% horiz / 25% vert, `waterPercent=60+sea`, grain=1

Plus 4-7 subcontinents with random shapes:
- Shape > 1 (60%): Regular — `water=55+sea`, grain=1
- Shape == 1 (20%): Irregular — `water=66+sea`, grain=2, rift=2
- Shape == 0 (20%): Archipelago — `water=77+sea`, grain=size-based

**Cohesion Repair** (if biggest area < 80% for Natural/Pressed or < 90% for Solid):
- Fill fractal in center region, grain=1, water=40%
- Only overwrites water with land — never removes existing land

**Starting plots**: All players on biggest land area. Team games require coastal access.

### Archipelago.py

**Custom option — Landmass Type:**
- Snaky Continents: continent_grain=3
- Archipelago: continent_grain=4 (default)
- Tiny Islands: continent_grain=5

All use `polar=true`, `rift_grain=-1` (no rift).

**`checkForOverrideDefaultUserInputVariances()`**:
```javascript
extraPeaks = 1 + customMapOption  // 1, 2, or 3
peakPercent += 15 * extraPeaks    // +15%, +30%, or +45%
```

**Coastal peak removal** (in `addFeatures()`):
Before feature placement, any peak that is coastal (adjacent to ocean/coast) → convert to hills.

**Custom regional start system:**
- Divide map into regions based on player count
- Score regions by resources, coastal access, food
- Assign worst regions first (best pick within)
- Players shuffled randomly

### Fractal.py — Simplest Possible

```javascript
fw = new FractalWorld()
fw.initFractal(/*defaults*/ rift_grain=-1, has_center_rift=false, polar=true)
fw.generatePlotTypes()  // default water_percent (78), shift=true
```

No customization. Completely random/unpredictable results.

### Verification

- **Continents**: Two or more landmasses separated by ocean. ~25% land.
- **Pangaea**: Single large landmass. Various shapes depending on algorithm.
- **Archipelago**: Many islands. More peaks than normal.
- **Fractal**: Random — sometimes Pangaea-like, sometimes continental.

---

## Milestone 11: Advanced Map Scripts

**Files**: `src/game/mapgen/scripts/terra.js`, `inlandSea.js`, `lakes.js`, `oasis.js`, `iceAge.js`, `mirror.js`

### Terra.py

**Grid sizes (enlarged — largest of any script):**

| World Size | Grid |
|-----------|------|
| Duel | 13×8 |
| Tiny | 16×10 |
| Small | 21×13 |
| Standard | 26×16 |
| Large | 32×20 |
| Huge | 38×24 |

**`minStartingDistanceModifier()` = -20**

Uses `MultilayeredFractal` with 12+ regions:

1. **Eurasia** (main): lon [0.45, 0.95], lat [0.45, 0.95], water=55+sea, grain=2, rift=2
2. **Eurasia** (cohesion): inset 10%/25%, water=60+sea, grain=1
3. **North America**: lat [0.52, 0.85], water=61+sea
4. **South America**: lat [0.25, 0.47], water=55+sea
5. **South America tip**: lat [0.18, 0.3], water=67+sea
6. **Yukon**: lat [0.75, 0.93], water=68+sea
7. **Arctic islands**: water=76+sea
8. **Central America**: water=60+sea
9. **Caribbean**: water=75+sea
10. **Africa** (large subcontinent): shape varies
11. **India** (small subcontinent): shape varies
12. **Australia/Antarctica** (2-4 minor regions): water=60-70+sea

**New World** is at lon [0.05, 0.35], **Old World** at [0.45, 0.95].

`roll1` (N/S flip) and `roll2` (E/W flip) — each 50% chance — randomize orientation.

**Starting plots**: ALL players start on biggest land area (Old World). New World is uninhabited at game start.

### Inland_Sea.py

**Map Properties:**
- `getWrapX() = false`, `getWrapY() = false` (unique — no wrapping at all)
- `getTopLatitude() = 60`, `getBottomLatitude() = -60`
- `minStartingDistanceModifier() = -95`

**Grid sizes (smaller):**

| World Size | Grid |
|-----------|------|
| Duel | 6×4 |
| Standard | 13×8 |
| Huge | 21×13 |

Uses `HintedWorld(4, 2)`:
- Border cells = `200 + rand(0..54)` (land)
- Interior cells = 0 (sea)
- Creates ring of land around central sea

**Custom terrain**: Latitude compressed `lat = 0.07 + 0.56 * lat` — no snow/ice, no pure tropical.

**Custom rivers**: Flow toward map center. `altitude = (|x - W/2| + |y - H/2|) * 20` (Manhattan from center).

**Template-based starting positions**: Exhaustive templates for 1-18 players, defining `[lat, lon, xVariance, yVariance]` per position. Up to 50 passes with relaxing constraints.

### Lakes.py

**Grid sizes (reduced):**

| World Size | Grid |
|-----------|------|
| Duel | 6×4 |
| Standard | 13×8 |
| Huge | 21×13 |

```javascript
fw = new LakesFractalWorld()
fw.initFractal(continent_grain=3, rift_grain=-1, has_center_rift=false, invert_heights=true)
fw.generatePlotTypes(water_percent=10)
// In generatePlotTypes override: water clamped to [7, 14]
// Rows y=0 and y=max forced to PLOT.OCEAN (polar ice)
```

**Key trick**: `invert_heights=true` inverts the fractal so what would be ocean basins become land plateaus, and what would be mountain ranges become lake chains.

`minStartingDistanceModifier() = -15`. All players on biggest area.

### Oasis.py

**Map Properties:**
- `getWrapX() = false`, `getWrapY() = false`
- `getTopLatitude() = 40`, `getBottomLatitude() = 0`
- No climate/sea level options
- `minStartingDistanceModifier() = -35`
- All normalizations disabled

Uses `MultilayeredFractal` starting with `wholeworldPlotTypes` initialized to **PLOT.LAND** (all land). Water regions are layered on top.

**Custom terrain (4 bands):**
- `> 0.69` lat: northern fertile (plains vs grass)
- `< 0.14` lat: forced grass (jungle zone)
- `0.14-0.30` lat: southern fertile (50% grass, 35% plains)
- `0.30-0.69` lat: oasis/desert zone (9% grass, 16% plains, rest desert)

**Nile-style rivers**: 4 rivers, one per quadrant. Direction: 60% north, 20% W, 20% E.

**Regional bonus placement**: Different resources for oasis zone vs north vs south.

### Ice_Age.py

**Grid sizes (extra wide, short):**

| World Size | Grid |
|-----------|------|
| Duel | 10×4 |
| Standard | 21×9 |
| Huge | 32×13 |

**Custom option — Landmass Type (5 values):**
Random (weighted D20), Wide Continents, Narrow Continents, Islands, Small Islands.

```javascript
fw = new IceAgeFractalWorld()
// seaLevelMax = 72, seaLevelMin = 60  (water locked 60-72%)
```

**Custom terrain**: iDesertPercent=20, iPlainsPercent=50, fSnowLatitude=0.4, fTundraLatitude=0.3, fDesertBottom=0.1, fDesertTop=0.2. Latitude multiplied by 0.6.

**Aggressive ice**: Ice extends much further from poles with multiple probability bands down to lat 0.27.

### Mirror.py

**Map Properties:**
- No wrap, `isAdvancedMap() = 1`, `isSeaLevelMap() = 0`
- `minStartingDistanceModifier() = -65`

**3 custom options:**

1. **Mirror Type**: Reflection `(W-x-1, y)`, Inversion `(W-x-1, H-y-1)`, Copy `(x+W/2, y)`, Opposite `(x+W/2, H-y-1)`
2. **Team Setting**: Together / Separated / Anywhere
3. **Landmass Type**: Small Lakes / Wide Continents / Snaky / Archipelago / Tiny Islands / Varied

**Multi-stage mirroring pipeline:**

| Stage | What Gets Mirrored |
|-------|--------------------|
| After `generatePlotTypes()` | Plot types (half → full) |
| After `generateTerrain()` | Terrain + rivers |
| After `addLakes()` | Lakes (with plot fixups) |
| After `addFeatures()` | Features + bonuses |
| After `addGoodies()` | Goodies (improvements) |

River direction corrections vary by mirror type:
- Reflection: reverses E/W
- Inversion: reverses both E/W and N/S
- Copy/Opposite: may need adjustments

**Starting plots**: Two-team special — one team on left/top, mirrored positions for other team. `isValidForMirror` constrains to x <= 40% (or 20% for 1v1).

All normalizations disabled.

### Verification

- **Terra**: Two distinct landmasses. Old World larger. All starts on Old World.
- **Inland Sea**: Ring of land with central water. No wrap.
- **Lakes**: Almost all land with small scattered lakes.
- **Oasis**: Desert-heavy center, fertile edges.
- **Ice Age**: Wide map, ice at edges, habitable center.
- **Mirror**: Symmetric map (verify with ASCII output).

---

## Milestone 12: Integration + Backward Compatibility

**Files**: `src/game/mapgen/index.js`, `src/game/mapGenerator.js` (wrapper)

### Entry Point

```javascript
// src/game/mapgen/index.js
export function generateMap(settings) {
  const { mapType, mapSize, climate, seaLevel, numPlayers, seed } = settings;
  const rng = new SeededRandom(seed || Date.now());

  // Get map script
  const script = getMapScript(mapType);

  // Execute generation pipeline (Civ4 order):
  // 1. getGridSize()
  // 2. generatePlotTypes() or generateRandomMap()
  // 3. generateTerrain()
  // 4. addRivers()
  // 5. addLakes()
  // 6. addFeatures()
  // 7. addBonuses()
  // 8. addGoodies()
  // 9. assignStartingPlots()
  // 10. Normalization passes

  return mapData;  // same structure as current
}
```

### Backward Compatibility

The old `src/game/mapGenerator.js` becomes:

```javascript
export { generateMap, TERRAIN, FEATURE, ELEVATION } from './mapgen/index.js';
export { mapToAscii, getMapStats } from './mapgen/utils.js';
// Re-export convenience functions
export { generatePangaea, generateContinents, ... } from './mapgen/index.js';
```

### Files to Modify

| File | Change |
|------|--------|
| `src/game/mapGenerator.js` | Replace with thin re-export wrapper |
| `src/pages/Game.jsx` | Verify import still works (should be unchanged) |
| `src/data/gameOptions.js` | May need new grid size tables per map script |
| `CLAUDE.md` | Update map generation documentation |

### Verification Checklist

- [ ] `npm run dev` — app starts, no console errors
- [ ] New Game → select each map type → Start Game → map renders
- [ ] Tile picking works (click tile, see info)
- [ ] Rivers display correctly (toggle river checkbox)
- [ ] Grid overlay works
- [ ] Features (trees) render
- [ ] `npm run build` — no build errors
- [ ] `npm run lint` — no new lint errors
- [ ] ASCII debug output (`mapToAscii`) produces sensible maps for each type

---

## Reference Constants

### Universal Numeric Constants

| Constant | Value | Source |
|----------|-------|--------|
| Default fracXExp | 7 | CyFractal |
| Default fracYExp | 6 | CyFractal |
| Default water_percent | 78 | FractalWorld |
| Continents water_percent | 75 | Continents.py |
| Hills band 1 center | 25 | FractalWorld |
| Hills band 2 center | 75 | FractalWorld |
| Default hill range | 9 | Climate XML (temperate) |
| Default peak percent | 4 | Climate XML (temperate) |
| Strip radius | 15 | FractalWorld |
| Land bonus in shift scoring | 30 | FractalWorld.findBestSplitX |
| HintedWorld land threshold | >= 192 | HintedWorld |
| HintedWorld center value | 192 + rand(0..63) | HintedWorld |
| HintedWorld expand value | 208 + rand(0..47) | HintedWorld |
| Default desert percent | 32 | TerrainGenerator |
| Default plains percent | 18 | TerrainGenerator |
| Snow latitude | >= 0.7 | TerrainGenerator |
| Tundra latitude | >= 0.6 | TerrainGenerator |
| Forced grass latitude | < 0.1 | TerrainGenerator |
| Desert latitude band | 0.2 to 0.5 | TerrainGenerator |
| Latitude variation | ±0.1 | TerrainGenerator |
| Mountain top percent | 75 | TerrainGenerator |
| Mountain bottom percent | 60 | TerrainGenerator |
| Terrain grain base | 4 | TerrainGenerator |
| Default jungle percent | 80 | FeatureGenerator |
| Default forest percent | 60 | FeatureGenerator |
| Jungle grain | 5 | FeatureGenerator |
| Forest grain | 6 | FeatureGenerator |
| Ice dense band multiplier | 8x | FeatureGenerator |
| Ice sparse band multiplier | 4x | FeatureGenerator |

### Grid Cell Size

`getGridSize()` returns grid cells. Each cell = **4×4 plots**. So a grid of (18, 12) = 72×48 plot tiles.

### Map Script Grid Sizes

All sizes listed in milestone 10 and 11 are in **grid cells** (multiply by 4 for plot dimensions).

### Reference Source Files

- `docs/Civ4-Map-Generation-Complete.md` — Complete Python source documentation
- `docs/CvMapScriptInterface-Analysis.md` — Interface contract analysis
- `src/game/mapGenerator.js` — Current implementation to be replaced
