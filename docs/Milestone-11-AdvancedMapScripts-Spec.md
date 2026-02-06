# Milestone 11: Advanced Map Scripts — Implementation Specification

## Overview

**Files**:
- `src/game/mapgen/scripts/terra.js`
- `src/game/mapgen/scripts/inlandSea.js`
- `src/game/mapgen/scripts/lakes.js`
- `src/game/mapgen/scripts/oasis.js`
- `src/game/mapgen/scripts/iceAge.js`
- `src/game/mapgen/scripts/mirror.js`

Ports of the six advanced Civ4 BTS map scripts. These scripts make heavy use of the engine classes (HintedWorld, MultilayeredFractal) and override terrain, feature, river, and starting plot systems with script-specific logic.

All scripts conform to the Map Script Interface defined in Milestone 10, §1.

---

## 1. Shared Imports and Helpers

All scripts use the shared helpers from `_helpers.js` (Milestone 10, §3):

```javascript
import {
  resolveGridSize, resolveSeaLevelChange, resolveClimateSettings,
  buildMapResult, findBiggestLandArea
} from './_helpers.js';
```

Plus the engine classes as needed per script.

---

## 2. Script: Terra (`terra.js`)

### 2.1 Overview

Earth-like map with Old World and New World. Uses `MultilayeredFractal` with 12+ regions. The defining mechanic: all players start on the largest landmass (Old World), leaving the New World uninhabited at game start.

**Civ4 source**: `Terra.py` by Bob Thomas (Sirian).

### 2.2 Export

```javascript
export default {
  id: 'terra',
  name: 'Terra',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return -20; },
  customOption: null,

  getGridSize(worldSize) {
    const table = {
      duel:     [13, 8],
      tiny:     [16, 10],
      small:    [21, 13],
      standard: [26, 16],
      large:    [32, 20],
      huge:     [38, 24]
    };
    return table[worldSize] || table.standard;
  },

  generate(settings, rng) { ... }
}
```

### 2.3 Grid Sizes — Enlarged (Largest of Any Script)

| World Size | Grid (cells) | Plots |
|-----------|-------------|-------|
| Duel | 13×8 | 52×32 |
| Tiny | 16×10 | 64×40 |
| Small | 21×13 | 84×52 |
| Standard | 26×16 | 104×64 |
| Large | 32×20 | 128×80 |
| Huge | 38×24 | 152×96 |

### 2.4 Grain by World Size

```javascript
function getTerraGrains(worldSize) {
  switch (worldSize) {
    case 'duel':
    case 'tiny':
      return { archGrain: 3, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
    case 'small':
    case 'standard':
    case 'large':
      return { archGrain: 4, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
    case 'huge':
      return { archGrain: 5, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
    default:
      return { archGrain: 4, contGrain: 2, gaeaGrain: 1, eurasiaGrain: 2 };
  }
}
```

### 2.5 `generate()` — Full Pipeline

```javascript
generate(settings, rng) {
  const { mapSize, climate, seaLevel, numPlayers } = settings;
  const climateConfig = resolveClimateSettings(climate);
  const sea = clamp(resolveSeaLevelChange(seaLevel), -5, 5);
  const grains = getTerraGrains(mapSize);

  const gridSize = this.getGridSize(mapSize);
  const W = gridSize[0] * 4;
  const H = gridSize[1] * 4;

  const iFlags = FRAC_WRAP_X | FRAC_POLAR;

  // Randomization: N/S flip and E/W flip (each 50% chance)
  const roll1 = rng.next() < 0.5;  // N/S flip
  const roll2 = rng.next() < 0.5;  // E/W flip

  // Generate plot types
  const plotTypes1D = generateTerraRegions(W, H, sea, grains, iFlags,
                                            climateConfig, roll1, roll2, rng);

  // Coast tiles
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

  // Default terrain, rivers, features, bonuses
  const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false });
  const terrain1D = tg.generateTerrain(rng, plotTypes1D);

  const riverGen = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
  const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
  const lakes1D = riverGen.addLakes(plotTypes1D);

  const fg = new FeatureGenerator(W, H, {
    jungleLatitude: climateConfig.jungleLatitude,
    wrapX: true, wrapY: false
  });
  const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

  const bg = new BonusGenerator(W, H, {
    numPlayers, wrapX: true, wrapY: false
  });
  const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

  // Starting plots — ALL players on biggest landmass (Old World)
  const starts = assignStartsTerra(
    numPlayers, plotTypes1D, terrain1D, features1D, bonuses1D,
    rivers1D, lakes1D, W, H, rng
  );

  // Normalize with reduced distance modifier
  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: -20,
    wrapX: true, wrapY: false
  });
  sp.normalize(starts, plotTypes1D, terrain1D, features1D,
               bonuses1D, rivers1D, lakes1D, rng);

  return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts);
}
```

### 2.6 `generateTerraRegions()` — 12+ Region Layout

The `thirdworldDimension = 0.125` controls the size of minor subcontinents (Africa, India, Australia).

