# Civ4 Map Generation Logic — Function Catalog

Comprehensive catalog of every major function in the Civ4 BTS map generation Python code.

## Files Analyzed

- `D:\Games\Civilization IV Complete\Civ4\Assets\Python\CvMapGeneratorUtil.py` (1292 lines)
- `D:\Games\Civilization IV Complete\Civ4\Assets\Python\EntryPoints\CvMapScriptInterface.py` (399 lines)

---

## `CvMapGeneratorUtil.py` — Engine Classes

### Class: `FractalWorld` — Diamond-square fractal plot type generation

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `__init__` | Initializes FractalWorld with map dimensions, plot type arrays, and fractal objects | In: optional `fracXExp`, `fracYExp` / Out: initialized class members |
| `checkForOverrideDefaultUserInputVariances` | Allows subclasses to override XML defaults for sea level, climate, etc. | In: none / Out: none (modifies instance vars) |
| `initFractal` | Initializes the continent fractal with optional rifts and polar flags | In: `continent_grain`, `rift_grain`, `has_center_rift`, `invert_heights`, `polar` / Out: initialized `self.continentsFrac` |
| `generatePlotTypes` | **Main function** — generates the full plot type array (OCEAN, LAND, HILLS, PEAK) | In: `water_percent` (0-100), `shift_plot_types` (bool), `grain_amount` / Out: `self.plotTypes` list |
| `shiftPlotTypes` | Finds and applies best split points to minimize land along wrapping edges | In: none / Out: modified `self.plotTypes` |
| `shiftPlotTypesBy` | Circular-shifts plot types by given x and y offsets | In: `xshift`, `yshift` / Out: modified `self.plotTypes` |
| `findBestSplitX` | Finds optimal X-axis split to minimize jagged edges when wrapping | In: `stripRadius` / Out: `best_split_x` (int) |
| `findBestSplitY` | Finds optimal Y-axis split to minimize jagged edges when wrapping | In: `stripRadius` / Out: `best_split_y` (int) |
| `calcWeights` | Calculates distance-based weights for land strip evaluation | In: `stripRadius` / Out: `landWeights` list |

### Class: `HintedWorld` (extends FractalWorld) — Block-hint continent placement

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `__init__` | Initializes block grid for hint-based continent placement | In: `w`, `h` (blocks), optional fractal exps / Out: initialized block grid |
| `setValue` | Sets hint value at block position | In: `x`, `y`, `val` / Out: `True`/`False` |
| `getValue` | Gets hint value at block position | In: `x`, `y` / Out: `val` or `None` |
| `normalizeBlock` | Normalizes block coordinates with wrapping support | In: `x`, `y` / Out: normalized `(x, y)` |
| `blockToPlot` | Converts block coordinates to plot coordinates | In: `blockx`, `blocky` / Out: `(plotx, ploty)` |
| `addContinent` | Adds continent hint starting at random or specified location | In: `numBlocks`, optional `x/y/maxDist/maxRadius` / Out: `Continent` or `None` |
| `__addContinentAt` | Internal: adds continent at specific location | In: `numBlocks`, `x`, `y`, `maxradius` / Out: `Continent` |
| `expandContinentBy` | Recursively expands continent by adding adjacent blocks | In: `cont`, `numBlocks` / Out: `True`/`False` |
| `buildAllContinents` | Expands all continents until complete | In: none / Out: modified continent data |
| `shiftHintsToMap` | Applies optimal shifts to reduce edge land in hint data | In: none / Out: modified hint array |
| `bestHintsSplitX` | Finds optimal X-axis split for hint data | In: none / Out: `best_split` (int) |
| `bestHintsSplitY` | Finds optimal Y-axis split for hint data | In: none / Out: `best_split` (int) |
| `shiftHintsBy` | Circular-shifts hint data and all continent blocks | In: `splitx`, `splity` / Out: modified hints + continents |
| `__doInitFractal` | Initializes fractal using hint blocks as constraints | In: none / Out: initialized `self.continentsFrac` |
| `isValid` | Checks if block position is valid for continent expansion | In: `x`, `y`, `cont` / Out: `True`/`False` |
| `findValid` | Recursively finds nearest valid block within distance | In: `x`, `y`, `dist` / Out: `(foundx, foundy)` |
| `inBounds` | Checks if block is within grid bounds | In: `x`, `y` / Out: `True`/`False` |
| `generatePlotTypes` | Generates plot types using hint data as fractal constraints | In: `water_percent`, `shift_plot_types` / Out: `self.plotTypes` |
| `printHints` | Debug: prints hint map with optional marker | In: `markerx`, `markery` / Out: console output |

