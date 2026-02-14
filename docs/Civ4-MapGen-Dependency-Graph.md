# Civ4 Map Generation – File Dependency Graph

Complete inventory of all Python files involved in Civilization IV's map generation logic, traced recursively from `CvMapScriptInterface.py`.

Source: `D:\Games\Civilization IV Complete\Civ4\`

---

## Entry Point

| File | Location |
|------|----------|
| `CvMapScriptInterface.py` | `Assets/Python/EntryPoints/` |

Defines all overridable hooks called by the C++ engine during map generation. Map scripts override these functions to customize generation.

---

## Core Utility Files

| File | Location | Purpose |
|------|----------|---------|
| `CvMapGeneratorUtil.py` | `Assets/Python/` | Core classes: `FractalWorld`, `HintedWorld`, `MultilayeredFractal`, `TerrainGenerator`, `FeatureGenerator`, `findStartingPlot()` |
| `CvUtil.py` | `Assets/Python/` | General utilities (`shuffle()`, debug output, etc.) |
| `CvPythonExtensions` | C++ module (no .py file) | Exposes C++ engine: `CyFractal`, `CyMap`, `CyGlobalContext`, `PlotTypes`, etc. |

---

## Map Scripts (PublicMaps/)

| Script | Key Classes Used | Extra Imports |
|--------|-----------------|---------------|
| `Continents.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Custom_Continents.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Fractal.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Archipelago.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Islands.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Ice_Age.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Shuffle.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Tilted_Axis.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Lakes.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | `sys` |
| `Maze.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Mirror.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | `sys` |
| `Great_Plains.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | `random`, `sys` |
| `Fantasy_Realm.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | `random`, `sys` |
| `Highlands.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | `random`, `sys`, `math.sqrt` |
| `Oasis.py` | `FractalWorld`, `TerrainGenerator`, `FeatureGenerator` | `random`, `sys`, `math` |
| `Pangaea.py` | `MultilayeredFractal`, `HintedWorld`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Terra.py` | `MultilayeredFractal`, `TerrainGenerator`, `FeatureGenerator` | — |
| `Hub.py` | `MultilayeredFractal`, `TerrainGenerator`, `FeatureGenerator` | `math` |
| `Ring.py` | `MultilayeredFractal`, `TerrainGenerator`, `FeatureGenerator` | `math` |
| `Wheel.py` | `MultilayeredFractal`, `TerrainGenerator`, `FeatureGenerator` | `math` |
| `Balanced.py` | `HintedWorld`, `TerrainGenerator`, `FeatureGenerator` | `random`, `sys` |
| `Inland_Sea.py` | `HintedWorld` | `sys` |
| `Team_Battleground.py` | `FractalWorld`, `HintedWorld`, `TerrainGenerator`, `FeatureGenerator` | `sys` |

All 23 map scripts also import `CvPythonExtensions`, `CvUtil`, and `CvMapGeneratorUtil`.

---

## Standard Library Dependencies

- `random` — used by Balanced, Fantasy_Realm, Great_Plains, Highlands, Oasis
- `sys` — used by Balanced, Fantasy_Realm, Great_Plains, Highlands, Inland_Sea, Lakes, Mirror, Oasis, Team_Battleground
- `math` / `math.sqrt` — used by Highlands, Hub, Oasis, Ring, Wheel
- `traceback`, `os` — used by CvUtil.py only

---

## Dependency Graph

```
CvMapScriptInterface.py  (entry point — defines all overridable hooks)
  +-- CvPythonExtensions   (C++ engine bindings)
  +-- CvUtil.py             (shuffle, debug, etc.)
  |     +-- CvPythonExtensions
  |     +-- traceback, os, sys
  |
  v
CvMapGeneratorUtil.py      (THE core file — all generation classes)
  +-- CvPythonExtensions
  +-- CvUtil.py
  +-- random, sys, math.sqrt
  |
  |   Classes defined:
  |   +-- FractalWorld              (basic fractal land generation)
  |   +-- HintedWorld               (extends FractalWorld, block-based continent hints)
  |   |     +-- HintedWorld.Continent  (nested class for continent regions)
  |   +-- MultilayeredFractal       (multi-region fractal layering)
  |   +-- TerrainGenerator          (terrain type assignment by latitude bands)
  |   +-- FeatureGenerator          (forest/jungle/ice/oasis placement)
  |
  |   Standalone functions:
  |   +-- findStartingPlot()
  |   +-- getAreas()
  |   +-- argmin()
  |   +-- pointInRect()
  |   +-- printMap()
  |
  v
23 Map Scripts (PublicMaps/*.py)
  +-- All import: CvPythonExtensions, CvUtil, CvMapGeneratorUtil
  +-- Each uses a subset of the 5 classes above
  +-- NO map script imports another map script (flat structure)
```

---

## File Totals

| Category | Count |
|----------|-------|
| Entry point | 1 (`CvMapScriptInterface.py`) |
| Core utilities | 2 (`CvMapGeneratorUtil.py`, `CvUtil.py`) |
| Map scripts | 23 (in `PublicMaps/`) |
| C++ module | 1 (`CvPythonExtensions`) |
| **Total Python files** | **26** |

---

## Key Observations

1. **Flat dependency chain** — No map script imports another map script. All roads lead through `CvMapGeneratorUtil.py`.
2. **Three plot-generation strategies** — `FractalWorld` (single fractal), `HintedWorld` (block hints + fractal), `MultilayeredFractal` (multi-region overlay). Every map script uses exactly one.
3. **Terrain and features are separate passes** — `TerrainGenerator` assigns terrain types by latitude; `FeatureGenerator` places forests/jungle/ice on top.
4. **CvPythonExtensions is universal** — Every file depends on it for `CyFractal`, `CyMap`, `CyGlobalContext`, `PlotTypes`, `TerrainTypes`, `FeatureTypes`, etc.

---

## Order of Operations (from CvMapScriptInterface.py)

```
beforeInit()
getGridSize()
getTopLatitude() / getBottomLatitude()
isBonusIgnoreLatitude()
getWrapX() / getWrapY()
beforeGeneration()
generateRandomMap()          -- or individually:
  generatePlotTypes()        --   FractalWorld / HintedWorld / MultilayeredFractal
  generateTerrain()          --   TerrainGenerator
addRivers()
addLakes()
addFeatures()                --   FeatureGenerator
addBonuses()
addGoodies()
afterGeneration()
assignStartingPlots()        --   findStartingPlot()
normalizeStartingPlotLocations()
normalize*()                 --   8 normalization sub-functions
startHumansOnSameTile()
```