```javascript
function generateTerraRegions(W, H, sea, grains, iFlags, climateConfig,
                               roll1, roll2, rng) {
  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: sea,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  const { archGrain, contGrain, gaeaGrain, eurasiaGrain } = grains;
  const thirdworldDimension = 0.125;

  // Helper: apply N/S and E/W flips to lat/lon coordinates
  function flipLat(lat) { return roll1 ? (1.0 - lat) : lat; }
  function flipLon(lon) { return roll2 ? (1.0 - lon) : lon; }

  // Convert fractional [westLon, eastLon, southLat, northLat] to plot coords
  function regionParams(westLon, eastLon, southLat, northLat) {
    const wl = flipLon(westLon);
    const el = flipLon(eastLon);
    const sl = flipLat(southLat);
    const nl = flipLat(northLat);

    const actualWest = Math.min(wl, el);
    const actualEast = Math.max(wl, el);
    const actualSouth = Math.min(sl, nl);
    const actualNorth = Math.max(sl, nl);

    const westX = Math.floor(actualWest * W);
    const southY = Math.floor(actualSouth * H);
    const regionW = Math.max(1, Math.floor((actualEast - actualWest) * W));
    const regionH = Math.max(1, Math.floor((actualNorth - actualSouth) * H));

    return { iRegionWestX: westX, iRegionSouthY: southY,
             iRegionWidth: regionW, iRegionHeight: regionH };
  }

  // ── REGION 1: EURASIA (main) ──
  const eurasiaMain = regionParams(0.45, 0.95, 0.45, 0.95);
  mlf.generatePlotsInRegion(rng, {
    ...eurasiaMain,
    iWaterPercent: 55 + sea,
    iRegionGrain: eurasiaGrain,
    iRegionHillsGrain: eurasiaGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: 2,
    has_center_rift: false,
    invert_heights: false
  });

  // ── REGION 2: EURASIA (cohesion) ──
  const cohInsetX = Math.floor(eurasiaMain.iRegionWidth * 0.10);
  const cohInsetY = Math.floor(eurasiaMain.iRegionHeight * 0.25);
  mlf.generatePlotsInRegion(rng, {
    iRegionWestX: eurasiaMain.iRegionWestX + cohInsetX,
    iRegionSouthY: eurasiaMain.iRegionSouthY + cohInsetY,
    iRegionWidth: eurasiaMain.iRegionWidth - 2 * cohInsetX,
    iRegionHeight: eurasiaMain.iRegionHeight - 2 * cohInsetY,
    iWaterPercent: 60 + sea,
    iRegionGrain: gaeaGrain,
    iRegionHillsGrain: gaeaGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 3: NORTH AMERICA ──
  const nAmerica = regionParams(0.05, 0.35, 0.52, 0.85);
  mlf.generatePlotsInRegion(rng, {
    ...nAmerica,
    iWaterPercent: 61 + sea,
    iRegionGrain: contGrain,
    iRegionHillsGrain: contGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: -1
  });

  // ── REGION 4: SOUTH AMERICA ──
  const sAmerica = regionParams(0.05, 0.30, 0.25, 0.47);
  mlf.generatePlotsInRegion(rng, {
    ...sAmerica,
    iWaterPercent: 55 + sea,
    iRegionGrain: contGrain,
    iRegionHillsGrain: contGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: true,
    iStrip: 15,
    rift_grain: -1
  });

  // ── REGION 5: SOUTH AMERICA TIP ──
  const sTip = regionParams(0.10, 0.25, 0.18, 0.30);
  mlf.generatePlotsInRegion(rng, {
    ...sTip,
    iWaterPercent: 67 + sea,
    iRegionGrain: contGrain,
    iRegionHillsGrain: contGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 6: YUKON ──
  const yukon = regionParams(0.05, 0.25, 0.75, 0.93);
  mlf.generatePlotsInRegion(rng, {
    ...yukon,
    iWaterPercent: 68 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 7: ARCTIC ISLANDS ──
  const arctic = regionParams(0.05, 0.35, 0.88, 0.97);
  mlf.generatePlotsInRegion(rng, {
    ...arctic,
    iWaterPercent: 76 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 8: CENTRAL AMERICA ──
  const cAmerica = regionParams(0.10, 0.30, 0.45, 0.55);
  mlf.generatePlotsInRegion(rng, {
    ...cAmerica,
    iWaterPercent: 60 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 9: CARIBBEAN ──
  const carib = regionParams(0.15, 0.35, 0.40, 0.52);
  mlf.generatePlotsInRegion(rng, {
    ...carib,
    iWaterPercent: 75 + sea,
    iRegionGrain: archGrain,
    iRegionHillsGrain: archGrain + 1,
    iRegionPlotFlags: iFlags,
    iRegionTerrainFlags: iFlags,
    bShift: false,
    rift_grain: -1
  });

  // ── REGION 10: LARGE SUBCONTINENT (Africa) ──
  addTerraSubcontinent(mlf, rng, regionParams, 0.55, 0.80, 0.20, 0.45,
                        thirdworldDimension, sea, contGrain, archGrain, iFlags, 'large');

  // ── REGION 11: SMALL SUBCONTINENT (India) ──
  addTerraSubcontinent(mlf, rng, regionParams, 0.80, 0.95, 0.35, 0.55,
                        thirdworldDimension, sea, contGrain, archGrain, iFlags, 'small');

  // ── REGIONS 12+: MINOR REGIONS (Australia/Antarctica) ──
  const numMinor = 2 + rng.nextInt(0, 2);  // 2-4 minor regions
  const minorSlots = [
    [0.75, 0.95, 0.10, 0.30],  // SE (Australia)
    [0.45, 0.70, 0.05, 0.18],  // S  (Antarctica fragment)
    [0.60, 0.80, 0.08, 0.22],  // SE fragment
    [0.85, 0.98, 0.15, 0.35]   // Far E island
  ];
  for (let i = 0; i < numMinor && i < minorSlots.length; i++) {
    const [wl, el, sl, nl] = minorSlots[i];
    const minor = regionParams(wl, el, sl, nl);
    const minorWater = 60 + rng.nextInt(0, 10) + sea;
    mlf.generatePlotsInRegion(rng, {
      ...minor,
      iWaterPercent: minorWater,
      iRegionGrain: archGrain,
      iRegionHillsGrain: archGrain + 1,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: false,
      rift_grain: -1
    });
  }

  // Extract 1D plot array
  const plotTypes1D = new Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      plotTypes1D[y * W + x] = mlf.getPlotType(x, y);
    }
  }
  return plotTypes1D;
}
```

### 2.7 `addTerraSubcontinent()` — Shape-Varied Subcontinent

```javascript
function addTerraSubcontinent(mlf, rng, regionParams, westLon, eastLon,
                               southLat, northLat, dim, sea,
                               contGrain, archGrain, iFlags, size) {
  const shape = rng.nextInt(0, 4);
  const region = regionParams(westLon, eastLon, southLat, northLat);

  if (shape > 1) {
    // 60% — Standard subcontinent
    mlf.generatePlotsInRegion(rng, {
      ...region,
      iWaterPercent: (size === 'large' ? 55 : 60) + sea,
      iRegionGrain: contGrain,
      iRegionHillsGrain: contGrain + 1,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: true,
      iStrip: 15,
      rift_grain: -1
    });
  } else if (shape === 1) {
    // 20% — Irregular
    mlf.generatePlotsInRegion(rng, {
      ...region,
      iWaterPercent: 66 + sea,
      iRegionGrain: contGrain + 1,
      iRegionHillsGrain: contGrain + 2,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: true,
      iStrip: 15,
      rift_grain: 2,
      has_center_rift: false
    });
  } else {
    // 20% — Archipelago-style
    mlf.generatePlotsInRegion(rng, {
      ...region,
      iWaterPercent: 75 + sea,
      iRegionGrain: archGrain,
      iRegionHillsGrain: archGrain + 1,
      iRegionPlotFlags: iFlags,
      iRegionTerrainFlags: iFlags,
      bShift: false,
      rift_grain: -1
    });
  }
}
```

### 2.8 Starting Plots — Old World Only

All players start on the biggest landmass. Uses the same `assignStartsPangaea()` pattern from Milestone 10, §7.10, but with `minStartingDistanceModifier = -20`.

```javascript
function assignStartsTerra(numPlayers, plotTypes1D, terrain1D, features1D,
                            bonuses1D, rivers1D, lakes1D, W, H, rng) {
  // Identical to Pangaea's assignStartsPangaea() — all players on biggest area
  // Uses minStartingDistanceModifier = -20
  const { areaId: biggestAreaId, areas } = findBiggestLandArea(plotTypes1D, W, H, true);

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: -20,
    wrapX: true, wrapY: false
  });

  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      if (areas[idx] !== biggestAreaId) continue;
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const baseRange = sp._startingPlotRange(numPlayers);
  let minDist = baseRange;
  const starts = [];

  for (let pass = 0; pass < 50 && starts.length < numPlayers; pass++) {
    for (const candidate of candidates) {
      if (starts.length >= numPlayers) break;
      if (starts.some(s => s.x === candidate.x && s.y === candidate.y)) continue;
      let tooClose = false;
      for (const existing of starts) {
        if (sp._wrappedDistance(candidate.x, candidate.y, existing.x, existing.y) < minDist) {
          tooClose = true; break;
        }
      }
      if (!tooClose) starts.push({ x: candidate.x, y: candidate.y });
    }
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}
```

---

## 3. Script: Inland Sea (`inlandSea.js`)

### 3.1 Overview

Mediterranean-type map: ring of land around a central sea. Unique properties: **no wrapping** in either axis, compressed latitude (no snow/ice terrain), rivers flow toward center, and template-based starting positions.

**Civ4 source**: `Inland_Sea.py` by Bob Thomas (Sirian), Soren Johnson, and Andy Szybalski.

### 3.2 Export

```javascript
export default {
  id: 'inland_sea',
  name: 'Inland Sea',
  getWrapX()  { return false; },    // ← unique: no X wrap
  getWrapY()  { return false; },
  getTopLatitude()    { return 60; },
  getBottomLatitude() { return -60; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return -95; },
  customOption: null,

  getGridSize(worldSize) {
    const table = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [13, 8],
      large:    [16, 10],
      huge:     [21, 13]
    };
    return table[worldSize] || table.standard;
  },

  generate(settings, rng) { ... }
}
```