### Nested Class: `HintedWorld.Continent`

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `__init__` | Initializes continent with target size and center position | In: `world`, `numBlocks`, `x`, `y`, `maxradius` / Out: initialized continent |
| `addBlock` | Adds block to continent, updates rect list | In: `x`, `y` / Out: modified blocks/rects |
| `recalculateRects` | Recalculates plot rectangles for all blocks | In: none / Out: updated `self.rects` |
| `containsPlot` | Checks if plot is within any block rectangle | In: `x`, `y` / Out: `True`/`False` |
| `getCenterPlot` | Returns center plot coordinates of continent | In: none / Out: `(x, y)` tuple |
| `findStartingPlot` | Finds best starting location within continent | In: `playerID` / Out: `plotNum` (int) |

### Class: `MultilayeredFractal` — Multi-region fractal system

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `__init__` | Initializes multilayered fractal with global plot array | In: optional fractal exps / Out: initialized state |
| `generatePlotsInRegion` | Generates plot types for a single region and applies to global array | In: 15 params (water%, dimensions, position, grain, flags, rift options) / Out: modified `self.wholeworldPlotTypes` |
| `generatePlotsByRegion` | **Master control** — defines all regions and coordinates generation | In: none / Out: `self.wholeworldPlotTypes` |
| `shiftRegionPlots` | Finds and applies optimal shifts to minimize edge land in a region | In: `iRegionWidth`, `iRegionHeight`, `iStrip` / Out: modified `self.plotTypes` |
| `shiftRegionPlotsBy` | Circular-shifts regional plots by given offsets | In: `xshift`, `yshift`, `iRegionWidth`, `iRegionHeight` / Out: modified plots |
| `findBestRegionSplitX` | Finds optimal X-axis split for region | In: width, height, stripRadius / Out: `best_split_x` |
| `findBestRegionSplitY` | Finds optimal Y-axis split for region | In: width, height, stripRadius / Out: `best_split_y` |
| `calcWeights` | Calculates distance-based weights for region edge analysis | In: `stripRadius` / Out: `landWeights` list |

### Class: `TerrainGenerator` — Latitude-based terrain assignment

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `__init__` | Initializes with climate parameters (percentages + latitude thresholds) | In: 10 params (`iDesertPercent`, `iPlainsPercent`, `fSnowLatitude`, etc.) / Out: initialized fractals |
| `initFractals` | Initializes desert, plains, and variation fractals | In: none / Out: initialized fractal objects |
| `getLatitudeAtPlot` | Calculates latitude (0.0=tropical, 1.0=polar) at plot position | In: `iX`, `iY` / Out: `lat` (float) |
| `generateTerrain` | Generates terrain type for every plot on the map | In: none / Out: `terrainData` (list of TerrainTypes) |
| `generateTerrainAtPlot` | Determines terrain type at single plot from latitude + fractals | In: `iX`, `iY` / Out: `terrainType` enum value |

