# Milestone 6: FeatureGenerator — Implementation Specification

## Overview

**File**: `src/game/mapgen/FeatureGenerator.js`

Exact port of `CvMapGeneratorUtil.FeatureGenerator` from Civ4 BTS. Places ice, jungle, forest, oasis, and floodplains on the map using fractal thresholds and probability-based placement.

Called in the Civ4 pipeline **after** terrain and rivers:
```
generatePlotTypes() → generateTerrain() → addRivers() → addLakes() → addFeatures()
```

---

## 1. FEATURE Enum

Define locally (same pattern as TERRAIN in TerrainGenerator.js):

```javascript
export const FEATURE = {
  NONE: null,
  ICE: 'ice',
  JUNGLE: 'jungle',
  FOREST: 'forest',
  OASIS: 'oasis',
  FLOODPLAINS: 'floodplains'
};
```

---

## 2. Imports

```javascript
import { CyFractal, FRAC_WRAP_X, FRAC_WRAP_Y } from './CyFractal.js';
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { clamp } from './utils.js';
```

---

## 3. Constructor

```javascript
constructor(mapWidth, mapHeight, settings = {})
```

### Instance Variables

| Variable | Default | Source | Description |
|----------|---------|--------|-------------|
| `iNumPlotsX` | mapWidth | arg | Map width |
| `iNumPlotsY` | mapHeight | arg | Map height |
| `iJunglePercent` | **80** | `settings.iJunglePercent \|\| 80` | Top % of jungle fractal eligible for jungle |
| `iForestPercent` | **60** | `settings.iForestPercent \|\| 60` | Top % of forest fractal eligible for forest |
| `jungle_grain` | **5** | `settings.jungle_grain \|\| 5` | Base grain for jungle fractal |
| `forest_grain` | **6** | `settings.forest_grain \|\| 6` | Base grain for forest fractal |
| `jungleLatitude` | **0.15** | `settings.jungleLatitude \|\| 0.15` | Latitude falloff rate for jungle (from climate XML: temperate=0.15, tropical=0.40, rocky=0.05, arid=0.00, cold=0.00) |
| `fracXExp` | **7** | `settings.fracXExp \|\| 7` | Fractal X resolution exponent |
| `fracYExp` | **6** | `settings.fracYExp \|\| 6` | Fractal Y resolution exponent |
| `wrapX` | **true** | `settings.wrapX !== false` | Horizontal wrapping |
| `wrapY` | **false** | `settings.wrapY \|\| false` | Vertical wrapping |

### Fractal Instances (created in constructor, initialized later)

```javascript
this.jungleFrac = new CyFractal(fracXExp, fracYExp);
this.forestFrac = new CyFractal(fracXExp, fracYExp);
```

### Cached Thresholds (set during generateFeatures)

```javascript
this._iJungleTop = 0;      // jungleFrac.getHeightFromPercent(iJunglePercent)
this._iJungleBottom = 0;    // jungleFrac.getHeightFromPercent(0)
this._iForestLevel = 0;     // forestFrac.getHeightFromPercent(100 - iForestPercent)
this._randIceLatitude = 0;  // rng random value in [0, 0.2)
```

---

## 4. Methods

### 4.1 `getWorldSizeGrainAdjust()`

Same logic as TerrainGenerator:

```javascript
getWorldSizeGrainAdjust() {
  const totalPlots = this.iNumPlotsX * this.iNumPlotsY;
  if (totalPlots <= 2048) return 0;   // Duel/Tiny
  if (totalPlots <= 4800) return 1;   // Small/Standard
  return 2;                            // Large/Huge
}
```

### 4.2 `initFractals(rng)`

Initialize jungle and forest fractals:

```javascript
initFractals(rng) {
  let flags = 0;
  if (this.wrapX) flags |= FRAC_WRAP_X;
  if (this.wrapY) flags |= FRAC_WRAP_Y;

  const grainAdjust = this.getWorldSizeGrainAdjust();
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  this.jungleFrac.fracInit(
    W, H, this.jungle_grain + grainAdjust, rng, flags
  );
  this.forestFrac.fracInit(
    W, H, this.forest_grain + grainAdjust, rng, flags
  );
}
```

### 4.3 `getLatitudeAtPlot(x, y)` — Subclass Hook

Simpler than TerrainGenerator's version — **no variation fractal jitter**. This is the base FeatureGenerator latitude used for ice/jungle/forest placement. Subclasses override for latitude compression.