### 3.3 Plot Generation — HintedWorld Ring

```javascript
function generateInlandSeaPlots(W, H, seaLevelChange, climateConfig, rng) {
  const hw = new HintedWorld(W, H, 4, 2, {
    seaLevelChange,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: false,    // ← no wrap
    wrapY: false
  });

  // Border cells = land (ring), interior cells = ocean (sea)
  for (let bx = 0; bx < 4; bx++) {
    for (let by = 0; by < 2; by++) {
      if (bx === 0 || bx === 3 || by === 0 || by === 1) {
        // Border: land
        hw.setValue(bx, by, 200 + rng.nextInt(0, 54));
      } else {
        // Interior: ocean (this won't fire for 4×2 grid since all are border)
        hw.setValue(bx, by, 0);
      }
    }
  }

  // For a 4×2 grid, all cells are border cells (land).
  // The center sea comes from the fractal interplay: the HintedWorld's
  // hint values create a ring shape because the interior of the hint grid
  // (interpolated) will naturally have lower values at the center.
  // Alternatively, for a 4×2 grid, manually force interior-ish blocks low:
  hw.setValue(1, 0, 0);  // inner bottom-left
  hw.setValue(2, 0, 0);  // inner bottom-right
  hw.setValue(1, 1, 0);  // inner top-left
  hw.setValue(2, 1, 0);  // inner top-right

  // Wait — for a 4-wide, 2-tall grid, the "border" is the outer ring.
  // The 4 corner cells and 4 edge cells make up all 8 cells.
  // Actually: with 4×2, border = {x=0, x=3, y=0, y=1} = ALL cells.
  // So Civ4 Inland Sea uses HintedWorld(4,2) where:
  //   Border cells (all 8) = land values (200+)
  //   Interior would need a 6×4 minimum to have interior cells.
  //
  // In Civ4, the Inland Sea script sets:
  //   Border cells = 200 + random (land)
  //   Interior cells = 0 (water)
  // With a 4×2 grid, it specifically means:
  //   All 4 corner and edge cells = land
  //   The fractal interpolation between border land cells naturally
  //   creates a sea in the center due to fractal noise pulling values down.

  // Correct approach per Civ4: use the block grid to create a ring
  // where border blocks are land and center blocks are water.
  // With 4×2, border blocks ARE all blocks, so the sea comes from the fractal.
  // The HintedWorld hint initialization creates the ring effect.

  return hw.generatePlotTypes(rng, {
    water_percent: -1,           // auto-calculate from hints
    shift_plot_types: false      // no shifting (no wrap)
  });
}
```

### 3.4 Custom Terrain Generator — Latitude Compression

Inland Sea compresses latitude to range [0.07, 0.63], eliminating snow/ice terrain and pure tropical:

```javascript
function createISTerrainGenerator(W, H) {
  return new TerrainGenerator(W, H, {
    wrapX: false,
    wrapY: false,
    // Override getLatitudeAtPlot via settings
    latitudeTransform: (lat) => 0.07 + 0.56 * lat
    // Result: lat range [0.07, 0.63]
    // 0.63 < 0.7 → no snow
    // 0.07 < 0.1 → forced grass near equator still active but compressed
  });
}
```

**Implementation note**: If `TerrainGenerator` doesn't support a `latitudeTransform` callback, create a subclass:

```javascript
class ISTerrainGenerator extends TerrainGenerator {
  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return 0.07 + 0.56 * baseLat;  // Compress to [0.07, 0.63]
  }
}
```

Apply the same compression to the FeatureGenerator:

```javascript
class ISFeatureGenerator extends FeatureGenerator {
  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return 0.07 + 0.56 * baseLat;
  }
}
```

### 3.5 Custom River System — Flow Toward Center

Rivers flow toward the inland sea (map center) instead of downhill:

```javascript
function addInlandSeaRivers(rng, plotTypes1D, terrain1D, W, H) {
  const rg = new RiverGenerator(W, H, { wrapX: false, wrapY: false });

  // Override altitude: Manhattan distance from center × 20
  // Higher at edges, lower at center → rivers flow inward
  const altitudes = new Array(W * H);
  const centerX = Math.floor(W / 2);
  const centerY = Math.floor(H / 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
      altitudes[y * W + x] = dist * 20 + rng.nextInt(0, 9);
    }
  }

  // Use RiverGenerator with custom altitudes
  // If RiverGenerator doesn't support custom altitudes, manually implement
  // the river placement using the altitude array
  return rg.addRiversWithAltitudes(rng, plotTypes1D, terrain1D, altitudes);
}
```

**If `RiverGenerator` doesn't support custom altitudes**, implement a simplified river system that:
1. Sorts land tiles by Manhattan distance from center (farthest first)
2. For each candidate, traces a path toward the center, placing river edges
3. Stops when reaching water

### 3.6 Template-Based Starting Positions

Inland Sea uses exhaustive templates defining starting positions for 1-18 players:

```javascript
// Template instance counts by player count (index 0=unused, 1=1 player, ...)
const TEMPLATE_COUNTS = [0, 1, 6, 4, 3, 2, 2, 2, 4, 2, 2, 2, 1, 2, 1, 2, 1, 2, 1];

// Each template entry: [fLat, fLon, xVariance, yVariance]
// Positions ring the map edges
const TEMPLATES = {
  1: [  // 1 player: single template
    [[0.5, 0.1, 2, 2]]
  ],
  2: [  // 2 players: 6 templates (random selection)
    [[0.5, 0.1, 2, 2], [0.5, 0.9, 2, 2]],
    [[0.1, 0.5, 2, 2], [0.9, 0.5, 2, 2]],
    [[0.2, 0.1, 2, 2], [0.8, 0.9, 2, 2]],
    [[0.8, 0.1, 2, 2], [0.2, 0.9, 2, 2]],
    [[0.2, 0.2, 2, 2], [0.8, 0.8, 2, 2]],
    [[0.8, 0.2, 2, 2], [0.2, 0.8, 2, 2]]
  ],
  // ... templates for 3-18 players
  // Each template places players around the ring edges
  // Simplified: for player counts not explicitly templated, use regular StartingPlots
};
```

**Template-based assignment algorithm:**

```javascript
function assignStartsInlandSea(numPlayers, plotTypes1D, terrain1D, features1D,
                                bonuses1D, rivers1D, lakes1D, W, H, rng) {
  const templates = TEMPLATES[numPlayers];

  if (!templates || templates.length === 0) {
    // Fallback to default StartingPlots for unsupported player counts
    const sp = new StartingPlots(W, H, {
      minStartingDistanceModifier: -95,
      wrapX: false, wrapY: false
    });
    return sp.assignStartingPlots(numPlayers, rng, plotTypes1D, terrain1D,
                                   features1D, bonuses1D, rivers1D, lakes1D);
  }

  // Pick random template
  const templateIdx = rng.nextInt(0, templates.length - 1);
  const template = templates[templateIdx];

  const starts = [];
  const maxPasses = 50;

  for (const [fLat, fLon, xVar, yVar] of template) {
    const targetX = Math.floor(fLon * W);
    const targetY = Math.floor(fLat * H);

    let best = null;
    let bestScore = -Infinity;

    // Search within variance radius for best tile
    for (let pass = 0; pass < maxPasses; pass++) {
      const searchRadius = xVar + pass;  // expand each pass

      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const nx = targetX + dx;
          const ny = targetY + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;

          const idx = ny * W + nx;
          if (plotTypes1D[idx] === PLOT.OCEAN || plotTypes1D[idx] === PLOT.COAST ||
              plotTypes1D[idx] === PLOT.PEAK) continue;

          // Check distance from existing starts
          let tooClose = false;
          for (const s of starts) {
            const dist = Math.sqrt((nx - s.x) ** 2 + (ny - s.y) ** 2);
            if (dist < 3) { tooClose = true; break; }
          }
          if (tooClose) continue;

          // Score this tile
          const score = scoreCitySite(nx, ny, plotTypes1D, terrain1D,
                                       features1D, bonuses1D, W, H, false);
          if (score > bestScore) {
            bestScore = score;
            best = { x: nx, y: ny };
          }
        }
      }

      if (best) break;
    }

    if (best) starts.push(best);
    else starts.push({ x: targetX, y: targetY });  // fallback
  }

  return starts;
}
```