### Class: `FeatureGenerator` — Forest/jungle/ice/oasis placement

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `__init__` | Initializes with jungle/forest percentages and grain sizes | In: 6 params (`iJunglePercent`, `iForestPercent`, grains, exps) / Out: initialized fractals |
| `__initFractals` | Initializes jungle and forest fractals | In: none / Out: fractal objects |
| `__initFeatureTypes` | Caches feature type enum values (ice, jungle, forest, oasis) | In: none / Out: cached IDs |
| `addFeatures` | **Main function** — adds features to all plots on map | In: none / Out: modified plots via `CyPlot.setFeatureType()` |
| `getLatitudeAtPlot` | Calculates latitude at plot for feature rules | In: `iX`, `iY` / Out: `lat` (float) |
| `addFeaturesAtPlot` | Determines and sets appropriate features at a single plot | In: `iX`, `iY` / Out: feature set on plot |
| `addIceAtPlot` | Places ice based on latitude and random chance | In: `pPlot`, `iX`, `iY`, `lat` / Out: ice placed if conditions met |
| `addJunglesAtPlot` | Places jungle based on fractal value and latitude | In: `pPlot`, `iX`, `iY`, `lat` / Out: jungle placed if conditions met |
| `addForestsAtPlot` | Places forest based on fractal threshold | In: `pPlot`, `iX`, `iY`, `lat` / Out: forest placed if conditions met |

### Global Utility Functions

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `getAreas` | Returns list of all land and water areas on map | In: none / Out: list of `CyArea` objects |
| `findStartingPlot` | Finds best starting location for a player | In: `playerID`, optional `validFn` / Out: `plotNum` (int) |
| `argmin` | Finds index and value of minimum element | In: `list` / Out: `(best_index, best_value)` |
| `pointInRect` | Tests if (x,y) point is within rectangle bounds | In: `point`, `rect` / Out: `True`/`False` |
| `printMap` | Debug: prints 2D grid as ASCII with optional marker | In: `data`, `w`, `h`, `markerx`, `markery` / Out: console output |

---

## `CvMapScriptInterface.py` — Map Script Callback Interface

### Map Properties

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `getDescription` | Returns description text shown in main menu | In: none / Out: string |
| `isAdvancedMap` | Whether map appears only in advanced menu | In: none / Out: 0 or 1 |
| `getModPath` | Returns mod folder path for map script | In: none / Out: string |

### User-Defined Map Options

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `isClimateMap` | Whether map uses climate selection | In: none / Out: 0 or 1 |
| `isSeaLevelMap` | Whether map uses sea level selection | In: none / Out: 0 or 1 |
| `getNumCustomMapOptions` | Count of user-defined option groups | In: none / Out: int |
| `getCustomMapOptionName` | Display name of specified option group | In: `argsList[0]` = option ID / Out: unicode string |
| `getNumCustomMapOptionValues` | Count of choices for specified option | In: `argsList[0]` = option ID / Out: int |
| `getCustomMapOptionDescAt` | Display name of option choice at index | In: `argsList[0]` = option ID, `[1]` = value ID / Out: unicode string |
| `getCustomMapOptionDefault` | Default selection index for option | In: `argsList[0]` = option ID / Out: int |
| `isRandomCustomMapOption` | Whether random selection is available for option | In: `argsList[0]` = option ID / Out: bool |

### Map Size & Wrapping

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `getWrapX` | Whether map wraps horizontally | In: none / Out: bool |
| `getWrapY` | Whether map wraps vertically | In: none / Out: bool |
| `getTopLatitude` | Top latitude boundary (default 90) | In: none / Out: numeric |
| `getBottomLatitude` | Bottom latitude boundary (default -90) | In: none / Out: numeric |
| `isBonusIgnoreLatitude` | Whether bonus placement ignores latitude | In: none / Out: bool |
| `getGridSize` | Returns (width, height) grid dimensions | In: `argsList[0]` = worldSize / Out: `(w, h)` tuple |