```javascript
getLatitudeAtPlot(x, y) {
  // Distance from equator, normalized 0.0 to 1.0
  // y=0 is north pole, y=max is south pole, equator at iNumPlotsY/2
  const lat = Math.abs((this.iNumPlotsY / 2) - y) / (this.iNumPlotsY / 2);
  return clamp(lat, 0.0, 1.0);
}
```

**Per-script override examples** (for future milestones):
- Inland Sea: `return 0.07 + 0.56 * baseLat`
- Ice Age: `return baseLat * 0.6`
- Balanced: `return 0.05 + 0.75 * baseLat`

### 4.4 `generateFeatures(rng, plotTypes, terrain, rivers = null)` — Main Entry Point

Public method. Takes 1D arrays (y * width + x), returns 1D feature array.

```javascript
generateFeatures(rng, plotTypes, terrain, rivers = null) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // 1. Initialize fractals
  this.initFractals(rng);

  // 2. Compute thresholds
  this._iJungleTop = this.jungleFrac.getHeightFromPercent(this.iJunglePercent);
  this._iJungleBottom = this.jungleFrac.getHeightFromPercent(0);
  this._iForestLevel = this.forestFrac.getHeightFromPercent(100 - this.iForestPercent);

  // 3. Random ice latitude (generated once per map, Civ4: randNum(100)/500.0)
  this._randIceLatitude = rng.nextInt(0, 99) / 500.0;  // range [0, 0.198]

  // 4. Allocate feature array
  const features = new Array(W * H).fill(FEATURE.NONE);

  // 5. Main per-plot feature placement (ice → jungle → forest)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      this.addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng);
    }
  }

  // 6. Generic feature pass: oasis + floodplains (C++ layer in Civ4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (features[idx] !== FEATURE.NONE) continue;
      this.addOasisAtPlot(x, y, plotTypes, terrain, features, rng);
    }
  }

  // 7. Floodplains (only if river data is provided)
  if (rivers) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (features[idx] !== FEATURE.NONE) continue;
        this.addFloodplainsAtPlot(x, y, plotTypes, terrain, features, rivers);
      }
    }
  }

  return features;
}
```

### 4.5 `addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng)` — Per-Plot Dispatch

Exact Civ4 order: generic features → ice → jungle → forest.

```javascript
addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng) {
  const W = this.iNumPlotsX;
  const idx = y * W + x;
  const lat = this.getLatitudeAtPlot(x, y);

  // Step 1: Generic features (XML appearance probability)
  // SKIPPED — no custom XML features in web version

  // Step 2: Ice
  this.addIceAtPlot(x, y, lat, plotTypes, features, rng);
  if (features[idx] !== FEATURE.NONE) return;

  // Step 3: Jungle
  this.addJunglesAtPlot(x, y, lat, plotTypes, terrain, features);
  if (features[idx] !== FEATURE.NONE) return;

  // Step 4: Forest
  this.addForestsAtPlot(x, y, lat, plotTypes, terrain, features);
}
```

### 4.6 `addIceAtPlot(x, y, lat, plotTypes, features, rng)` — Exact Civ4 Algorithm

Ice is placed on water tiles using a two-tier probability system. Edge rows always get ice.

```javascript
addIceAtPlot(x, y, lat, plotTypes, features, rng) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;
  const plot = plotTypes[idx];

  // Ice only on water (ocean or coast)
  if (plot !== PLOT.OCEAN && plot !== PLOT.COAST) return;

  // Edge rows: always ice (y=0 = north pole, y=max = south pole)
  if (y === 0 || y === H - 1) {
    features[idx] = FEATURE.ICE;
    return;
  }

  // Dense ice band near poles
  // Threshold: 1.0 - randIceLatitude / 2.0
  // Multiplier: 8x — probability rises steeply above threshold
  const rand1 = rng.next();
  if (rand1 < 8.0 * (lat - (1.0 - this._randIceLatitude / 2.0))) {
    features[idx] = FEATURE.ICE;
    return;
  }

  // Sparse ice band (further from poles)
  // Threshold: 1.0 - randIceLatitude
  // Multiplier: 4x — gentler probability curve
  const rand2 = rng.next();
  if (rand2 < 4.0 * (lat - (1.0 - this._randIceLatitude))) {
    features[idx] = FEATURE.ICE;
    return;
  }
}
```