### 3.7 Normalization

All normalization passes enabled (default), but the extreme `minStartingDistanceModifier = -95` allows very close starts.

---

## 4. Script: Lakes (`lakes.js`)

### 4.1 Overview

Oceanless planet with many small lakes. Uses **inverted fractal** (`invert_heights=true`) so what would be ocean basins become land plateaus. Very simple script.

**Civ4 source**: `Lakes.py` by Andy Szybalski and Bob Thomas (Sirian).

### 4.2 Export

```javascript
export default {
  id: 'lakes',
  name: 'Lakes',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return -15; },
  customOption: null,

  getGridSize(worldSize) {
    const table = {
      duel:     [6, 4],
      tiny:     [8, 5],
      small:    [10, 6],
      standard: [13, 8],
      large:    [16, 10],
      huge:     [21, 13]
    };
    return table[worldSize] || table.standard;
  },

  generate(settings, rng) { ... }
}
```

### 4.3 `generate()` — Inverted Fractal

```javascript
generate(settings, rng) {
  const { mapSize, climate, seaLevel, numPlayers } = settings;
  const climateConfig = resolveClimateSettings(climate);
  const seaLevelChange = resolveSeaLevelChange(seaLevel);

  const gridSize = this.getGridSize(mapSize);
  const W = gridSize[0] * 4;
  const H = gridSize[1] * 4;

  // Create FractalWorld with clamped sea level
  const fw = new FractalWorld(W, H, {
    seaLevelChange,
    seaLevelMin: 7,     // ← clamp water to [7%, 14%]
    seaLevelMax: 14,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  fw.initFractal(rng, {
    continent_grain: 3,
    rift_grain: -1,            // no rift
    has_center_rift: false,
    invert_heights: true,      // ← KEY: inverted fractal
    polar: false               // no polar attenuation (already mostly land)
  });

  const plotTypes1D = fw.generatePlotTypes(rng, {
    water_percent: 10,         // low water (clamped to 7-14)
    grain_amount: 3,
    shift_plot_types: true
  });

  // Force polar ice rows: y=0 and y=max become ocean
  for (let x = 0; x < W; x++) {
    plotTypes1D[0 * W + x] = PLOT.OCEAN;
    plotTypes1D[(H - 1) * W + x] = PLOT.OCEAN;
  }

  // Standard pipeline from here
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, true, false);

  const tg = new TerrainGenerator(W, H, { wrapX: true, wrapY: false });
  const terrain1D = tg.generateTerrain(rng, plotTypes1D);

  const riverGen = new RiverGenerator(W, H, { wrapX: true, wrapY: false });
  const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
  const lakes1D = riverGen.addLakes(plotTypes1D);

  const fg = new FeatureGenerator(W, H, {
    jungleLatitude: climateConfig.jungleLatitude,
    wrapX: true, wrapY: false
  });
  const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);

  const bg = new BonusGenerator(W, H, {
    numPlayers, wrapX: true, wrapY: false
  });
  const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);

  // Starting plots — all on biggest area
  const starts = assignStartsBiggestArea(
    numPlayers, plotTypes1D, terrain1D, features1D, bonuses1D,
    rivers1D, lakes1D, W, H, -15, true, rng
  );

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: -15,
    wrapX: true, wrapY: false
  });
  sp.normalize(starts, plotTypes1D, terrain1D, features1D,
               bonuses1D, rivers1D, lakes1D, rng);

  return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts);
}
```

### 4.4 `seaLevelMin` / `seaLevelMax` Support

FractalWorld needs to support clamping the final water percent to a custom range. If not already implemented, add to `FractalWorld.generatePlotTypes()`:

```javascript
// After applying seaLevelChange:
adjustedWaterPercent = clamp(adjustedWaterPercent,
  this.seaLevelMin || 0,
  this.seaLevelMax || 100
);
```

---

## 5. Script: Oasis (`oasis.js`)

### 5.1 Overview

Desert world between two fertile bands. **No wrapping**, latitude range [0°, 40°], **no climate/sea level options**, starts as all-land with water layered on top, custom 4-band terrain, Nile-style rivers, regional bonus placement, and **all normalizations disabled**.

**Civ4 source**: `Oasis.py` by Bob Thomas (Sirian).

### 5.2 Export

```javascript
export default {
  id: 'oasis',
  name: 'Oasis',
  getWrapX()  { return false; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 40; },
  getBottomLatitude() { return 0; },
  isClimateMap()  { return false; },   // no climate option
  isSeaLevelMap() { return false; },   // no sea level option
  minStartingDistanceModifier() { return -35; },
  customOption: null,

  getGridSize(worldSize) {
    // Uses default grid sizes
    return null;
  },

  generate(settings, rng) { ... }
}
```

### 5.3 Plot Generation — All-Land Base + Water Overlay

```javascript
function generateOasisPlots(W, H, rng) {
  const mlf = new MultilayeredFractal(W, H, {
    seaLevelChange: 0,
    hillGroupOneRange: 9,
    hillGroupTwoRange: 9,
    peakPercent: 4,
    wrapX: false, wrapY: false
  });

  // KEY: Initialize all plots as LAND (not OCEAN)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      mlf.setPlotType(x, y, PLOT.LAND);
    }
  }

  // Force ocean at top rows (northern coast)
  const oceanRows = Math.max(2, Math.floor(H * 0.08));
  for (let y = H - oceanRows; y < H; y++) {
    for (let x = 0; x < W; x++) {
      mlf.setPlotType(x, y, PLOT.OCEAN);
    }
  }

  // Fractalize the northern coastline (partial water overlay)
  const coastRegionH = Math.floor(H * 0.25);
  mlf.generatePlotsInRegion(rng, {
    iWaterPercent: 65,
    iRegionWidth: W,
    iRegionHeight: coastRegionH,
    iRegionWestX: 0,
    iRegionSouthY: H - coastRegionH,
    iRegionGrain: 2,
    iRegionHillsGrain: 3,
    iRegionPlotFlags: 0,  // no wrap, no polar
    iRegionTerrainFlags: 0,
    bShift: false,
    rift_grain: -1
  });

  // Force land in southern portion (fertile band)
  const landRows = Math.floor(H * 0.15);
  for (let y = 0; y < landRows; y++) {
    for (let x = 0; x < W; x++) {
      if (mlf.getPlotType(x, y) === PLOT.OCEAN) {
        mlf.setPlotType(x, y, PLOT.LAND);
      }
    }
  }

  // Add hills using separate fractal
  const iFlags = 0;  // no wrap, no polar
  const hillsFrac = new CyFractal();
  hillsFrac.fracInit(W, H, 3, rng, iFlags);
  const peaksFrac = new CyFractal();
  peaksFrac.fracInit(W, H, 4, rng, iFlags);

  const hillsBottom1 = hillsFrac.getHeightFromPercent(20);
  const hillsTop1 = hillsFrac.getHeightFromPercent(30);
  const hillsBottom2 = hillsFrac.getHeightFromPercent(70);
  const hillsTop2 = hillsFrac.getHeightFromPercent(80);
  const peakThreshold = peaksFrac.getHeightFromPercent(25);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (mlf.getPlotType(x, y) !== PLOT.LAND) continue;

      const hv = hillsFrac.getHeight(x, y);
      if ((hv >= hillsBottom1 && hv <= hillsTop1) ||
          (hv >= hillsBottom2 && hv <= hillsTop2)) {
        const pv = peaksFrac.getHeight(x, y);
        if (pv <= peakThreshold) {
          mlf.setPlotType(x, y, PLOT.PEAK);
        } else {
          mlf.setPlotType(x, y, PLOT.HILLS);
        }
      }
    }
  }

  // Extract 1D
  const plotTypes1D = new Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      plotTypes1D[y * W + x] = mlf.getPlotType(x, y);
    }
  }
  return plotTypes1D;
}
```

