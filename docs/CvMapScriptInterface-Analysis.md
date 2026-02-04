# CvMapScriptInterface.py Analysis

**File**: `Civ4/Assets/Python/EntryPoints/CvMapScriptInterface.py`
**Authors**: aszybalski (2004), Bob Thomas "Sirian" (2005)
**Purpose**: Defines the **complete interface** (stub functions) that any Civ4 map script can override. The game engine calls these functions in a fixed order during map generation.

## What This File Is

This is **not** an implementation — it's a contract/interface. Every function here either:
- Calls `CyPythonMgr().allowDefaultImpl()` to fall back to C++ engine defaults, or
- Returns a trivial default value

Map scripts (in `PublicMaps/`) override whichever functions they need. Any function not overridden uses the engine's C++ default behavior.

## Order of Operations

The file documents the exact call sequence during map generation:

### Phase 1: Game Properties (at launch)
- `getDescription()` — Display text in menu
- `isAdvancedMap()` — Whether script appears only in advanced menu
- `getModPath()` — Associated mod path

### Phase 2: User Options (at script selection)
- `isClimateMap()` / `isSeaLevelMap()` — Whether to show climate/sea level dropdowns
- `getNumCustomMapOptions()` — Number of custom options
- `getCustomMapOptionName()` / `getCustomMapOptionDescAt()` / `getCustomMapOptionDefault()` — Option UI
- `isRandomCustomMapOption()` — Whether "Random" is offered for an option

### Phase 3: Map Generation (at game launch)

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
| 10 | `addRivers()` | Layer 3. Sub-calls per river: `getRiverStartCardinalDirection()`, `getRiverAltitude()` per plot |
| 11 | `addLakes()` | Layer 4 |
| 12 | `addFeatures()` | Layer 5: Forest, jungle, oasis, floodplains |
| 13 | `addBonuses()` | Layer 6. Sub-calls: `addBonusType()` per bonus, `canPlaceBonusAt()` per plot |
| 14 | `addGoodies()` | Layer 7: Tribal villages (goodies are "improvements") |
| 15 | `afterGeneration()` | Final map adjustments before starting plots |

### Phase 4: Starting Plot Assignment

| # | Function | Notes |
|---|----------|-------|
| 16 | `minStartingDistanceModifier()` | Percentage modifier for min distance between starts |
| 17 | `assignStartingPlots()` | **If overridden, skips 18-19** |
| 18 | `findStartingPlot(playerID)` | Called once per civ. **If overridden, skips 19** |
| 19 | `findStartingArea(playerID)` | Returns areaID for player's continent |

### Phase 5: Start Normalization

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

## Referenced Files

### Directly Referenced
| File | Relationship |
|------|-------------|
| `CvPythonExtensions` | C++ Python bindings (imported). Provides `CyPythonMgr`, `CyMapGenerator`, plot types, etc. |
| `CvUtil` | Python utility module (imported but unused in stubs) |

### Indirectly Referenced (by documentation)
| File | Location | Purpose |
|------|----------|---------|
| `CvMapGeneratorUtil.py` | `Assets/Python/` | Utility classes for map generation (fractal, terrain generator, feature/bonus placement). Contains `findStartingPlot()` alternative implementation |
| `Continents.py` | `PublicMaps/` | Called out as the "default minimum map script" — contains all **mandatory functions** |

### All Map Script Files in `PublicMaps/`

Python map scripts (these override the interface):
- `Pangaea.py`, `Continents.py`, `Archipelago.py`, `Terra.py`, `Fractal.py`
- `Inland_Sea.py`, `Lakes.py`, `Oasis.py`, `Ice_Age.py`, `Mirror.py`
- `Highlands.py`, `Hub.py`, `Islands.py`, `Ring.py`, `Wheel.py`
- `Great_Plains.py`, `Team_Battleground.py`, `Tilted_Axis.py`
- `Custom_Continents.py`, `Fantasy_Realm.py`, `Balanced.py`
- `Shuffle.py`, `Maze.py`

Pre-built world maps (WorldBuilder saves, not scripts):
- `Earth.Civ4WorldBuilderSave`, `Earth_IceAge.Civ4WorldBuilderSave`
- `Earth1000AD.Civ4WorldBuilderSave`, `Earth18Civs.Civ4WorldBuilderSave`
- `GreekWorld.Civ4WorldBuilderSave`, `Planet.Civ4WorldBuilderSave`
- `Battle.Civ4WorldBuilderSave`

## Key Design Insights

1. **Layered generation**: Map data is built in 7 sequential layers (plots → terrain → rivers → lakes → features → bonuses → goodies). Each layer can be independently overridden.

2. **Grid cells vs plots**: `getGridSize()` returns grid cells where each cell = 4x4 plots. So a grid of (18, 12) = 72x48 plot tiles.

3. **Cascade overrides**: `generateRandomMap()` can disable plot/terrain generation. `assignStartingPlots()` can disable `findStartingPlot()` which can disable `findStartingArea()`.

4. **Start normalization is aggressive**: 8 separate normalization passes ensure balanced starts. This is why Civ4 starts rarely feel unfair.

5. **X-wrap by default**: Maps wrap horizontally (cylindrical) but not vertically. This matches the standard Civ4 map topology.

6. **Most logic lives in C++**: The `allowDefaultImpl()` calls delegate to the C++ engine. Python scripts only override specific behaviors. The actual fractal generation, terrain assignment algorithms, and river pathing are primarily in C++ with Python wrappers in `CvMapGeneratorUtil.py`.

## Files to Read Next

For actual implementation details (not just the interface), read:
1. **`CvMapGeneratorUtil.py`** — Contains `FractalWorld`, `TerrainGenerator`, `FeatureGenerator`, `BonusBalancer` Python classes
2. **`PublicMaps/Continents.py`** — The canonical map script with all mandatory function implementations
3. **`PublicMaps/Pangaea.py`** — Simpler single-continent variant