**Numeric example** (randIceLatitude = 0.10):
- Dense band threshold: `1.0 - 0.05 = 0.95`. At lat=0.95: prob = `8 * 0 = 0%`. At lat=1.0: prob = `8 * 0.05 = 40%`.
- Sparse band threshold: `1.0 - 0.10 = 0.90`. At lat=0.95: prob = `4 * 0.05 = 20%`. At lat=1.0: prob = `4 * 0.10 = 40%`.

**IMPORTANT**: Both random draws (`rand1`, `rand2`) must be consumed even if the first test succeeds, to maintain RNG determinism consistency. Wait — actually in Civ4, the function returns early after setting ice, so the second rand is NOT consumed if the first band triggers. This is fine because `return` exits the function.

Actually, re-reading: the function does `return` after placing ice in each band. So if the dense band triggers, `rand2` is never generated. This is correct Civ4 behavior — the second `rng.next()` only happens if the dense band didn't trigger.

### 4.7 `addJunglesAtPlot(x, y, lat, plotTypes, terrain, features)` — Exact Civ4 Algorithm

Jungle is placed on grassland land/hills tiles using a fractal threshold that rises with latitude (less jungle farther from equator).

```javascript
addJunglesAtPlot(x, y, lat, plotTypes, terrain, features) {
  const W = this.iNumPlotsX;
  const idx = y * W + x;
  const plot = plotTypes[idx];
  const terr = terrain[idx];

  // Jungle only on land or hills (not water, not peaks)
  if (plot !== PLOT.LAND && plot !== PLOT.HILLS) return;

  // Jungle only on grassland
  if (terr !== TERRAIN.GRASSLAND) return;

  // Latitude-adjusted bottom threshold
  // At equator (lat=0): adjustedBottom = iJungleBottom → maximum jungle range
  // At higher lat: adjustedBottom rises → narrower range → less jungle
  const adjustedBottom = this._iJungleBottom +
    (this._iJungleTop - this._iJungleBottom) * this.jungleLatitude * lat;

  // Fractal check: height must be in [adjustedBottom, iJungleTop]
  const jungleHeight = this.jungleFrac.getHeight(x, y);
  if (jungleHeight >= adjustedBottom && jungleHeight <= this._iJungleTop) {
    features[idx] = FEATURE.JUNGLE;
  }
}
```

**Formula breakdown**:
- `iJungleTop` = 80th percentile of jungle fractal (top 80% eligible at equator)
- `iJungleBottom` = 0th percentile (minimum value)
- `jungleLatitude` = from climate settings (temperate: 0.15)
- At lat=0 (equator): range = `[iJungleBottom, iJungleTop]` = full 80% of fractal values
- At lat=0.5: range narrows by `jungleLatitude * 0.5 = 7.5%` of the full range
- Jungle is additionally constrained to grassland tiles, which are already mostly equatorial

### 4.8 `addForestsAtPlot(x, y, lat, plotTypes, terrain, features)` — Exact Civ4 Algorithm

Forest is a simple fractal threshold with no latitude dependency.

```javascript
addForestsAtPlot(x, y, lat, plotTypes, terrain, features) {
  const W = this.iNumPlotsX;
  const idx = y * W + x;
  const plot = plotTypes[idx];
  const terr = terrain[idx];

  // Forest only on land or hills (not water, not peaks)
  if (plot !== PLOT.LAND && plot !== PLOT.HILLS) return;

  // No forest on desert, ocean, or coast terrain
  if (terr === TERRAIN.DESERT || terr === TERRAIN.OCEAN || terr === TERRAIN.COAST) return;

  // No forest if already has a feature (ice or jungle from earlier passes)
  if (features[idx] !== FEATURE.NONE) return;

  // Simple threshold: top iForestPercent (60%) of the fractal
  // iForestLevel = getHeightFromPercent(100 - 60) = 40th percentile
  if (this.forestFrac.getHeight(x, y) >= this._iForestLevel) {
    features[idx] = FEATURE.FOREST;
  }
}
```

**Note**: The `lat` parameter is accepted but unused in the base implementation. Subclasses may use it. Include it in the signature for consistency with Civ4's method signature.

### 4.9 `addOasisAtPlot(x, y, plotTypes, terrain, features, rng)` — C++ Generic Feature

Oasis is placed by Civ4's C++ generic feature system after the Python FeatureGenerator pass. We inline it here.