### 5.4 Custom Terrain Generator — 4-Band System

```javascript
class OasisTerrainGenerator extends TerrainGenerator {
  constructor(W, H) {
    super(W, H, {
      wrapX: false, wrapY: false,
      // Defaults overridden below
      iDesertPercent: 32,
      iPlainsPercent: 18
    });
    this.iOasisGrassPercent = 9;
    this.iOasisPlainsPercent = 16;
    this.iOasisTopLatitude = 0.69;
    this.iOasisBottomLatitude = 0.30;
  }

  generateTerrainAtPlot(x, y, plotType) {
    if (plotType === PLOT.OCEAN || plotType === PLOT.COAST) {
      return plotType === PLOT.COAST ? TERRAIN.COAST : TERRAIN.OCEAN;
    }

    const lat = this.getLatitudeAtPlot(x, y);

    // Band 1: Northern fertile (> 0.69)
    if (lat > this.iOasisTopLatitude) {
      // Plains vs grass fractal
      const plainsVal = this.plainsFrac.getHeight(x, y);
      const plainsThreshold = this.plainsFrac.getHeightFromPercent(50);
      return plainsVal >= plainsThreshold ? TERRAIN.PLAINS : TERRAIN.GRASSLAND;
    }

    // Band 2: Jungle zone (< 0.14)
    if (lat < 0.14) {
      return TERRAIN.GRASSLAND;  // forced grass for jungle
    }

    // Band 3: Southern fertile (0.14 - 0.30)
    if (lat < this.iOasisBottomLatitude) {
      const roll = this._rng.next();
      if (roll < 0.50) return TERRAIN.GRASSLAND;
      if (roll < 0.85) return TERRAIN.PLAINS;
      return TERRAIN.DESERT;
    }

    // Band 4: Oasis/desert zone (0.30 - 0.69)
    const roll = this._rng.next();
    if (roll < this.iOasisGrassPercent / 100) return TERRAIN.GRASSLAND;
    if (roll < (this.iOasisGrassPercent + this.iOasisPlainsPercent) / 100) return TERRAIN.PLAINS;
    return TERRAIN.DESERT;
  }
}
```

### 5.5 Nile-Style Rivers

4 rivers, one per map quadrant. Each flows roughly north with directional bias:

```javascript
function addNileRivers(rng, plotTypes1D, terrain1D, W, H, mapSize) {
  const rivers1D = new Array(W * H).fill(null).map(() => ({
    isNOfRiver: false, isWOfRiver: false,
    riverNSDirection: null, riverWEDirection: null
  }));

  // Max lateral shift per step (by world size)
  const maxShiftTable = {
    duel: 1, tiny: 2, small: 3, standard: 5, large: 7, huge: 9
  };
  const maxShift = maxShiftTable[mapSize] || 5;

  // 4 rivers, one per quadrant
  const quadrants = [
    { startX: Math.floor(W * 0.25), startY: 0 },     // SW quadrant
    { startX: Math.floor(W * 0.75), startY: 0 },     // SE quadrant
    { startX: Math.floor(W * 0.25), startY: Math.floor(H * 0.5) },  // NW
    { startX: Math.floor(W * 0.75), startY: Math.floor(H * 0.5) }   // NE
  ];

  for (const { startX, startY } of quadrants) {
    let x = startX;
    let y = startY;

    // Flow north (increasing y) with lateral drift
    while (y < H - 1) {
      const idx = y * W + x;

      // Direction: 60% north, 20% west, 20% east
      const roll = rng.next();
      let dx = 0;
      if (roll < 0.60) {
        // North: place river on north edge
        rivers1D[idx].isNOfRiver = true;
        rivers1D[idx].riverNSDirection = rng.next() < 0.5 ? 'E' : 'W';
        y++;
      } else if (roll < 0.80) {
        // West
        dx = -1;
        if (x + dx >= 0 && x + dx < W) {
          rivers1D[idx].isWOfRiver = true;
          rivers1D[idx].riverWEDirection = 'N';
          x += dx;
        } else {
          rivers1D[idx].isNOfRiver = true;
          rivers1D[idx].riverNSDirection = 'W';
          y++;
        }
      } else {
        // East
        dx = 1;
        if (x + dx >= 0 && x + dx < W) {
          const eidx = y * W + (x + dx);
          rivers1D[eidx].isWOfRiver = true;
          rivers1D[eidx].riverWEDirection = 'N';
          x += dx;
        } else {
          rivers1D[idx].isNOfRiver = true;
          rivers1D[idx].riverNSDirection = 'E';
          y++;
        }
      }

      // Clamp lateral drift
      if (Math.abs(x - startX) > maxShift) {
        x = startX + (x > startX ? maxShift : -maxShift);
      }

      // Stop at water
      if (y < H && (plotTypes1D[y * W + x] === PLOT.OCEAN ||
                     plotTypes1D[y * W + x] === PLOT.COAST)) {
        break;
      }
    }
  }

  return rivers1D;
}
```

### 5.6 Regional Bonus Placement

Oasis places different resources in different zones:

```javascript
const OASIS_RESOURCES = {
  oasis: ['aluminum', 'iron', 'oil', 'stone', 'gold', 'incense', 'ivory'],
  north: ['horse', 'marble', 'fur', 'silver', 'spices', 'wine',
          'whale', 'clam', 'crab', 'fish', 'sheep', 'wheat'],
  south: ['dye', 'fur', 'gems', 'silk', 'sugar', 'banana', 'deer', 'pig', 'rice']
};
```

**Implementation**: Override `BonusGenerator.addBonuses()` to restrict each resource to its zone based on latitude.

### 5.7 All Normalizations Disabled

```javascript
const sp = new StartingPlots(W, H, {
  minStartingDistanceModifier: -35,
  skipNormalization: true,        // ← ALL normalizations disabled
  wrapX: false, wrapY: false
});
```

---

## 6. Script: Ice Age (`iceAge.js`)

### 6.1 Overview

Frozen wasteland with habitable equatorial center. Extra-wide, short maps. Custom terrain (more plains, lower snow threshold), aggressive ice placement extending far from poles, and a landmass type custom option.

**Civ4 source**: `Ice_Age.py` by Bob Thomas (Sirian).

### 6.2 Export

```javascript
export default {
  id: 'ice_age',
  name: 'Ice Age',
  getWrapX()  { return true; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return true; },
  minStartingDistanceModifier() { return 0; },

  customOption: {
    name: 'Landmass Type',
    values: ['Random', 'Wide Continents', 'Narrow Continents', 'Islands', 'Small Islands'],
    default: 0
  },

  getGridSize(worldSize) {
    const table = {
      duel:     [10, 4],
      tiny:     [13, 5],
      small:    [16, 7],
      standard: [21, 9],
      large:    [26, 11],
      huge:     [32, 13]
    };
    return table[worldSize] || table.standard;
  },

  generate(settings, rng) { ... }
}
```