### Core Generation Pipeline

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `generateRandomMap` | Optional master override for entire generation sequence | In: none / Out: none (modifies map via CyPlot API) |
| `beforeInit` | Called before map initialization, sets up globals | In: none / Out: none |
| `beforeGeneration` | Called before generation starts, more API available | In: none / Out: none |
| `generatePlotTypes` | Generates plot type data (OCEAN/COAST/LAND/HILLS/PEAK) | In: none / Out: list of PlotTypes |
| `generateTerrain` | Generates terrain type data (grass/plains/desert/etc.) | In: `argsList` / Out: list of TerrainTypes |
| `addRivers` | Places all rivers on map | In: none / Out: none |
| `getRiverStartCardinalDirection` | Returns starting direction for river segment | In: `argsList[0]` = pPlot / Out: cardinal direction |
| `getRiverAltitude` | Returns altitude at plot (rivers flow downhill) | In: `argsList[0]` = pPlot / Out: int altitude |
| `addLakes` | Places lakes on map | In: none / Out: none |
| `addFeatures` | Places features (forests, jungles, ice, oasis) | In: none / Out: none |
| `addBonuses` | Places bonus resources on map | In: none / Out: none |
| `addBonusType` | Places single bonus type (called per type) | In: `argsList[0]` = iBonusType / Out: none |
| `canPlaceBonusAt` | Validates whether bonus can be placed at plot | In: `argsList[0]` = pPlot / Out: bool |
| `addGoodies` | Places goody huts/ruins | In: none / Out: none |
| `canPlaceGoodyAt` | Validates whether goody can be placed at plot | In: `argsList[0]` = pPlot / Out: bool |
| `afterGeneration` | Final hook after all generation complete | In: none / Out: none |

### Starting Plot Placement & Normalization

| Function | Description | Inputs / Outputs |
|----------|-------------|-----------------|
| `assignStartingPlots` | Master function to assign all starting locations | In: none / Out: none (calls `setStartPlot()`) |
| `findStartingArea` | Determines which continent player should start in | In: `argsList[0]` = playerID / Out: areaID or -1 |
| `findStartingPlot` | Determines exact starting plot for player | In: `argsList[0]` = playerID / Out: plotNum |
| `minStartingDistanceModifier` | Percentage adjustment to min distance between starts | In: none / Out: int (e.g. 50 = +50%) |
| `normalizeStartingPlotLocations` | Adjusts starting locations for team grouping | In: none / Out: none |
| `normalizeAddRiver` | Adds river near starting location | In: none / Out: none |
| `normalizeRemovePeaks` | Removes peaks near starting location | In: none / Out: none |
| `normalizeAddLakes` | Adds lake near starting location | In: none / Out: none |
| `normalizeRemoveBadFeatures` | Removes undesirable features near start | In: none / Out: none |
| `normalizeRemoveBadTerrain` | Removes undesirable terrain near start | In: none / Out: none |
| `normalizeAddFoodBonuses` | Adds food bonuses near starting location | In: none / Out: none |
| `normalizeAddGoodTerrain` | Adds good terrain near starting location | In: none / Out: none |
| `normalizeAddExtras` | Adds extra features/bonuses near start | In: none / Out: none |
| `startHumansOnSameTile` | Forces human players to start on same tile | In: none / Out: bool |

---

## Summary

**Total: 94 functions/methods** across 6 classes and 2 files.

**Key Classes:**
- **FractalWorld** (9 methods) — Base fractal-based generation
- **HintedWorld** (19 methods) — Block-hint continent system
- **HintedWorld.Continent** (6 methods) — Continent representation
- **MultilayeredFractal** (8 methods) — Regional multi-fractal system
- **TerrainGenerator** (5 methods) — Latitude-based terrain assignment
- **FeatureGenerator** (9 methods) — Forest/jungle/ice/oasis placement

**Global Functions:** 5 utility functions + 56 map script interface callbacks

**Generation Pipeline Order:**
`generatePlotTypes` → `generateTerrain` → `addRivers` → `addLakes` → `addFeatures` → `addBonuses` → `assignStartingPlots` → `normalize*`