```javascript
addOasisAtPlot(x, y, plotTypes, terrain, features, rng) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;

  // Oasis only on flat desert land
  if (plotTypes[idx] !== PLOT.LAND) return;
  if (terrain[idx] !== TERRAIN.DESERT) return;

  // Check no adjacent water or oasis in all 8 directions
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      let nx = x + dx;
      let ny = y + dy;

      // Handle wrapping
      if (this.wrapX) {
        nx = ((nx % W) + W) % W;
      } else if (nx < 0 || nx >= W) {
        continue;
      }

      if (this.wrapY) {
        ny = ((ny % H) + H) % H;
      } else if (ny < 0 || ny >= H) {
        continue;
      }

      const nIdx = ny * W + nx;
      // No oasis adjacent to water
      if (plotTypes[nIdx] === PLOT.OCEAN || plotTypes[nIdx] === PLOT.COAST) return;
      // No oasis adjacent to another oasis
      if (features[nIdx] === FEATURE.OASIS) return;
    }
  }

  // 3% probability (Civ4 XML appearance probability for FEATURE_OASIS)
  if (rng.next() < 0.03) {
    features[idx] = FEATURE.OASIS;
  }
}
```

**IMPORTANT**: The `rng.next()` call must happen ONLY after passing all validation checks. If any neighbor check fails, `rng.next()` is NOT consumed (we `return` before reaching it). This matches Civ4's C++ behavior where `canHaveFeature()` is checked before rolling probability.

### 4.10 `addFloodplainsAtPlot(x, y, plotTypes, terrain, features, rivers)` — C++ Generic Feature

Floodplains: desert + flat land + river = floodplains. 100% probability if eligible.

```javascript
addFloodplainsAtPlot(x, y, plotTypes, terrain, features, rivers) {
  const W = this.iNumPlotsX;
  const idx = y * W + x;

  // Floodplains only on flat desert land
  if (plotTypes[idx] !== PLOT.LAND) return;
  if (terrain[idx] !== TERRAIN.DESERT) return;

  // Must have river on an adjacent edge
  if (!this._tileHasRiver(rivers, x, y)) return;

  features[idx] = FEATURE.FLOODPLAINS;
}
```

### 4.11 `_tileHasRiver(rivers, x, y)` — Helper

Check if a tile has any river on its edges. The rivers data structure is a 1D array of objects with `{ isNOfRiver, isWOfRiver }` per tile. The exact format depends on the RiverGenerator (Milestone 7), so use a flexible check.

```javascript
_tileHasRiver(rivers, x, y) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;

  // Check this tile's north and west edges
  const tile = rivers[idx];
  if (tile && (tile.isNOfRiver || tile.isWOfRiver)) return true;

  // Check south neighbor's north edge (= this tile's south edge)
  if (y > 0) {
    const south = rivers[(y - 1) * W + x];
    if (south && south.isNOfRiver) return true;
  }

  // Check east neighbor's west edge (= this tile's east edge)
  const ex = this.wrapX ? (x + 1) % W : x + 1;
  if (ex < W) {
    const east = rivers[y * W + ex];
    if (east && east.isWOfRiver) return true;
  }

  return false;
}
```

**Note**: This implementation accepts rivers as either a 1D array (new format) or can be adapted. If the RiverGenerator in Milestone 7 uses a different structure, this method may need adjustment. The method is prefixed with `_` to indicate it's an internal helper.

### 4.12 `toFeatures2D(featuresArray)` — Utility

Convert 1D feature array to 2D for backward compatibility:

```javascript
toFeatures2D(featuresArray) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) =>
      featuresArray[y * W + x]
    )
  );
}
```

---

## 5. Exports

```javascript
// Re-exports for convenience
export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export {
  FRAC_POLAR,
  FRAC_CENTER_RIFT,
  FRAC_INVERT_HEIGHTS,
  FRAC_WRAP_X,
  FRAC_WRAP_Y
} from './CyFractal.js';
```

---

## 6. Complete Method Summary