### 6.3 Custom Option Resolution

```javascript
function resolveIceAgeGrain(customOption, rng) {
  if (customOption === 1) {
    // Wide Continents: grain 1 or 2 with rift
    return rng.next() < 0.5
      ? { grain: 1, rift_grain: -1 }
      : { grain: 2, rift_grain: 2 };
  }
  if (customOption === 2) return { grain: 3, rift_grain: -1 };
  if (customOption === 3) return { grain: 4, rift_grain: -1 };
  if (customOption === 4) return { grain: 5, rift_grain: -1 };

  // Random (D20 weighted)
  const roll = rng.nextInt(0, 19);
  if (roll <= 1)  return { grain: 1, rift_grain: -1 };     // 10% Pangaea
  if (roll <= 4)  return { grain: 2, rift_grain: 2 };      // 15% Wide
  if (roll <= 9)  return { grain: 3, rift_grain: -1 };     // 25% Narrow
  if (roll <= 16) return { grain: 4, rift_grain: -1 };     // 35% Islands
  return { grain: 5, rift_grain: -1 };                      // 15% Tiny
}
```

### 6.4 Plot Generation

```javascript
function generateIceAgePlots(W, H, seaLevelChange, climateConfig,
                              grainConfig, rng) {
  const fw = new FractalWorld(W, H, {
    seaLevelChange,
    seaLevelMin: 60,    // ← water locked to [60%, 72%]
    seaLevelMax: 72,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: true, wrapY: false
  });

  fw.initFractal(rng, {
    continent_grain: grainConfig.grain,
    rift_grain: grainConfig.rift_grain,
    has_center_rift: grainConfig.rift_grain >= 0,
    invert_heights: false,
    polar: true
  });

  return fw.generatePlotTypes(rng, {
    water_percent: 65,
    grain_amount: 3,
    shift_plot_types: true
  });
}
```

### 6.5 Custom Terrain Generator

```javascript
class IceAgeTerrainGenerator extends TerrainGenerator {
  constructor(W, H) {
    super(W, H, {
      iDesertPercent: 20,           // reduced (normally 32)
      iPlainsPercent: 50,           // dramatically increased (normally 18)
      fSnowLatitude: 0.4,          // much colder (normally 0.7)
      fTundraLatitude: 0.3,        // much colder (normally 0.6)
      fGrassLatitude: 0.1,
      fDesertBottomLatitude: 0.1,  // narrower band (normally 0.2)
      fDesertTopLatitude: 0.2,     // narrower band (normally 0.5)
      wrapX: true, wrapY: false
    });
  }

  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return baseLat * 0.6;  // Compress latitude (shorter map)
  }
}
```

### 6.6 Custom Feature Generator — Aggressive Ice

```javascript
class IceAgeFeatureGenerator extends FeatureGenerator {
  constructor(W, H) {
    super(W, H, {
      iJunglePercent: 30,    // reduced (normally 80)
      iForestPercent: 50,    // reduced (normally 60)
      jungle_grain: 7,       // finer grain
      jungleLatitude: 0.00,  // no jungle (ice age)
      wrapX: true, wrapY: false
    });
  }

  getLatitudeAtPlot(x, y) {
    const baseLat = super.getLatitudeAtPlot(x, y);
    return baseLat * 0.6;  // Same latitude compression as terrain
  }

  addIceAtPlot(x, y, lat, plotTypes, features, rng) {
    const idx = y * this.iNumPlotsX + x;
    if (plotTypes[idx] !== PLOT.OCEAN && plotTypes[idx] !== PLOT.COAST) return;

    // Edge rows: always ice
    if (y === 0 || y === this.iNumPlotsY - 1) {
      features[idx] = FEATURE.ICE;
      return;
    }

    // Standard dense/sparse bands (from parent class)
    super.addIceAtPlot(x, y, lat, plotTypes, features, rng);

    // Additional aggressive ice bands (Ice Age specific)
    if (features[idx] !== FEATURE.NONE) return;  // already has ice

    if (lat > 0.47) {
      if (rng.next() < 8.0 * (lat - 0.50)) { features[idx] = FEATURE.ICE; return; }
      if (rng.next() < 4.0 * (lat - 0.46)) { features[idx] = FEATURE.ICE; return; }
    }
    if (lat > 0.39 && rng.next() < 0.06) { features[idx] = FEATURE.ICE; return; }
    if (lat > 0.32 && rng.next() < 0.04) { features[idx] = FEATURE.ICE; return; }
    if (lat > 0.27 && rng.next() < 0.02) { features[idx] = FEATURE.ICE; return; }
  }
}
```

---

## 7. Script: Mirror (`mirror.js`)

### 7.1 Overview

Generates half a map, then mirrors it for symmetrical team play. Three custom options (mirror type, team setting, landmass type). Multi-stage mirroring pipeline with river direction corrections. **All normalizations disabled.**

**Civ4 source**: `Mirror.py` by Bob Thomas (Sirian).

### 7.2 Export

```javascript
export default {
  id: 'mirror',
  name: 'Mirror',
  getWrapX()  { return false; },
  getWrapY()  { return false; },
  getTopLatitude()    { return 90; },
  getBottomLatitude() { return -90; },
  isClimateMap()  { return true; },
  isSeaLevelMap() { return false; },   // no sea level option
  minStartingDistanceModifier() { return -65; },

  customOption: {
    name: 'Mirror Type',
    values: ['Reflection', 'Inversion', 'Copy', 'Opposite'],
    default: 0
  },

  // Note: Civ4 has 3 options (Mirror Type, Team Setting, Landmass Type)
  // For simplicity, we implement Mirror Type as the primary custom option.
  // Team Setting is single-player irrelevant.
  // Landmass Type defaults to "Varied" (random).

  getGridSize(worldSize) {
    // Uses default grid sizes
    return null;
  },

  generate(settings, rng) { ... }
}
```

### 7.3 Mirror Transform Functions

Each mirror type defines how to compute the mirrored coordinate from the source coordinate:

```javascript
const MIRROR_TRANSFORMS = {
  reflection: (x, y, W, H) => ({ x: W - x - 1, y: y }),
  inversion:  (x, y, W, H) => ({ x: W - x - 1, y: H - y - 1 }),
  copy:       (x, y, W, H) => ({ x: (x + Math.floor(W / 2)) % W, y: y }),
  opposite:   (x, y, W, H) => ({ x: (x + Math.floor(W / 2)) % W, y: H - y - 1 })
};
```

### 7.4 Source Region

For Reflection and Inversion, the source is the **left half** (x < W/2).
For Copy and Opposite, the source is also the left half.

```javascript
function getSourceRegion(mirrorType, W, H) {
  // All mirror types: source is left half
  return {
    startX: 0,
    endX: Math.floor(W / 2),
    startY: 0,
    endY: H
  };
}
```

### 7.5 Landmass Type Resolution

```javascript
function resolveMirrorLandmass(rng) {
  // "Varied" (random) — pick one
  const roll = rng.nextInt(0, 5);
  switch (roll) {
    case 0: return { water: 8, grain: 1, rift: -1 };       // Small Lakes (mostly land)
    case 1: return { water: 65, grain: 2, rift: 2 };       // Wide Continents
    case 2: return { water: 70, grain: 3, rift: -1 };      // Snaky Continents
    case 3: return { water: 75, grain: 4, rift: -1 };      // Archipelago
    case 4: return { water: 80, grain: 5, rift: -1 };      // Tiny Islands
    default: return { water: 70, grain: 3, rift: -1 };     // Snaky (fallback)
  }
}
```

