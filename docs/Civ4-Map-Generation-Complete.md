# Civ4 BTS Map Generation - Complete Python Source Reference

Exhaustive documentation of every class, method, constant, threshold, formula, and algorithm in the Civilization IV: Beyond the Sword map generation Python source files.

**Source**: `Civ4/Assets/Python/` and `Civ4/PublicMaps/`

---

## Table of Contents

1. [CvMapScriptInterface.py](#1-cvmapscriptinterfacepy) — Interface contract
2. [CvMapGeneratorUtil.py](#2-cvmapgeneratorutilpy) — Core utility classes
3. [Continents.py](#3-continentspy) — Default map script
4. [Pangaea.py](#4-pangaeapy) — Single supercontinent
5. [Archipelago.py](#5-archipelagopy) — Island world
6. [Terra.py](#6-terrapy) — Old World / New World
7. [Fractal.py](#7-fractalpy) — Pure random fractal
8. [Inland_Sea.py](#8-inland_seapy) — Mediterranean-type
9. [Lakes.py](#9-lakespy) — Oceanless planet
10. [Oasis.py](#10-oasispy) — Desert between fertile bands
11. [Ice_Age.py](#11-ice_agepy) — Glaciation world
12. [Mirror.py](#12-mirrorpy) — Symmetrical team play
13. [Highlands.py](#13-highlandspy) — Mountainous regional
14. [Hub.py](#14-hubpy) — Spoke topology
15. [Islands.py](#15-islandspy) — Per-player islands
16. [Ring.py](#16-ringpy) — Closed ring topology
17. [Wheel.py](#17-wheelpy) — Ring + spokes
18. [Great_Plains.py](#18-great_plainspy) — North America regional
19. [Team_Battleground.py](#19-team_battlegroundpy) — Team placement
20. [Tilted_Axis.py](#20-tilted_axispy) — Vertical latitude
21. [Custom_Continents.py](#21-custom_continentspy)
22. [Fantasy_Realm.py](#22-fantasy_realmpy)
23. [Balanced.py](#23-balancedpy)
24. [Shuffle.py](#24-shufflepy)
25. [Maze.py](#25-mazepy)

---

## 1. CvMapScriptInterface.py

**File**: `Assets/Python/EntryPoints/CvMapScriptInterface.py`
**Authors**: aszybalski (2004), Bob Thomas "Sirian" (2005)
**Purpose**: Defines the complete interface (stub functions) that any Civ4 map script can override. The game engine calls these functions in a fixed order during map generation.

This is **not** an implementation — it's a contract. Every function either calls `CyPythonMgr().allowDefaultImpl()` to fall back to C++ engine defaults, or returns a trivial default value. Map scripts in `PublicMaps/` override whichever functions they need.

### Order of Operations

#### Phase 1: Game Properties (at launch)
- `getDescription()` — Display text in menu
- `isAdvancedMap()` — Whether script appears only in advanced menu
- `getModPath()` — Associated mod path

#### Phase 2: User Options (at script selection)
- `isClimateMap()` / `isSeaLevelMap()` — Whether to show climate/sea level dropdowns
- `getNumCustomMapOptions()` — Number of custom options
- `getCustomMapOptionName()` / `getCustomMapOptionDescAt()` / `getCustomMapOptionDefault()` — Option UI
- `isRandomCustomMapOption()` — Whether "Random" is offered for an option

#### Phase 3: Map Generation (at game launch)

Called in this exact order:

| # | Function | Notes |
|---|----------|-------|
| 1 | `beforeInit()` | Set up globals |
| 2 | `getGridSize(worldSize)` | Returns `(width, height)` in grid cells (each cell = 4x4 plots) |
| 3 | `getTopLatitude()` / `getBottomLatitude()` | Default 90 / -90. Affects bonus placement |
| 4 | `isBonusIgnoreLatitude()` | Default false |
| 5 | `getWrapX()` / `getWrapY()` | Must override both or neither. Default: X=true, Y=false |
| 6 | `beforeGeneration()` | Second init hook, after grid size is set |
| 7 | `generateRandomMap()` | **If overridden, skips steps 8-9** |
| 8 | `generatePlotTypes()` | Layer 1: Ocean/Land/Hills/Peak per plot |
| 9 | `generateTerrain()` | Layer 2: Terrain types (grass/plains/desert/etc.) |
| 10 | `addRivers()` | Layer 3. Sub-calls: `getRiverStartCardinalDirection()`, `getRiverAltitude()` |
| 11 | `addLakes()` | Layer 4 |
| 12 | `addFeatures()` | Layer 5: Forest, jungle, oasis, floodplains |
| 13 | `addBonuses()` | Layer 6. Sub-calls: `addBonusType()`, `canPlaceBonusAt()` |
| 14 | `addGoodies()` | Layer 7: Tribal villages (improvements) |
| 15 | `afterGeneration()` | Final map adjustments before starting plots |

#### Phase 4: Starting Plot Assignment

| # | Function | Notes |
|---|----------|-------|
| 16 | `minStartingDistanceModifier()` | Percentage modifier for min distance between starts |
| 17 | `assignStartingPlots()` | **If overridden, skips 18-19** |
| 18 | `findStartingPlot(playerID)` | Called once per civ. **If overridden, skips 19** |
| 19 | `findStartingArea(playerID)` | Returns areaID for player's continent |

#### Phase 5: Start Normalization

Called after all starting plots are placed, to balance starts:

1. `normalizeStartingPlotLocations()` — Groups team members together
2. `normalizeAddRiver()` — Ensures river near start
3. `normalizeRemovePeaks()` — Removes peaks near start
4. `normalizeAddLakes()` — Adds lakes near start
5. `normalizeRemoveBadFeatures()` — Removes jungle/etc. near start
6. `normalizeRemoveBadTerrain()` — Fixes bad terrain near start
7. `normalizeAddFoodBonuses()` — Ensures food resources near start
8. `normalizeAddGoodTerrain()` — Improves terrain near start
9. `normalizeAddExtras()` — Final resource/feature additions

Final: `startHumansOnSameTile()` — Default false

### Key Design Insights

1. **Layered generation**: Map data is built in 7 sequential layers. Each layer can be independently overridden.
2. **Grid cells vs plots**: `getGridSize()` returns grid cells where each cell = 4x4 plots. A grid of (18, 12) = 72x48 plot tiles.
3. **Cascade overrides**: `generateRandomMap()` can disable plot/terrain generation. `assignStartingPlots()` can disable `findStartingPlot()` which can disable `findStartingArea()`.
4. **Start normalization is aggressive**: 8 separate normalization passes ensure balanced starts.
5. **X-wrap by default**: Maps wrap horizontally (cylindrical) but not vertically.
6. **Most logic lives in C++**: The `allowDefaultImpl()` calls delegate to the C++ engine. Python scripts only override specific behaviors.

---

## 2. CvMapGeneratorUtil.py

**File**: `Assets/Python/CvMapGeneratorUtil.py`
**Copyright**: Firaxis Games 2005
**Author**: Bob Thomas (September 23, 2005)
**Imports**: `CvPythonExtensions`, `CvUtil`, `random`, `math.sqrt`, `sys`

### Module-Level Constants and Functions

#### `cardinal_directions`
**Value**: `((1,0), (0,1), (-1,0), (0,-1))` — E, N, W, S offsets.

#### `argmin(list)`
Returns `(best_index, best_value)` where `best_value` is the minimum.

#### `pointInRect(point, rect)`
Tests if `(x, y)` falls within rectangle `(rectx, recty, rectw, recth)`. Half-open range: `rectx <= x < rectx + rectw`.

#### `printMap(data, w, h, markerx, markery)`
Prints ASCII map. Non-zero = `X`, marker = `O`, zero/None = space. Rows top-to-bottom (reversed Y).

#### `getAreas()`
Returns list of all `CyArea` objects by iterating `map.getIndexAfterLastArea()`.

#### `findStartingPlot(playerID, validFn=None)`
1. Calls `player.AI_updateFoundValues(True)`
2. Gets `iRange = player.startingPlotRange()`
3. Multi-pass loop (`iPass` starts at 0, increments on failure):
   - For every tile, skips tiles failing `validFn(playerID, x, y)` if provided
   - Selects tile with highest `getFoundValue(playerID)`
   - Exclusion: `startingPlotWithinRange(pLoopPlot, playerID, iRange, iPass)` must be False for all other alive players
   - Returns `map.plotNum(x, y)` for best valid plot
   - On failure, increments `iPass` (relaxes range) and retries

---

### Class: `FractalWorld`

The primary class for fractal-based plot type generation.

#### `__init__(fracXExp, fracYExp)`

**Defaults**: `CyFractal.FracVals.DEFAULT_FRAC_X_EXP` and `DEFAULT_FRAC_Y_EXP` (typically 7 and 6, i.e. 128x64 matrix).

**Instance variables**:
- `iNumPlotsX`, `iNumPlotsY`: Map grid dimensions
- `mapRand`: Game's map random number generator
- `iFlags`: `map.getMapFractalFlags()`
- `plotTypes`: Array of `PlotTypes.PLOT_OCEAN`, size `W * H`
- `continentsFrac`, `hillsFrac`, `peaksFrac`: Three `CyFractal` instances
- `seaLevelChange`: From `gc.getSeaLevelInfo(map.getSeaLevel()).getSeaLevelChange()`
- `seaLevelMax`: **100**
- `seaLevelMin`: **0**
- `hillGroupOneRange`: From `gc.getClimateInfo(map.getClimate()).getHillRange()`
- `hillGroupOneBase`: **25**
- `hillGroupTwoRange`: Same as hillGroupOneRange
- `hillGroupTwoBase`: **75**
- `peakPercent`: From `gc.getClimateInfo(map.getClimate()).getPeakPercent()`
- `stripRadius`: **15**

#### `checkForOverrideDefaultUserInputVariances()`
No-op by default. Subclasses override to customize XML defaults.

#### `initFractal(continent_grain=2, rift_grain=2, has_center_rift=True, invert_heights=False, polar=False)`

- If `invert_heights`: adds `FRAC_INVERT_HEIGHTS` to flags
- If `polar`: adds `FRAC_POLAR` to flags
- If `rift_grain >= 0`: Creates `riftsFrac` with `rift_grain`, then if `has_center_rift` adds `FRAC_CENTER_RIFT`, calls `continentsFrac.fracInitRifts()`
- If `rift_grain < 0`: calls `continentsFrac.fracInit()` directly

#### `generatePlotTypes(water_percent=78, shift_plot_types=True, grain_amount=3)`

**The core plot generation algorithm:**

1. Calls `checkForOverrideDefaultUserInputVariances()`
2. Inits hills fractal with `grain_amount`, peaks fractal with `grain_amount + 1`
3. Adjusts `water_percent` by `seaLevelChange`, clamps to `[seaLevelMin, seaLevelMax]` = `[0, 100]`
4. Computes thresholds:
   - `iWaterThreshold` = height at `water_percent`%
   - Hills band 1: `[max(25 - range, 0), min(25 + range, 100)]`
   - Hills band 2: `[max(75 - range, 0), min(75 + range, 100)]`
   - `iPeakThreshold` = height at `peakPercent`%
5. For each tile `(x, y)`:
   - If `continentsFrac.getHeight(x,y) <= iWaterThreshold`: **OCEAN**
   - Else check `hillsFrac.getHeight(x,y)`:
     - If in hills band 1 OR hills band 2:
       - If `peaksFrac.getHeight(x,y) <= iPeakThreshold`: **PEAK**
       - Else: **HILLS**
     - Else: **LAND** (flat)
6. If `shift_plot_types`: calls `shiftPlotTypes()`

#### `shiftPlotTypes()`
Finds best horizontal split (if wrapX) and vertical split (if wrapY) using `stripRadius=15`, then shifts.

#### `shiftPlotTypesBy(xshift, yshift)`
Copies plot array, remaps each destination `(destX, destY)` from source `(destX+xshift, destY+yshift)` with modular wrapping.

#### `findBestSplitX(stripRadius)`
1. `stripSize = 2 * stripRadius`; if `stripSize > iNumPlotsX`, returns 0
2. For each column `x`, counts land plots (`landScore`). If any land found, adds **30** bonus
3. Distributes `landScore` weighted by `calcWeights()` across a strip centered at `x`
4. Returns column with **minimum** score (via `argmin`)

#### `findBestSplitY(stripRadius)`
Same algorithm but for rows.

#### `calcWeights(stripRadius)`
Weight formula for strip of size `2 * stripRadius`:
- `distFromEdge = min(i + 1, stripSize - i)`
- `landWeight = distFromEdge`
- If `distFromCenter <= 1`: `landWeight *= stripRadius`
- If `distFromCenter == 0`: `landWeight *= 2`

Creates a weight profile peaking sharply at center.

---

### Class: `HintedWorld(FractalWorld)`

Block-based continent placement.

#### `__init__(w=16, h=8, fracXExp, fracYExp)`
- Divides map into `w x h` blocks
- `plotsPerBlockX = iNumPlotsX / w`, `plotsPerBlockY = iNumPlotsY / h`
- `data`: array of `w * h` entries, initialized to `None`
- `continents`: empty list

#### `normalizeBlock(x, y)`
Wraps block coordinates modulo `w`/`h` if map wraps.

#### `setValue(x, y, val)` / `getValue(x, y)`
Get/set in block grid with normalization.

#### `blockToPlot(blockx, blocky)`
`(int(blockx * plotsPerBlockX), int(blocky * plotsPerBlockY))`

#### `isValid(x, y, cont=None)`
1. Must be in bounds
2. If `cont.maxradius > 0`: Manhattan distance from center must be `<= maxradius`
3. Block must be `None` (unassigned)
4. All 8 neighbors must not have value `>= 192` belonging to another continent

#### `findValid(x, y, dist=-1)`
Recursive search at increasing Manhattan distances. Shuffles candidates, returns first valid.

#### `addContinent(numBlocks, x=-1, y=-1, maxDist=-1, maxRadius=-1)`
Random position if not specified, finds valid via `findValid()`.

#### `__addContinentAt(numBlocks, x, y, maxradius=-1)`
Sets block value to `192 + random(0..63)` (land values **192-255**).

#### `expandContinentBy(cont, numBlocks)`
Grows continent by shuffling existing blocks and directions, finding valid adjacent blocks. New value: `208 + random(0..47)` (range **208-255**).

#### `buildAllContinents()`
Iterates all continents, expanding each by 1 block per pass until all done.

#### `shiftHintsToMap()` / `bestHintsSplitX()` / `bestHintsSplitY()`
Finds best split by counting land blocks (`>= 192`). Returns minimum score index.

#### `generatePlotTypes(water_percent=-1, shift_plot_types=False)`
1. Fills `None` entries with `random(0..47)` (low values = water)
2. Calls `__doInitFractal()` → `continentsFrac.fracInitHints()` with hint data
3. If `water_percent == -1`: auto-calculates (values `< 192` = water)
4. Calls parent `FractalWorld.generatePlotTypes()`

### Nested Class: `HintedWorld.Continent`

- `centerx`, `centery`: origin block
- `targetNumBlocks`, `maxradius`
- `blocks`: list of `[(x, y)]`
- `rects`: plot-space rectangles
- `containsPlot(x, y)`: checks if point within any rectangle
- `getCenterPlot()`: `(plotsPerBlockX * (centerx + 0.5), plotsPerBlockY * (centery + 0.5))`
- `findStartingPlot(playerID)`: constrains to plots within continent

---

### Class: `MultilayeredFractal`

Multiple fractal regions layered onto a single map.

#### `__init__(fracXExp, fracYExp)`
- `iHorzFlags`: `FRAC_WRAP_X + FRAC_POLAR`
- `iVertFlags`: `FRAC_WRAP_Y + FRAC_POLAR`
- `iRoundFlags`: `FRAC_POLAR`
- `wholeworldPlotTypes`: global array, all `PLOT_OCEAN` initially

#### `generatePlotsInRegion(...)`

**16 Parameters:**

| Parameter | Description |
|-----------|-------------|
| `iWaterPercent` | Water percentage for region |
| `iRegionWidth`, `iRegionHeight` | Region dimensions in plots |
| `iRegionWestX`, `iRegionSouthY` | Region origin (SW corner) |
| `iRegionGrain` | Continent fractal grain |
| `iRegionHillsGrain` | Hills fractal grain |
| `iRegionPlotFlags` | Fractal flags for continents |
| `iRegionTerrainFlags` | Fractal flags for hills/peaks |
| `iRegionFracXExp` (default -1) | Fractal X exponent |
| `iRegionFracYExp` (default -1) | Fractal Y exponent |
| `bShift` (default True) | Whether to shift region plots |
| `iStrip` (default 15) | Strip size for shifting |
| `rift_grain` (default -1) | Rift grain (-1 = no rifts) |
| `has_center_rift` (default False) | Center rift toggle |
| `invert_heights` (default False) | Invert fractal heights |

**Algorithm:**
1. Inits regional plot array as all `PLOT_OCEAN`
2. Creates three fractals: continents, hills (hillsGrain), peaks (hillsGrain + 1)
3. Hills: same dual-band system with bases **25** and **75**
4. Same plot assignment logic (ocean/peak/hills/land)
5. If `bShift`: calls `shiftRegionPlots()`
6. **Layering**: Only non-ocean plots written to global array. Ocean plots skipped.

#### `shiftRegionPlots`, `findBestRegionSplitX/Y`, `calcWeights`
Same logic as FractalWorld but for regional arrays. Same **30** bonus for first land.

#### `generatePlotsByRegion()`
Template method. Must be overridden. Example grain table:

| World Size | Grain values |
|-----------|-------------|
| Duel/Tiny/Small | (3, 2, 1, 2) |
| Standard/Large | (4, 2, 1, 2) |
| Huge | (5, 2, 1, 2) |

---

### Class: `TerrainGenerator`

#### `__init__(...)`

| Parameter | Default | Description |
|-----------|---------|-------------|
| `iDesertPercent` | **32** | % of land that is desert |
| `iPlainsPercent` | **18** | % of land that is plains |
| `fSnowLatitude` | **0.7** | Latitude threshold for snow |
| `fTundraLatitude` | **0.6** | Tundra threshold |
| `fGrassLatitude` | **0.1** | Below this = forced grass |
| `fDesertBottomLatitude` | **0.2** | Southern limit of desert band |
| `fDesertTopLatitude` | **0.5** | Northern limit of desert band |
| `grain_amount` | **4** | Base grain (adjusted by world size) |

**Computed thresholds:**
- `iDesertBottomPercent` = `max(0, 100 - 32)` = **68**
- `iPlainsBottomPercent` = `max(0, 100 - 32 - 18)` = **50**
- `iMountainTopPercent` = **75**, `iMountainBottomPercent` = **60**

#### `getLatitudeAtPlot(iX, iY)`
```
lat = abs((iHeight / 2) - iY) / float(iHeight / 2)
lat += (128 - variation.getHeight(iX, iY)) / (255.0 * 5.0)
lat = clamp(lat, 0.0, 1.0)
```
- Base: 0.0 at equator, 1.0 at poles
- Variation: approximately **±0.1**

#### `generateTerrainAtPlot(iX, iY)`

1. If water: no change
2. Default: **GRASS**
3. `lat >= 0.7`: **SNOW**
4. `lat >= 0.6`: **TUNDRA**
5. `lat < 0.1`: **GRASS** (forced near equator)
6. Else (0.1 to 0.6):
   - Desert fractal in range AND lat in [0.2, 0.5): **DESERT**
   - Plains fractal in range: **PLAINS**
   - Else: **GRASS**

---

### Class: `FeatureGenerator`

#### `__init__(...)`

| Parameter | Default |
|-----------|---------|
| `iJunglePercent` | **80** |
| `iForestPercent` | **60** |
| `jungle_grain` | **5** |
| `forest_grain` | **6** |

#### `addFeaturesAtPlot(iX, iY)` — Order of operations:
1. Generic features: For every feature type, roll `random(0..9999)` against `getAppearanceProbability()`
2. If no feature: try **ice**
3. If no feature: try **jungle**
4. If no feature: try **forest**

#### `addIceAtPlot(pPlot, iX, iY, lat)`
- Edge rows (y=0 or y=max): automatic ice
- Otherwise two-tier probability:
  - `rand < 8 * (lat - (1.0 - randIceLatitude / 2.0))`: dense band near poles
  - `rand < 4 * (lat - (1.0 - randIceLatitude))`: sparser band

#### `addJunglesAtPlot(pPlot, iX, iY, lat)`
- Bottom threshold rises with latitude: `iJungleBottom + (iJungleTop - iJungleBottom) * jungleLatitude * lat`
- Jungle rarer at higher latitudes

#### `addForestsAtPlot(pPlot, iX, iY, lat)`
- Simple threshold: `forests.getHeight(x,y) >= iForestLevel` (top 40% by default)
- No latitude dependency

---

### Key Numeric Constants Summary

| Constant | Value |
|----------|-------|
| Default water_percent | 78 |
| Default grain_amount (plots) | 3 |
| Hills band 1 center / band 2 center | 25 / 75 |
| Shift strip radius | 15 |
| Land bonus in shift scoring | 30 |
| HintedWorld land value range | 192-255 |
| HintedWorld expand value range | 208-255 |
| HintedWorld water threshold | < 192 |
| HintedWorld default blocks | 16 x 8 |
| Default desert / plains percent | 32% / 18% |
| Snow / tundra / grass latitude | >= 0.7 / >= 0.6 / < 0.1 |
| Desert latitude band | 0.2 to 0.5 |
| Terrain grain base | 4 |
| Latitude variation magnitude | ~±0.1 |
| Default jungle / forest percent | 80% / 60% |
| Jungle / forest grain | 5 / 6 |
| Ice dense/sparse band multiplier | 8x / 4x |

---

## 3. Continents.py

**Author**: Soren Johnson
**Purpose**: Civ4's default map script — the simplest script.

### Imports
`FractalWorld`, `TerrainGenerator`, `FeatureGenerator` from `CvMapGeneratorUtil`

### Interface Functions

- `getDescription()`: `"TXT_KEY_MAP_SCRIPT_CONTINENTS_DESCR"`
- `isAdvancedMap()`: `0` (shows in simple mode)

### `generatePlotTypes()`
- Creates default `FractalWorld()`
- `initFractal(polar=True)` — default continent_grain, default rift_grain, default has_center_rift (True)
- `generatePlotTypes(water_percent=75)`

| Parameter | Value |
|-----------|-------|
| `polar` | `True` |
| `continent_grain` | default |
| `rift_grain` | default |
| `has_center_rift` | default (True) |
| `water_percent` | **75** |

### Terrain & Features
Default `TerrainGenerator()` and `FeatureGenerator()`, no customization.

### Starting Plots
None overridden — uses C++ default.

---

## 4. Pangaea.py

**Author**: Bob Thomas (Sirian), with Soren Johnson and Andy Szybalski
**Purpose**: Pan-Earth SuperContinent

### Global Variables
- `isTeamGame`: true if `iPlayers >= iTeams * 2` or `iPlayers == 2`
- `pangaea_type`: 0=Natural, 1=Pressed Equatorial, 2=Pressed Polar

### Custom Map Options
1 option — **Shoreline** (4 values):
- `0`: Random (weighted: 40% Natural, 10% Pressed Eq, 20% Pressed Polar, 20% Solid Irregular, 10% Solid Round)
- `1`: Natural
- `2`: Pressed
- `3`: Solid

### Grid Sizes (reduced by one level)

| World Size | Grid |
|-----------|------|
| Duel | 8x5 |
| Tiny | 10x6 |
| Small | 13x8 |
| Standard | 16x10 |
| Large | 21x13 |
| Huge | 26x16 |

### Class: `PangaeaHintedWorld`

**`generateSorensHintedPangaea()`**:
- `HintedWorld(8, 4)` (8 wide, 4 tall)
- Border cells = `0` (ocean)
- Interior = `200 + random(0-54)` (land 200-254)
- 4 random interior cells set low (bays)
- 50% chance of extra low cell on side

**`generateAndysHintedPangaea()`**:
- `HintedWorld(16, 8)` (finer grid)
- `numBlocksLand = int(numBlocks * 0.33)` — 33% land
- Single continent with random placement
- Cohesion check: biggest area >= **90%** of total land

### Class: `PangaeaMultilayeredFractal`

**Grain by world size:**

| Duel/Tiny | Small/Standard/Large | Huge |
|-----------|---------------------|------|
| 3 | 4 | 5 |

**Sea Level**: Clamped to [-5, +5].

**Three pangaea types:**

**Type 0 (Natural):**
- Main region: lon [0.2, 0.8], lat [0.2, 0.8], shifted ±0.075 N/S
- `subcontinentDimension = 0.3`
- `numSubcontinents = 4 + random(0-2)`
- 8 subcontinent slot definitions

**Type 1 (Pressed Equatorial):**
- Main region: lon [0.2, 0.8], lat [0.2, 0.8] (no shift)
- `subcontinentDimension = 0.4`
- `numSubcontinents = 2-5` (biased toward 3)

**Type 2 (Pressed Polar):**
- Main region shifted ±0.175 N/S
- `subcontinentDimension = 0.4`
- `numSubcontinents = 3`

**Main landmass (two passes):**
- Pass 1: `waterPercent = 55+sea`, grain=2, strip=15, rift_grain=2
- Pass 2 (cohesion): inset 10% horiz / 25% vert, `waterPercent = 60+sea`, grain=1

**Subcontinents (shape roll 0-4):**
- Shape > 1 (60%): Regular — `water=55+sea`, grain=1, rift=-1
- Shape == 1 (20%): Irregular — `water=66+sea`, grain=2, rift=2
- Shape == 0 (20%): Archipelago — `water=77+sea`, grain=size-based, rift=-1

### Cohesion Repair (in `generateTerrainTypes()`)
If biggest land area < **80%** (Natural/Pressed) or < **90%** (Solid):
- Repair fractal in lon [0.3, 0.7], grain=1, hillsGrain=3, peaksFrac grain=4
- Water threshold: 40%, hills at [20-30%] and [70-80%], peaks at 25%
- Only overwrites water with land — never removes land

### `findStartingPlot()`
- All players on biggest land area
- Team games: must also be coastal (adjacent to non-lake water)

---

## 5. Archipelago.py

**Author**: Bob Thomas (Sirian), with Soren Johnson
**Purpose**: World full of random islands

### Custom Map Options
1 option — **Landmass Type** (3 values):
- `0`: Snaky Continents
- `1`: Archipelago (default)
- `2`: Tiny Islands

### Class: `ArchipelagoFractalWorld`

**`checkForOverrideDefaultUserInputVariances()`**:
- `extraPeaks = 1 + customMapOption(0)` (1-3)
- `peakPercent += 15 * extraPeaks` (+15%, +30%, or +45%)
- Clamped [0, 100] — counterbalances coastal peak removal later

| Type | continent_grain | rift_grain | has_center_rift |
|------|----------------|------------|-----------------|
| Snaky | 3 | -1 | False |
| Archipelago | 4 | -1 | False |
| Tiny Islands | 5 | -1 | False |

All use `polar=True`. Default `water_percent` (engine default ~66%).

### Coastal Peak Removal (in `addFeatures()`)
Before adding features: any peak that is coastal land → changed to hills.

### Custom Regional Start System (`assignStartingPlots()`)

**Region count by player count:**
- Tiny Islands: `[0, 3, 3, 3, 6, 6, 8, 8, 12, 12, 12, 15, 15, 15, 20, 20, 20, 20, 24]`
- Archipelago: `[0, 3, 3, 6, 6, 8, 8, 12, 12, 15, 15, 15, 20, 20, 20, 24, 24, 24, 24]`

**Min distances by region count:**

| Regions | minLon | minLat |
|---------|--------|--------|
| 3 | 0.1 | 0.2 |
| 6 | 0.1 | 0.125 |
| 8 | 0.07 | 0.125 |
| 12 | 0.07 | 0.1 |
| 15 | 0.06 | 0.1 |
| 20 | 0.06 | 0.06 |
| 24 | 0.05 | 0.05 |

**Region scoring**: Bonus resource +2, extra water food +2, coastal fresh water +2, coastal non-fresh +1, land yields + hills bonus +1.

**Assignment**: Worst regions first (best pick within), players shuffled randomly.

### `normalizeRemovePeaks()` — disabled (returns None)

---

## 6. Terra.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Earth-like with Old World and New World

### Grid Sizes (enlarged — largest of any script)

| World Size | Grid |
|-----------|------|
| Duel | 13x8 |
| Tiny | 16x10 |
| Small | 21x13 |
| Standard | 26x16 |
| Large | 32x20 |
| Huge | 38x24 |

### Constants
- `minStartingDistanceModifier()` = **-20**

### Class: `TerraMultilayeredFractal`

**Grain matrix:**

| World Size | archGrain | contGrain | gaeaGrain | eurasiaGrain |
|-----------|-----------|-----------|-----------|-------------|
| Duel/Tiny | 3 | 2 | 1 | 2 |
| Small/Standard/Large | 4 | 2 | 1 | 2 |
| Huge | 5 | 2 | 1 | 2 |

**Base coordinates:**
- New World: lon [0.05, 0.35]
- Eurasia: lon [0.45, 0.95], lat [0.45, 0.95]
- `thirdworldDimension = 0.125`

**Randomization**: `roll1` (N/S flip), `roll2` (E/W flip) — each 50% chance.

**12+ regions generated in order:**
1. Eurasia (main): water=55+sea, grain=2, rift=2
2. Eurasia (cohesion): inset 10%/25%, water=60+sea, grain=1
3. North America: lat [0.52, 0.85], water=61+sea
4. South America: lat [0.25, 0.47], water=55+sea
5. South America tip: lat [0.18, 0.3], water=67+sea
6. Yukon: lat [0.75, 0.93], water=68+sea
7. Arctic islands: water=76+sea
8. Central America: water=60+sea
9. Caribbean: water=75+sea
10. Large subcontinent (Africa): shape roll determines massive/standard/archipelago
11. Small subcontinent (India): shape roll determines type
12. Minor regions (Australia/Antarctica): 2-4 extra, water=60-70+sea

### `findStartingPlot()`
**All players start on biggest land area (Old World).** New World is uninhabited at game start — the defining Terra mechanic.

---

## 7. Fractal.py

**Author**: Soren Johnson
**Purpose**: Pure random fractal — simplest possible map

- `initFractal(rift_grain=-1, has_center_rift=False, polar=True)`
- `generatePlotTypes()` — **no water_percent specified**, uses engine default

Key difference from Continents: no rift, no custom water percent. Result is completely unpredictable.

---

## 8. Inland_Sea.py

**Author**: Bob Thomas (Sirian), with Soren Johnson and Andy Szybalski
**Purpose**: Mediterranean-type map with civs ringing a central sea

### Map Properties (unique)
- `getWrapX()` = **False** (only script to disable X-wrap)
- `getWrapY()` = **False**
- `getTopLatitude()` = **60** (temperate zone only)
- `getBottomLatitude()` = **-60**
- `minStartingDistanceModifier()` = **-95** (extreme reduction)

### Grid Sizes (smaller)

| World Size | Grid |
|-----------|------|
| Duel | 6x4 |
| Tiny | 8x5 |
| Small | 10x6 |
| Standard | 13x8 |
| Large | 16x10 |
| Huge | 21x13 |

### Template System
Exhaustive position definitions for 1-18 players with multiple template variants. Each entry: `[fLat, fLon, xVariance, yVariance]`. Positions ring the map edges.

**Template instance counts by player count:**
`[0, 1, 6, 4, 3, 2, 2, 2, 4, 2, 2, 2, 1, 2, 1, 2, 1, 2, 1]`

### Class: `ISHintedWorld(HintedWorld, ISFractalWorld)`
- `HintedWorld(4, 2)` — 4 wide, 2 tall
- Border cells: `200 + random(0-54)` (land)
- Interior cells: `0` (ocean/sea)
- Creates "ring of land around central sea"

### Class: `ISTerrainGenerator` / `ISFeatureGenerator`
**Latitude compression**: `lat = 0.07 + 0.56 * lat` — range [0.07, 0.63]. No snow/ice terrain, no pure tropical.

### Custom River System
- `getRiverStartCardinalDirection()`: Rivers flow toward map center (the inland sea)
- `getRiverAltitude()`: `altitude = (abs(x - width/2) + abs(y - height/2)) * 20` — Manhattan distance from center × 20

### `findStartingPlot()`
Template-based with up to 50 passes of relaxing constraints.

---

## 9. Lakes.py

**Author**: Andy Szybalski, with Bob Thomas (Sirian)
**Purpose**: Oceanless planet with many small lakes

### Grid Sizes (reduced for land-heavy map)

| World Size | Grid |
|-----------|------|
| Duel | 6x4 |
| Tiny | 8x5 |
| Small | 10x6 |
| Standard | 13x8 |
| Large | 16x10 |
| Huge | 21x13 |

### Key Parameters
- `minStartingDistanceModifier()` = **-15**
- `findStartingArea()`: forces all players onto biggest area

### Class: `LakesFractalWorld`

**`generatePlotTypes(water_percent=9)`**:
- Water clamped after sea level: **min 7, max 14**
- Rows y=0 and y=max forced to `PLOT_OCEAN` (polar ice rows)
- Otherwise standard fractal logic

**Module-level init:**
- `initFractal(continent_grain=3, rift_grain=-1, has_center_rift=False, invert_heights=True)`
- `generatePlotTypes(water_percent=10)`

**Key trick**: `invert_heights=True` — inverts the fractal so "peaks" become lakes and "valleys" become land.

---

## 10. Oasis.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Desert region between two fertile bands (originally "Sahara")

### Map Properties
- `getWrapX()` = **False**, `getWrapY()` = **False**
- `getTopLatitude()` = **40**, `getBottomLatitude()` = **0**
- `isClimateMap()` = **0**, `isSeaLevelMap()` = **0**
- `minStartingDistanceModifier()` = **-35**
- All normalizations disabled

### Class: `OasisMultilayeredFractal`
- `wholeworldPlotTypes` initialized to **PLOT_LAND** (map starts all-land)
- Water regions **layered onto all-land base**
- Forces ocean at top rows, fractalizes coastline, forces land in southern portion
- Hills: [20-30%] and [70-80%], peaks at 25%

### Class: `OasisTerrainGenerator`

| Parameter | Default |
|-----------|---------|
| iGrassPercent | 50 |
| iPlainsPercent | 35 |
| iOasisGrassPercent | 9 |
| iOasisPlainsPercent | 16 |
| iOasisTopLatitude | 0.69 |
| iOasisBottomLatitude | 0.3 |

**Latitude bands:**
- `> 0.69`: plains vs grass (northern)
- `< 0.14`: forced grass (jungle region)
- `0.14-0.30`: southern fertile (50% grass, 35% plains)
- `0.30-0.69`: oasis/desert (9% grass, 16% plains, rest desert)

### Nile-Style Rivers
4 rivers, one per map quadrant. `maxshift` by size: DUEL=1 to HUGE=9. Direction odds: 60% north, 20% W, 20% E.

### Custom Bonus Placement (Regional)
- `resourcesInOasis`: ALUMINUM, IRON, OIL, STONE, GOLD, INCENSE, IVORY
- `resourcesInNorth`: HORSE, MARBLE, FUR, SILVER, SPICES, WINE, WHALE, CLAM, CRAB, FISH, SHEEP, WHEAT
- `resourcesInSouth`: DYE, FUR, GEMS, SILK, SUGAR, BANANA, DEER, PIG, RICE
- Corn placement: fractal grain=7, two narrow bands [24-27%] and [73-75%]

---

## 11. Ice_Age.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Habitable equatorial region during severe glaciation. Very wide, short maps.

### Custom Map Options
1 option — **Landmass Type** (5 values):

| Index | Name | continent_grain | water_percent |
|---|---|---|---|
| 0 | Random | weighted D20 | 65 |
| 1 | Wide Continents | 1 or 2 (with rift) | 65 |
| 2 | Narrow Continents | 3 | 65 |
| 3 | Islands | 4 | 65 |
| 4 | Small Islands | 5 | 65 |

**Random weighting (D20):** 0-1: Pangaea, 2-4: Wide, 5-9: Narrow, 10-16: Islands, 17-19: Tiny.

### Grid Sizes (extra wide, short)

| World Size | Grid |
|-----------|------|
| Duel | 10x4 |
| Tiny | 13x5 |
| Small | 16x7 |
| Standard | 21x9 |
| Large | 26x11 |
| Huge | 32x13 |

### Class: `IceAgeFractalWorld`
- `seaLevelMax = 72`, `seaLevelMin = 60` — water locked between 60-72%

### Class: `IceAgeTerrainGenerator`

| Parameter | Default | vs Standard |
|-----------|---------|------------|
| iDesertPercent | 20 | reduced |
| iPlainsPercent | **50** | dramatically increased |
| fSnowLatitude | 0.4 | much colder |
| fTundraLatitude | 0.3 | much colder |
| fDesertBottomLatitude | 0.1 | narrower |
| fDesertTopLatitude | 0.2 | narrower |

**Latitude compressed**: multiplied by **0.6** (shorter map).

### Class: `IceAgeFeatureGenerator`
- Jungle 30% (reduced), forest 50%, jungle_grain 7 (finer)
- Latitude compressed to 0.0-0.6

**Aggressive ice placement:**
- Rows 0/max: always ice
- `lat > 0.47`: `rand < 8*(lat-0.50)` or `rand < 4*(lat-0.46)`
- `lat > 0.39`: 6% encroaching icebergs
- `lat > 0.32`: 4%
- `lat > 0.27`: 2%

---

## 12. Mirror.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Generates half a map, then mirrors for symmetrical team play

### Map Properties
- No wrap, `isAdvancedMap()` = 1, `isSeaLevelMap()` = 0
- `minStartingDistanceModifier()` = **-65**

### Custom Map Options (3 options)

**Option 0 — Mirror Type:**

| Index | Name | Transform |
|---|---|---|
| 0 | Reflection | `(iW-iX-1, iY)` |
| 1 | Inversion | `(iW-iX-1, iH-iY-1)` |
| 2 | Copy | `(iX+iW/2, iY)` |
| 3 | Opposite | `(iX+iW/2, iH-iY-1)` |

**Option 1 — Team Setting:** Together / Separated / Anywhere

**Option 2 — Landmass Type:**

| Index | Name | water_percent |
|---|---|---|
| 0 | Small Lakes | 8 (all-land) |
| 1 | Wide Continents | — |
| 2 | Snaky Continents | — |
| 3 | Archipelago | — |
| 4 | Tiny Islands | — |
| 5 | Varied (random) | — |

### Mirroring Pipeline (multi-stage incremental)

| Stage | Function | What Gets Mirrored |
|-------|----------|--------------------|
| 1 | `generateTerrainTypes()` | PLOT TYPES (right→left) |
| 2 | `addLakes()` | TERRAIN + RIVERS |
| 3 | `addFeatures()` | LAKES (plot fixups) |
| 4 | `addGoodies()` | FEATURES + BONUSES |
| 5 | `afterGeneration()` | GOODIES (improvements) |

River direction corrections vary by mirror type (Reflection reverses E/W, Inversion reverses both, etc.)

### All normalizations disabled

### Starting Plot Logic
Two-team special: one team left side, mirrored positions for other. `isValidForMirror` constrains to x <= 40% (or 20% for 1v1).

---

## 13. Highlands.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Mountainous regional map with pocket-breaking pathfinding

### Map Properties
- No wrap, no climate/sea level options
- `minStartingDistanceModifier()` = **-35**

### Custom Map Options (3 options)

**Option 0 — Mountain Pattern:** Scattered / Ridgelines (default) / Clustered

**Option 1 — Mountain Density:**

| Name | Peak % | Hill % |
|------|--------|--------|
| Dense Peaks | 70 | 40 |
| Normal (default) | 77 | 45 |
| Thin Peaks | 83 | 50 |

**Option 2 — Water Setting:**

| Name | Lake % | Grain |
|------|--------|-------|
| Small Lakes (default) | 5 | 5 |
| Large Lakes | 10 | 4 |
| Seas | 15 | 3 |

### Plot Generation (direct fractal, all-land base)
- `plotTypes` initialized all `PLOT_LAND`
- Priority: lake → peak → hills → land
- Hills grain varies: Scattered=5/6, Ridgelines=4/5, Clustered=3/4

### Class: `HighlandsTerrainGenerator` — 4-Zone System

| Zone | Latitude | Terrain |
|------|----------|---------|
| Cold (>= 0.8) | Poles | Ice/Snow 75%, Tundra 20%, Plains |
| Cool (0.6-0.8) | | Tundra 85%, Plains 45%, Grass |
| Temp (0.2-0.6) | | Desert 90%, Plains 65%, Grass |
| Hot (< 0.2) | Equator | Desert 70%, Plains 60%, Grass |

### Pocket-Breaking Algorithm (`assignStartingPlots()`)

After placing each start, checks `getMinOriginalStartDist()`. If `-1`, player is trapped:

1. Find nearest already-placed start (Euclidean)
2. Draw Bresenham-like line from pocket to nearest
3. Along line: peaks→hills, water→land (plains terrain)
4. After each conversion, check `calculatePathDistance`
5. Stop when path opens

### `normalizeRemovePeaks()`, `normalizeRemoveBadTerrain()`, `normalizeAddGoodTerrain()` — all disabled

---

## 14. Hub.py

**Author**: Bob Thomas (Sirian)
**Purpose**: One area per player, connected by spokes to central island

### Map Properties
- No wrap, `isBonusIgnoreLatitude()` = True

### Custom Map Options (4 options)
- Areas Per Player (1 or 2)
- Land Shape (Natural grain=3 / Pressed grain=2 / Solid grain=1)
- Neutral Territory (Varied/Pressed=58/Natural=64/Islands=70 water%)
- Isthmus Width (1-3 plots)

### Template System
Two complete sets (Normal 2-18 players, Buffered 2-10 players). Defines per-player regions, buffers, center island, and spoke segments.

### Class: `HubMultilayeredFractal`

**`generateCenter()`**: No peaks — only HILLS and LAND.

**Pipeline:**
1. Buffers (per player): fractal regions
2. Player regions (2 fractals each): main (55+sea water) + core (65% water, grain=1)
3. **Spokes**: Bresenham line, `linewidth = 1 + isthmusOption`, forced PLOT_LAND
4. Center island

### Class: `HubTerrainGenerator` — 2-Zone System
- **Center**: ice/tundra/plains (default: ice 50%, tundra 35%)
- **Main**: desert/plains/grass (default: desert 20%, plains 25%)

### Class: `HubFeatureGenerator`
- Ice only on water in center region, 1/iIceChance
- Jungles outside center only
- Forest varieties: 2 (snowy) in center, 0 (evergreen) outer, 1 (deciduous) middle

### Starting Plots
Template-based, center of each region, variance 1-3 plots. `minStartingDistanceModifier()` = **-95**.

---

## 15. Islands.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Per-player islands with random shapes

### Custom Map Options
- Number of Large Islands (1 Per Player / Extras / Several Extras)
- Number of Tiny Islands (None / Few / Various / Many)

### Region Templates
Templates for 4, 6, 8, 12, 15, 20, 24 regions as rectangular lat/lon zones.

### Class: `IslandsMultilayeredFractal`

**Tiny Islands Layer** (full-map, added first):
- Parameters: `[[-1,-1], [92,6], [91,5], [85,5]]` = `[waterPercent, grain]`

**Large Islands** (one per region):
- 4 random shape patterns: Square centered, Square offset, Tall, Wide
- `shore_grain = 1 + random(0-2)` (1-3)
- Main: water=55+sea, iRoundFlags, fracExp=6x6
- Core (inner 50%): water=65, grain=1, fracExp=5x5

### `assignStartingPlots()` — Custom Regional Start
Same scoring system as Archipelago. Worst-first assignment, coastal requirement.

### `normalizeRemovePeaks()` — disabled

---

## 16. Ring.py

**Author**: Bob Thomas (Sirian)
**Purpose**: One area per player, linked in a closed ring

### Map Properties
- No wrap, `isBonusIgnoreLatitude()` = True
- Same 4 options as Hub (Areas/Shape/Territory/Isthmus Width)

### Class: `RingMultilayeredFractal`
**Increased hills** (compensate for flat ring): Bottom1 `23-range` to Top1 `30+range`, Bottom2 `70-range` to Top2 `77+range`.

**Ring Drawing** (Bresenham-style): `linewidth = 1 + option`, forced PLOT_LAND. Center island gets peaks (unlike Hub).

### Terrain & Features
Same 2-zone system as Hub (center=ice/tundra/plains, main=desert/plains/grass). Same feature logic.

---

## 17. Wheel.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Ring + spokes combined

Identical to Ring except:
- Additional spoke data connecting ring to center
- Spoke drawing with separate width option
- Center uses `generateCenter()` (no peaks, like Hub)
- Buffers use random type regardless of user input

---

## 18. Great_Plains.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Regional map simulating North America's Great Plains

### Map Properties
- No wrap, no climate/sea level
- `getTopLatitude()` = **45**, `getBottomLatitude()` = **25**
- `minStartingDistanceModifier()` = **-25**
- **All 7 normalizations disabled**

### Grid Sizes (very small, squarish)
Duel: 5x3, Tiny: 6x4, Small: 8x6, Standard: 11x8, Large: 14x11, Huge: 18x14

### Six Geographic Regions

| Region | Location | Terrain |
|--------|----------|---------|
| Rockies | West (lat <= 0.2), above south quarter | Very mountainous, peaks at 37% |
| Plains | Middle (0.2-0.67) | Mostly flat, hills only below 8% |
| Eastern Grasslands | East (> 0.67) | Standard hills, no peaks |
| Gulf of Mexico | SE corner | Ocean |
| Ozarks | Random interior | Very hilly (4 bands) |
| SW Desert | West, below south quarter | Extra hills |

### Mississippi River System
- Nile-style south-flowing river from top, center at 78% width
- Direction: 58% south, 17% west, 25% east, maxshift DUEL:1 to HUGE:4
- Records X coords for tributary altitude system

### Custom Bonus Placement
Regional resource lists (Rockies gets aluminum/fur/gold, Plains gets horse/gems, etc.)
Eliminated: Rice, Whale, Silk, Banana, Ivory.
Buffalo (Cow): fractal grain=7, two narrow height bands.

### `getLatitudeAtPlot()`
**Uses X/Width as latitude** — east-west position determines "climate" instead of north-south.

---

## 19. Team_Battleground.py

**Author**: Bob Thomas (Sirian), with Andy Szybalski
**Purpose**: Quick MP team games

### Map Properties
- No wrap, `getTopLatitude()` = 80, `getBottomLatitude()` = -80
- `isSeaLevelMap()` = 0
- `minStartingDistanceModifier()` = **-65**

### Custom Map Options
- Team Placement: Left vs Right / Top vs Bottom / Four Corners
- Team Setting: Together / Separated / Anywhere

### Grid Sizes (two layouts)
**LvR**: Rectangular (5x3 to 16x10)
**TvB/4C**: Square (4x4 to 13x13)

### Plot Generation (3 algorithms)

**Four Corners:**
- `HintedWorld()` with center cross = ocean, bridge = coast
- Post-processing: force ocean cross (3 plots wide)
- **X-shaped bridge** with linewidth=3, Bresenham line

**Top vs Bottom:**
- `FractalWorld(fracXExp=6, fracYExp=6)`, `invert_heights=True`, `water_percent=8`

**Left vs Right:**
- `HintedWorld(4,2)` with center column = ocean + bridge

### Terrain
- Latitude scaled by 0.8
- Equator terrain: desert (TvB) or grass (others) below `fGrassLatitude`
- `iDesertPercent = 15`

### Team-Aware Starting Plots
- 2 teams: splits at 40% boundary (LvR/TvB) or diagonal corners (4C)
- 3-4 teams: shuffled corner assignment
- Separated mode: alternating members on opposite sides

---

## 20. Tilted_Axis.py

**Author**: Bob Thomas (Sirian)
**Purpose**: World with rotational axis tipped on its side. Square map.

### Map Properties
- `getWrapX()` = **False**, `getWrapY()` = **True** (wraps vertically!)

### Custom Map Options
1 option — **Landmass Size** (5 values): Massive/Normal/Small/Islands/Tiny

### Grid Sizes (square)
Duel: 8x8, Tiny: 10x10, Small: 13x13, Standard: 16x16, Large: 20x20, Huge: 25x25

### Class: `TiltedAxisFractalWorld`
- Uses `FRAC_WRAP_Y + FRAC_POLAR` flags (Y-wrap with polar attenuation on X)

| Selection | continent_grain | rift_grain | has_center_rift |
|-----------|----------------|------------|-----------------|
| Massive | 1 | 2 | False |
| Normal | 2 | 2 | True |
| Small | 3 | 3 | False |
| Islands | 4 | -1 | False |
| Tiny | 5 | -1 | False |

### Latitude = X-axis (THE key mechanic)
```python
lat = abs((iWidth / 2) - iX) / float(iWidth / 2)
```
Snow/tundra at left and right edges, desert/jungle in center column.

---

## 21. Custom_Continents.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Global map — user chooses number of continents (2-6)

### Map Properties
- `isAdvancedMap()` = 1
- `minStartingDistanceModifier()` = **-12**

### Custom Map Options
1 option — **Number of Continents** (7 values):
- `0`: Random (weighted by player count)
- `1`: One Per Team (balanced templates only)
- `2`-`6`: Exact continent count

### Random Weighting (D100 roll, by player count)

Example thresholds (2 players): `[60, 90, 100, 111]` → 60% 2-cont, 30% 3-cont, 10% 4-cont
Example (18 players): `[10, 25, 45, 65]` → 10% 2-cont, 15% 3-cont, 20% 4-cont, 20% 5-cont, 35% 6-cont

More players biases toward more continents.

### One Per Team Logic
- Teams < 7: `iNumConts = iTeams`
- Teams 7-12: `iNumConts = iTeams / 2`
- Teams 13-18: `iNumConts = iTeams / 3`
- Always uses `templateID = 0` (the "fair" balanced template)

### Template System

Massive nested dict keyed by `(numContinents, templateID)`. Each continent has multiple fractal layers.

**Template instance counts**: `configs = [0, 0, 10, 9, 7, 6, 6]` (indexed by numConts)

Each layer format: `[fWestLon, fEastLon, fSouthLat, fNorthLat, xVar, yVar, bFlagX, bFlagY, iWater, iGrain, iFracFlags, xExp, yExp, iShift]`

**Special grain encoding:**
- 12 = random 1-2, 13 = random 1-3, 14 = random 1-4
- 23 = random 2-3, 24 = random 2-4, 34 = random 3-4, 35 = random 3-5

**Flag encoding:** 0=none, 1=Horz, 2=Vert, 3=Round

**Water = -1** means use default: `[55, 60, 65, 70, 75, 80, 85]` indexed by grain

**Binary shift system**: Global `xShiftRoll` and `yShiftRoll` (0 or 1) decide whether binary-flagged layers shift. `bFlagX/bFlagY = True` means random shift within range instead.

### Class: `CCMultilayeredFractal`

**`generatePlotsByRegion()`**:
1. Adds 1-5 random tiny island patches (15% of map, water=80, grain=4, fracExp=6x5)
2. For each continent, iterates through all its layers
3. Each layer: resolves grain encoding, water defaults, flag IDs, applies shift, calls `generatePlotsInRegion()` with hillsGrain=4

### Terrain & Features
Default `TerrainGenerator()` and `FeatureGenerator()`, no customization.

### Starting Plots
- "One Per Team" (option 1): shuffles teams to continents, constrains each team's players to their continent's bounding box
- Other options: default C++ implementation
- `normalizeStartingPlotLocations()`: disabled for One Per Team (< 7 teams), default otherwise

---

## 22. Fantasy_Realm.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Fantastical terrain with toroidal wrap and irrational/crazy resource placement

### Map Properties
- `getWrapX()` = **True**, `getWrapY()` = **True** (toroidal — only script with both wraps)
- `isClimateMap()` = 0, `isBonusIgnoreLatitude()` = True
- `minStartingDistanceModifier()` = **-25**
- `findStartingArea()`: forces biggest area

### Grid Sizes (reduced for land-heavy)
Duel: 6x4, Tiny: 8x5, Small: 10x6, Standard: 13x8, Large: 16x10, Huge: 21x13

### Custom Map Options
1 option — **Resource Appearance** (3 values):
- `0`: Logical (default C++ placement)
- `1`: Irrational (default, custom placement with forced terrain inversions)
- `2`: Crazy (8 resources eliminated, 4 "crazy" resources placed fractally in wrong terrain)

### Class: `FantasyFractalWorld`

**`initFractal()`**: Uses `iFlags = 0` (no FRAC_POLAR, no wrap flags — despite toroidal wrap). Same rift logic as base.

**`generatePlotTypes(water_percent=9)`**: Water clamped **7-14%**. Hills/peaks with standard dual-band system. Identical to Lakes logic.

**Module-level**: `continent_grain=3, rift_grain=-1, invert_heights=True, water_percent=10` — same as Lakes.

### Class: `FantasyTerrainGenerator` — Fractal-Band Terrain (NO latitude)

Single fractal, `grain_amount=7`. Terrain assigned by **fractal height bands** (not latitude):

| Percentile Range | Terrain |
|-----------------|---------|
| >= 90% | Snow/Ice |
| 80-90% | Grass |
| 75-80% | Desert |
| 65-75% | Plains |
| 55-65% | Tundra |
| 45-55% | Grass |
| 35-45% | Plains |
| 27-35% | Tundra |
| 20-27% | Snow/Ice |
| 10-20% | Desert |
| < 10% | Grass |

This creates a chaotic, non-geographic terrain distribution — terrain types appear in fractal blobs regardless of position.

### Class: `FantasyFeatureGenerator`
- Jungle 20%, Forest 30%, forest_grain=6
- **Ice**: random 3/35 chance (~8.6%) on any water plot
- **Flood plains**: on desert OR snow riverside flatlands (snow floodplains!)
- **Oasis**: 1/30 chance on non-grass, non-freshwater land
- **Jungles**: top 20% of forest fractal
- **Forests**: bottom 30% of forest fractal, random variety (0-2)

### Irrational Resource Placement (`addBonusType()`)

Inverted terrain requirements:
- Gold/Silver/Coal/Aluminum: forced on **flatlands** (normally hills) and in **forests**
- Banana/Rice/Sugar/Oil: forced on **hills** (normally flatlands)
- Incense: forced in **floodplains**
- Horse/Wheat: forced in **jungle**
- Cow/Corn/Rice/Pig/Ivory: forced **not** in grass
- Oil/Stone/Iron/Copper: forced **not** in desert
- Silver/Deer/Fur: forced **not** in snow
- Wine/Sheep/Marble/Ivory: forced **not** in plains
- Rice/Corn/Wheat/Sugar: forced **not** in freshwater

Count formula same as Oasis (sizemodifier + random player component).

### Crazy Resource System (`afterGeneration()`)
- 4 "crazy" resources randomly chosen (1 food, 1 luxury, 1 strategic, 1 late-game)
- 8 resources eliminated entirely (2 food, 2 luxury, 2 strategic, 1 late-game, 1 sea)
- Crazy resources placed via fractal (grain=7) in specific terrain bands:
  - Crazy food: tundra/snow at 30-45% band
  - Crazy luxury: grass at 55-70% band
  - Crazy strategic: plains at 45-55% band
  - Crazy late-game: desert at 10-30% band

### Normalizations Disabled
`normalizeRemovePeaks`, `normalizeRemoveBadTerrain`, `normalizeRemoveBadFeatures`, `normalizeAddGoodTerrain`

---

## 23. Balanced.py

**Author**: Andy Szybalski
**Purpose**: Solid pangaea with balanced strategic resources near each start

### Map Properties
- `getTopLatitude()` = **70**, `getBottomLatitude()` = **-70**
- Default wrap (X=true, Y=false)

### Constants
- `resourcesToBalance`: ALUMINUM, COAL, COPPER, HORSE, IRON, OIL, URANIUM
- `resourcesToEliminate`: MARBLE, OIL (OIL appears in both — balanced near starts, none random)

### Plot Generation
- `HintedWorld(16, 8)` — 16x8 block grid
- `numBlocksLand = int(numBlocks * 0.25)` — 25% of blocks are land
- Single continent: `addContinent(numBlocksLand, random(4-8), random(2-4))`
- Polar rows forced to ocean (y=0 and y=h-1)
- `generatePlotTypes(shift_plot_types=True)`

### Terrain & Features — Latitude Compression
Both `BTerrainGenerator` and `BFeatureGenerator` override `getLatitudeAtPlot()`:
```
lat = 0.05 + 0.75 * parentLat  →  range [0.05, 0.75]
```
Eliminates extreme polar (no snow) and extreme tropical terrain.

### Strategic Resource Balancing (`normalizeAddExtras()`)

For each alive player:
1. Builds list of plots in **11x11 area** (dx -5 to +5, dy -5 to +5) around start
2. For each balanced resource, attempts placement in 4 passes with relaxing constraints:
   - Pass 0: respect unique range, one-area rule, adjacency
   - Pass 1: ignore unique range
   - Pass 2: also ignore one-area rule
   - Pass 3: also ignore adjacency
3. Each resource placed at first eligible plot via `canHaveBonus(bonus, True)` + `isBonusValid()`
4. Then calls default `normalizeAddExtras` for remaining normalization

### `isBonusValid()` Checks
- **One-area rule**: If bonus is `isOneArea()` and already placed elsewhere, new plot must be on same area
- **Adjacency**: No different bonus type in any adjacent plot (8 directions)
- **Unique range**: No same bonus type within `uniqueRange` Manhattan distance

### `addBonusType()` Override
- Balanced and eliminated resources: returns None (no random placement)
- All other resources: default C++ placement

---

## 24. Shuffle.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Return of Civ3's "random" map option — randomly selects a map grain

### Map Properties
- `isAdvancedMap()` = 0 (shows in simple mode)
- Default everything else

### Plot Generation — Weighted Random Grain

D8 roll (`1 + dice.get(8)`), then transformed:

| Roll | grainRoll after transform | Result |
|------|--------------------------|--------|
| 1 | 1 | Pangaea-like (grain 1, no rift) |
| 2 | 2 | **Continents** (grain 2 with rift, `water_percent=75`) |
| 3 | 3 | Small continents (grain 3, no rift) |
| 4 | 4 | Islands (grain 4, no rift) |
| 5 | 2 (5→2 via `-3`) | **Continents** again |
| 6 | 1 (6→1 via `-5`) | Pangaea-like |
| 7 | 2 (7→2 via `-5`) | **Continents** again |
| 8 | 3 (8→3 via `-5`) | Small continents |

**Effective distribution:**
- Grain 1 (Pangaea): 2/8 = **25%**
- Grain 2 (Continents with rift + water=75): 3/8 = **37.5%**
- Grain 3 (Small continents): 2/8 = **25%**
- Grain 4 (Islands): 1/8 = **12.5%**

When grain=2: uses default `initFractal(polar=True)` which includes rift and center rift, with `water_percent=75` (matches Continents.py exactly).

All other grains: `rift_grain=-1, has_center_rift=False, polar=True`, default water_percent.

### Terrain & Features
Default `TerrainGenerator()` and `FeatureGenerator()`, no customization.

---

## 25. Maze.py

**Author**: Bob Thomas (Sirian)
**Purpose**: Creates a land/sea maze using DFS algorithm

### Map Properties
- `isAdvancedMap()` = 1, `isSeaLevelMap()` = 0
- `startHumansOnSameTile()` = **True** (unique — only script that does this)
- Default wrap

### Custom Map Options
1 option — **Maze Width** (5 values):
- 0: 1 Plot Wide
- 1: 2 Plots Wide
- 2: 3 Plots Wide (default)
- 3: 4 Plots Wide
- 4: 5 Plots Wide

### Grid Sizes (nonstandard reductions)
Duel: 6x4, Tiny: 9x4, Small: 10x6, Standard: 14x8, Large: 18x10, Huge: 24x14

### Maze Generation Algorithm (DFS)

**Setup:**
- `multiplier = 1 + mazeWidthOption` (1-5)
- `mazeW = iW / (2 * multiplier)`, `mazeH = iH / (2 * multiplier)` — maze grid dimensions
- `matrix`: boolean array tracking visited cells
- `path`: stack of vertices with >1 remaining direction

**Peak percentage adjustment:**
- Width 1-2: `extraPeaks = 0`
- Width 3: `extraPeaks = 2` (so +20% peak threshold)
- Width 4: `extraPeaks = 1` (+10%)
- Width 5: `extraPeaks = 0`

**Hills grain by world size:** Duel/Tiny: 3, Small/Standard: 4, Large: 5, Huge: 6

**Algorithm (modified DFS):**
1. Start at random maze cell `(iX, iY)`
2. Mark cell as visited, place `multiplier × multiplier` block of land/hills/peaks
3. Count valid unvisited neighbors (N/S/E/W)
4. If >1 valid direction: push to path stack
5. Choose random valid direction
6. Place land in 2 blocks along chosen direction (the corridor + next vertex)
7. Move to new vertex
8. If 0 valid directions: backtrack by picking random vertex from path stack
9. If picked vertex also has <2 directions, remove from stack
10. Repeat until all `mazeW * mazeH - 1` segments placed

**Land block placement:** Each maze vertex and corridor fills a `multiplier × multiplier` area. Hills use standard dual-band system (25±range, 75±range). Peaks only placed when `multiplier > 1`.

### Coastal Peak Removal (in `addFeatures()`)
Before features: any peak that is coastal → hills (same as Archipelago).

### `normalizeRemovePeaks()` — disabled

### Terrain & Features
Default `TerrainGenerator()` and `FeatureGenerator()`, no customization.