| Method | Visibility | Description |
|--------|-----------|-------------|
| `constructor(mapWidth, mapHeight, settings)` | public | Set parameters, create fractal instances |
| `getWorldSizeGrainAdjust()` | public | Grain adjustment by map size (0/1/2) |
| `initFractals(rng)` | public | Initialize jungle + forest fractals |
| `getLatitudeAtPlot(x, y)` | public | Latitude [0,1], subclass hook |
| `generateFeatures(rng, plotTypes, terrain, rivers?)` | public | Main entry: returns 1D feature array |
| `addFeaturesAtPlot(x, y, ...)` | public | Per-plot dispatch: ice → jungle → forest |
| `addIceAtPlot(x, y, lat, ...)` | public | Two-tier probability ice on water |
| `addJunglesAtPlot(x, y, lat, ...)` | public | Fractal + latitude-adjusted jungle on grass |
| `addForestsAtPlot(x, y, lat, ...)` | public | Fractal threshold forest on non-desert |
| `addOasisAtPlot(x, y, ...)` | public | 3% chance oasis on desert, no adjacent water/oasis |
| `addFloodplainsAtPlot(x, y, ...)` | public | 100% floodplains on desert + river |
| `_tileHasRiver(rivers, x, y)` | private | Check for river edges on a tile |
| `toFeatures2D(featuresArray)` | public | 1D → 2D conversion utility |

All `add*AtPlot` methods are public so subclasses can override them (e.g., IceAgeFeatureGenerator overrides addIceAtPlot for aggressive ice placement).

---

## 7. JSDoc and Code Style

Follow the established patterns from TerrainGenerator.js:

- **File header comment**: Module name, description, references to Civ4 SDK and docs
- **Section separators**: `// ===...===` with section titles (FEATURE TYPES, FEATURE GENERATOR CLASS, FRACTAL INITIALIZATION, LATITUDE CALCULATION, FEATURE PLACEMENT, ICE, JUNGLE, FOREST, OASIS/FLOODPLAINS, UTILITY, EXPORTS)
- **JSDoc on all public methods**: `@param`, `@returns`, narrative description
- **Template method comments**: Note which methods are subclass hooks
- **Settings defaults**: Use `||` for numeric defaults, `!== false` for true-default booleans
- **Unused params**: Prefix with `_` and add eslint-disable comment (e.g., `_lat` in addForestsAtPlot if unused)

---

## 8. Parameter Mapping from Climate Settings

When creating a FeatureGenerator from game settings, map climate options to constructor settings:

```javascript
// In the future integration (Milestone 12):
const climateConfig = getClimateConfig(settings.climate);  // from gameOptions.js

const fg = new FeatureGenerator(width, height, {
  jungleLatitude: climateConfig.junglePercent,  // tropical=0.40, temperate=0.15, etc.
  // iJunglePercent and iForestPercent stay at defaults (80, 60)
  // unless a map script overrides them
});
```