### 7.6 `generate()` — Multi-Stage Mirroring Pipeline

```javascript
generate(settings, rng) {
  const { mapSize, climate, numPlayers } = settings;
  const climateConfig = resolveClimateSettings(climate);

  const gridSize = this.getGridSize(mapSize);
  const dims = gridSize
    ? resolveGridSize(mapSize, { [mapSize]: gridSize })
    : getDefaultDimensions(mapSize);
  const W = dims.width;
  const H = dims.height;

  const mirrorTypeIndex = settings.customOption != null ? settings.customOption : 0;
  const mirrorNames = ['reflection', 'inversion', 'copy', 'opposite'];
  const mirrorType = mirrorNames[mirrorTypeIndex] || 'reflection';
  const transform = MIRROR_TRANSFORMS[mirrorType];

  const landmass = resolveMirrorLandmass(rng);

  // ── STAGE 1: Generate plot types (half map) ──
  const fw = new FractalWorld(W, H, {
    seaLevelChange: 0,
    hillGroupOneRange: climateConfig.hillRange,
    hillGroupTwoRange: climateConfig.hillRange,
    peakPercent: climateConfig.peakPercent,
    wrapX: false, wrapY: false
  });

  fw.initFractal(rng, {
    continent_grain: landmass.grain,
    rift_grain: landmass.rift,
    has_center_rift: landmass.rift >= 0,
    invert_heights: landmass.water <= 15,
    polar: true
  });

  const plotTypes1D = fw.generatePlotTypes(rng, {
    water_percent: landmass.water,
    grain_amount: 3,
    shift_plot_types: false   // no shifting (will mirror)
  });

  // Mirror plot types
  mirrorArray(plotTypes1D, W, H, transform);

  // Coast tiles
  TerrainGenerator.addCoastTiles(plotTypes1D, W, H, false, false);

  // ── STAGE 2: Generate terrain + mirror ──
  const tg = new TerrainGenerator(W, H, { wrapX: false, wrapY: false });
  const terrain1D = tg.generateTerrain(rng, plotTypes1D);
  mirrorArray(terrain1D, W, H, transform);

  // ── STAGE 3: Rivers + mirror with direction corrections ──
  const riverGen = new RiverGenerator(W, H, { wrapX: false, wrapY: false });
  const rivers1D = riverGen.addRivers(rng, plotTypes1D, terrain1D);
  mirrorRivers(rivers1D, W, H, transform, mirrorType);

  // ── STAGE 4: Lakes + mirror ──
  const lakes1D = riverGen.addLakes(plotTypes1D);
  mirrorArray(lakes1D, W, H, transform);

  // ── STAGE 5: Features + mirror ──
  const fg = new FeatureGenerator(W, H, {
    jungleLatitude: climateConfig.jungleLatitude,
    wrapX: false, wrapY: false
  });
  const features1D = fg.generateFeatures(rng, plotTypes1D, terrain1D, rivers1D);
  mirrorArray(features1D, W, H, transform);

  // ── STAGE 6: Bonuses + mirror ──
  const bg = new BonusGenerator(W, H, {
    numPlayers, wrapX: false, wrapY: false
  });
  const bonuses1D = bg.addBonuses(rng, plotTypes1D, terrain1D, features1D);
  mirrorArray(bonuses1D, W, H, transform);

  // ── STAGE 7: Starting plots — mirrored positions ──
  const starts = assignStartsMirror(numPlayers, plotTypes1D, terrain1D,
                                     features1D, bonuses1D, rivers1D, lakes1D,
                                     W, H, transform, rng);

  // NO normalization
  return buildMapResult(W, H, settings, plotTypes1D, terrain1D, features1D,
                        bonuses1D, rivers1D, lakes1D, starts);
}
```

### 7.7 `mirrorArray()` — Copy Source Half to Mirror Half

```javascript
function mirrorArray(arr, W, H, transform) {
  const halfW = Math.floor(W / 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < halfW; x++) {
      const srcIdx = y * W + x;
      const { x: mx, y: my } = transform(x, y, W, H);
      if (mx >= 0 && mx < W && my >= 0 && my < H) {
        const dstIdx = my * W + mx;
        arr[dstIdx] = arr[srcIdx];
      }
    }
  }
}
```

### 7.8 `mirrorRivers()` — Copy Rivers with Direction Corrections

River edges need direction adjustments when mirrored:

```javascript
function mirrorRivers(rivers1D, W, H, transform, mirrorType) {
  const halfW = Math.floor(W / 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < halfW; x++) {
      const srcIdx = y * W + x;
      const src = rivers1D[srcIdx];
      const { x: mx, y: my } = transform(x, y, W, H);
      if (mx < 0 || mx >= W || my < 0 || my >= H) continue;
      const dstIdx = my * W + mx;

      // Copy river edges
      rivers1D[dstIdx].isNOfRiver = src.isNOfRiver;
      rivers1D[dstIdx].isWOfRiver = src.isWOfRiver;

      // Correct flow directions based on mirror type
      switch (mirrorType) {
        case 'reflection':
          // Reflection reverses E/W
          rivers1D[dstIdx].riverNSDirection = reverseEW(src.riverNSDirection);
          rivers1D[dstIdx].riverWEDirection = src.riverWEDirection;  // N/S unchanged
          // Swap N-of-river and W-of-river for reflected tiles
          // isWOfRiver on reflected side becomes isEOfRiver logic
          break;

        case 'inversion':
          // Inversion reverses both E/W and N/S
          rivers1D[dstIdx].riverNSDirection = reverseEW(src.riverNSDirection);
          rivers1D[dstIdx].riverWEDirection = reverseNS(src.riverWEDirection);
          break;

        case 'copy':
          // Copy preserves directions
          rivers1D[dstIdx].riverNSDirection = src.riverNSDirection;
          rivers1D[dstIdx].riverWEDirection = src.riverWEDirection;
          break;

        case 'opposite':
          // Opposite reverses N/S only
          rivers1D[dstIdx].riverNSDirection = src.riverNSDirection;
          rivers1D[dstIdx].riverWEDirection = reverseNS(src.riverWEDirection);
          break;
      }
    }
  }
}

function reverseEW(dir) {
  if (dir === 'E') return 'W';
  if (dir === 'W') return 'E';
  return dir;
}

function reverseNS(dir) {
  if (dir === 'N') return 'S';
  if (dir === 'S') return 'N';
  return dir;
}
```

### 7.9 Starting Plots — Mirrored Positions

Place half the players on the source side, then mirror their positions for the other half:

```javascript
function assignStartsMirror(numPlayers, plotTypes1D, terrain1D, features1D,
                             bonuses1D, rivers1D, lakes1D,
                             W, H, transform, rng) {
  const halfW = Math.floor(W / 2);
  const halfPlayers = Math.ceil(numPlayers / 2);

  // Constrain first half to left 40% of map (20% for 1v1)
  const maxX = numPlayers <= 2
    ? Math.floor(W * 0.20)
    : Math.floor(W * 0.40);

  // Find starts on source side using default scoring
  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: -65,
    wrapX: false, wrapY: false
  });

  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < maxX; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  // Place source-side players
  const sourceStarts = [];
  const baseRange = sp._startingPlotRange(halfPlayers);
  let minDist = baseRange;

  for (let pass = 0; pass < 50 && sourceStarts.length < halfPlayers; pass++) {
    for (const c of candidates) {
      if (sourceStarts.length >= halfPlayers) break;
      if (sourceStarts.some(s => s.x === c.x && s.y === c.y)) continue;
      let ok = true;
      for (const s of sourceStarts) {
        if (Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2) < minDist) {
          ok = false; break;
        }
      }
      if (ok) sourceStarts.push({ x: c.x, y: c.y });
    }
    minDist = Math.max(1, minDist - 1);
  }

  // Build full starts: source players + mirrored positions
  const starts = [];
  for (let i = 0; i < sourceStarts.length; i++) {
    starts.push(sourceStarts[i]);

    if (starts.length < numPlayers) {
      const { x: mx, y: my } = transform(sourceStarts[i].x, sourceStarts[i].y, W, H);
      starts.push({ x: mx, y: my });
    }
  }

  return starts.slice(0, numPlayers);
}
```

---

## 8. Shared Helper: `assignStartsBiggestArea()`

Used by Lakes and potentially other scripts that force all players onto the biggest landmass. Extracted as a shared helper:

```javascript
function assignStartsBiggestArea(numPlayers, plotTypes1D, terrain1D, features1D,
                                  bonuses1D, rivers1D, lakes1D,
                                  W, H, distModifier, wrapX, rng) {
  const { areaId: biggestAreaId, areas } = findBiggestLandArea(plotTypes1D, W, H, wrapX);

  const sp = new StartingPlots(W, H, {
    minStartingDistanceModifier: distModifier,
    wrapX, wrapY: false
  });

  const scores = sp._scoreAllTiles(plotTypes1D, terrain1D, features1D,
                                     bonuses1D, rivers1D, lakes1D);

  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;
      if (areas[idx] !== biggestAreaId) continue;
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const baseRange = sp._startingPlotRange(numPlayers);
  let minDist = baseRange;
  const starts = [];

  for (let pass = 0; pass < 50 && starts.length < numPlayers; pass++) {
    for (const c of candidates) {
      if (starts.length >= numPlayers) break;
      if (starts.some(s => s.x === c.x && s.y === c.y)) continue;
      let ok = true;
      for (const s of starts) {
        if (sp._wrappedDistance(c.x, c.y, s.x, s.y) < minDist) { ok = false; break; }
      }
      if (ok) starts.push({ x: c.x, y: c.y });
    }
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}
```

---

## 9. Subclassing Strategy for Custom Generators

Several scripts need custom `TerrainGenerator` or `FeatureGenerator` subclasses. The implementation should use one of these approaches:

### Option A: Subclassing (Preferred)

```javascript
class IceAgeTerrainGenerator extends TerrainGenerator {
  getLatitudeAtPlot(x, y) {
    return super.getLatitudeAtPlot(x, y) * 0.6;
  }
}
```

This requires `TerrainGenerator.getLatitudeAtPlot()` and `FeatureGenerator.getLatitudeAtPlot()` to be overridable (called via `this.getLatitudeAtPlot()` not as a local function).

### Option B: Settings Callback

If subclassing is impractical, pass a `latitudeTransform` callback in settings:

```javascript
const tg = new TerrainGenerator(W, H, {
  latitudeTransform: (lat) => lat * 0.6
});
```

**Verification**: Check that `TerrainGenerator.getLatitudeAtPlot()` and `FeatureGenerator.getLatitudeAtPlot()` are instance methods called via `this`, not standalone functions. If not, refactor them to support override.

---

## 10. File Structure

```
src/game/mapgen/scripts/
  _helpers.js            — (from Milestone 10) + assignStartsBiggestArea
  continents.js          — (Milestone 10)
  fractal.js             — (Milestone 10)
  archipelago.js         — (Milestone 10)
  pangaea.js             — (Milestone 10)
  terra.js               — Terra script
  inlandSea.js           — Inland Sea script
  lakes.js               — Lakes script
  oasis.js               — Oasis script
  iceAge.js              — Ice Age script
  mirror.js              — Mirror script
```

---

## 11. Differences from Existing `mapGenerator.js`

| Aspect | Old `mapGenerator.js` | New Advanced Scripts |
|--------|----------------------|---------------------|
| Terra | Single fractal, no Old/New World separation | 12+ MultilayeredFractal regions, all starts on Old World |
| Inland Sea | Standard fractal with params | HintedWorld ring, no wrap, custom rivers, template starts |
| Lakes | Standard fractal with high land% | Inverted fractal, water clamped 7-14% |
| Oasis | Standard fractal with desert params | All-land base, 4-band custom terrain, Nile rivers |
| Ice Age | Standard fractal | Wide/short grid, water 60-72%, aggressive ice, custom terrain |
| Mirror | Not implemented | Half-map generation + multi-stage mirroring pipeline |
| Wrapping | Always X-wrap | Per-script: Inland Sea/Oasis/Mirror = no wrap |
| Latitude | Always ±90 | Per-script: Inland Sea ±60, Oasis 0-40 |
| Terrain | Always default | Per-script overrides (IS compressed, Oasis 4-band, IA cold) |
| Rivers | Always downhill | Inland Sea: flow toward center. Oasis: Nile-style |
| Normalization | Always enabled | Oasis/Mirror: all disabled |

---

## 12. Testing / Verification Criteria

### 12.1 Terra
1. Two distinct landmass groups (Old World larger than New World)
2. All starting locations on the biggest landmass
3. Land percentage reasonable (~30-40%)
4. N/S and E/W flip randomization works (run multiple seeds)

### 12.2 Inland Sea
1. Ring of land around central water body
2. **No wrapping** — tiles at x=0 and x=W-1 are not connected
3. No snow or ice terrain (latitude compressed to 0.63 max)
4. Rivers flow toward map center
5. Starting positions ring the map edges

### 12.3 Lakes
1. Almost entirely land with scattered small lakes
2. Water percentage between 7-14%
3. Polar rows (y=0, y=max) are ocean
4. Inverted fractal produces organic lake shapes

### 12.4 Oasis
1. Large desert zone in center (lat 0.30-0.69)
2. Fertile bands at north and south
3. **No wrapping**
4. 4 Nile-style rivers flowing north
5. No normalization applied (jungle/peaks may be near starts)
6. Resources placed in correct zones

### 12.5 Ice Age
1. Extra-wide, short map proportions
2. Much more snow/tundra than standard (threshold at 0.4 instead of 0.7)
3. Ice extends far from poles (down to lat ~0.27)
4. Habitable equatorial band with mostly plains
5. Water locked between 60-72%

### 12.6 Mirror
1. Map is perfectly symmetrical according to chosen mirror type
2. Reflection: left-right mirror at `x = W/2`
3. Inversion: 180° rotation around map center
4. Copy: left half duplicated to right half
5. Opposite: left half duplicated to right half with vertical flip
6. River directions corrected for mirror type
7. Resources and features mirrored
8. Starting positions are mirrored pairs
9. No normalization applied

### 12.7 General (All Scripts)
1. `npm run lint` — clean
2. `npm run build` — clean
3. Each script's `generate()` returns valid map data
4. Scripts with no-wrap correctly prevent tile wrapping
5. Custom terrain/feature generators produce expected biome distributions

---

## 13. Implementation Order

1. **Lakes** — Simplest advanced script (just inverted fractal + water clamping)
2. **Ice Age** — Straightforward FractalWorld with custom terrain/features
3. **Inland Sea** — HintedWorld ring + custom terrain/rivers
4. **Terra** — MultilayeredFractal with many regions (complex but follows patterns)
5. **Oasis** — All-land base + custom terrain + Nile rivers
6. **Mirror** — Most complex (mirroring pipeline with direction corrections)