| Climate | `jungleLatitude` | Effect |
|---------|-----------------|--------|
| Tropical | 0.40 | Jungle diminishes 40% per unit latitude |
| Temperate | 0.15 | Jungle diminishes 15% per unit latitude |
| Rocky | 0.05 | Jungle barely varies with latitude |
| Arid | 0.00 | No jungle (range doesn't narrow, but grassland is scarce) |
| Cold | 0.00 | No jungle (no grassland to place on) |

---

## 9. Per-Script Override Summary (Future Milestones)

These subclass overrides will be implemented in Milestones 10-11 but should be anticipated in the class design:

| Script | Subclass Changes |
|--------|-----------------|
| **Inland Sea** | Override `getLatitudeAtPlot()`: `lat = 0.07 + 0.56 * baseLat` → range [0.07, 0.63], no ice |
| **Ice Age** | `iJunglePercent=30, iForestPercent=50, jungle_grain=7`. Override `addIceAtPlot()` with 5-tier aggressive ice down to lat 0.27. Override `getLatitudeAtPlot()`: `lat *= 0.6` |
| **Balanced** | Override `getLatitudeAtPlot()`: `lat = 0.05 + 0.75 * baseLat` → [0.05, 0.75] |
| **Fantasy Realm** | `iJunglePercent=20, iForestPercent=30`. Override `addIceAtPlot()`: 3/35 chance on any water. Override `addFloodplainsAtPlot()`: allow on snow + desert |
| **Archipelago** | Add coastal peak removal before features: peaks adjacent to coast → hills (in map script, not FeatureGenerator) |

---

## 10. Differences from Existing `mapGenerator.js`

| Aspect | Old `placeFeatures()` | New `FeatureGenerator` |
|--------|----------------------|----------------------|
| Ice latitude | Fixed `iceLatitude = 0.9` | Dynamic: `1.0 - randIceLatitude/2` and `1.0 - randIceLatitude` (randomized per map) |
| Ice edge rows | Not forced | Edge rows (y=0, y=max) always ice |
| Jungle latitude | Fixed cutoff `fJungleLatitude = 0.25` | Smooth falloff via `jungleLatitude * lat` from climate settings |
| Jungle threshold | Bottom-up: `>= jungleLevel` | Band: `>= adjustedBottom && <= iJungleTop` |
| Forest threshold | Bottom-up: `>= forestLevel` | Same approach: `>= iForestLevel` (top 60%) |
| Data format | 2D arrays `[y][x]` | 1D arrays `[y * W + x]` with `toFeatures2D()` |
| Subclass hooks | None | `getLatitudeAtPlot()`, all `add*AtPlot()` methods |
| Oasis wrapping | Always wraps X | Respects `wrapX`/`wrapY` settings |
| Floodplains | Separate function, always runs | Integrated, requires river data |

---

## 11. Testing / Verification Criteria

### Functional Checks

1. **Ice placement**:
   - Edge rows (y=0, y=max) have 100% ice coverage on water tiles
   - Ice density decreases moving away from poles
   - No ice on land tiles
   - Different maps (different seeds) have varying ice extent due to `randIceLatitude`

2. **Jungle placement**:
   - Jungle only on grassland terrain
   - Jungle only on land or hills (not peaks, not water)
   - Jungle concentrated near equator (y ≈ height/2)
   - Jungle coverage decreases with latitude
   - With `jungleLatitude=0` (arid/cold), no jungle-from-latitude effect (but jungle may still not appear due to lack of grassland)

3. **Forest placement**:
   - Forest on grassland, plains, tundra, and snow (not desert)
   - Forest only on land or hills (not peaks, not water)
   - No forest on tiles that already have ice or jungle
   - Roughly 60% of eligible tiles get forest (fractal dependent)
   - No latitude dependency (uniform from pole to equator on eligible terrain)

4. **Oasis placement**:
   - Oasis only on flat desert (PLOT.LAND + TERRAIN.DESERT)
   - No oasis adjacent to water (8 directions)
   - No oasis adjacent to another oasis (8 directions)
   - ~3% of eligible tiles get oasis

5. **Floodplains placement**:
   - Only on flat desert with a river edge
   - If no river data provided, no floodplains placed
   - All eligible tiles get floodplains (100% probability)

### Statistical Checks (on Standard-size Continents map)

- Ice: present in ~2-4 rows from poles on water
- Jungle: ~5-15% of grassland tiles near equator
- Forest: ~40-60% of eligible non-desert land tiles
- Oasis: sparse on desert (1-3% of desert flat tiles)
- No feature should appear on peaks

### Lint & Build

- `npm run lint` — no new lint errors
- `npm run build` — clean build (chunk size warning for Babylon.js is expected)
- Unused params in overridable methods: prefix with `_` and eslint-disable comment

---

## 12. File Template

```
/**
 * FeatureGenerator - Civ4-compatible feature placement
 *
 * Places ice, jungle, forest, oasis, and floodplains using fractal
 * thresholds and probability-based placement.
 *
 * This is a direct port of CvMapGeneratorUtil.FeatureGenerator from Civ4 BTS,
 * plus the C++ generic feature system for oasis and floodplains.
 *
 * Subclasses can override:
 * - getLatitudeAtPlot() for latitude compression
 * - addIceAtPlot() for custom ice placement
 * - addJunglesAtPlot() for custom jungle placement
 * - addForestsAtPlot() for custom forest placement
 *
 * References:
 * - Civ4 SDK: CvMapGeneratorUtil.py FeatureGenerator class
 * - Civ4 SDK: CvMapGenerator::addFeatures() (C++ generic features)
 * - docs/Civ4-Map-Generation-Complete.md §FeatureGenerator
 * - docs/MapGen-Rewrite-Plan.md §Milestone 6
 */

// imports...

// FEATURE TYPES section
// FEATURE GENERATOR CLASS section
//   constructor
//   FRACTAL INITIALIZATION section
//   LATITUDE CALCULATION section
//   FEATURE PLACEMENT section (generateFeatures, addFeaturesAtPlot)
//   ICE section
//   JUNGLE section
//   FOREST section
//   OASIS / FLOODPLAINS section
//   UTILITY section
// EXPORTS section
```
