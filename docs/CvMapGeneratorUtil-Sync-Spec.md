# CvMapGeneratorUtil.py → JS Sync Spec

This document specifies every change required to make the JS map generation engine classes match the original Civ4 BTS `CvMapGeneratorUtil.py` exactly.

Source of truth: `D:\Games\Civilization IV Complete\Civ4\Assets\Python\CvMapGeneratorUtil.py`

---

## 1. FractalWorld.js

### 1.1 Fix `calcWeights()` — Symmetric weight curve

**File:** `src/game/mapgen/FractalWorld.js`
**Lines:** 296–321

**Problem:** JS computes `distFromCenter = Math.abs(i - stripRadius)` which produces an asymmetric curve with a single center at `i = stripRadius`. Python computes `distFromCenter = stripRadius - distFromEdge` which produces a symmetric curve with two center positions at `i = stripRadius - 1` and `i = stripRadius`.

**Change:** Replace the `distFromCenter` calculation:

```javascript
// BEFORE (wrong):
const distFromCenter = Math.abs(i - stripRadius);

// AFTER (matches Python):
const distFromCenter = stripRadius - distFromEdge;
```

**Verification:** With `stripRadius=3`, weights should be `[1, 6, 18, 18, 6, 1]` (symmetric), not `[1, 2, 9, 18, 6, 1]`.

> This same fix must also be applied in **MultilayeredFractal.js** `calcWeights()` and **HintedWorld.js** `calcWeights()` (inherited from FractalWorld).

---

### 1.2 Fix `findBestSplitX()` — Count only PLOT_LAND

**File:** `src/game/mapgen/FractalWorld.js`
**Lines:** 346–354

**Problem:** JS counts all non-OCEAN tiles (`!== PLOT.OCEAN`). Python counts only `PLOT_LAND`.

**Change:**

```javascript
// BEFORE (wrong):
if (this.plotTypes[i] !== PLOT.OCEAN) {
  landCount++;
}

// AFTER (matches Python):
if (this.plotTypes[i] === PLOT.LAND) {
  landCount++;
}
```

Also update the `bFoundLand` logic to match Python exactly — Python sets `bFoundLand = True` inside the same `if` block, and adds +30 only if `bFoundLand` is true:

```javascript
let landScore = 0;
let bFoundLand = false;
for (let y = 0; y < this.iNumPlotsY; y++) {
  const i = y * this.iNumPlotsX + x;
  if (this.plotTypes[i] === PLOT.LAND) {
    landScore++;
    bFoundLand = true;
  }
}
if (bFoundLand) {
  landScore += 30;
}
```

This variable naming (`landScore` + `bFoundLand`) matches the Python exactly.

---

### 1.3 Fix `findBestSplitY()` — Count only PLOT_LAND + match Python guard

**File:** `src/game/mapgen/FractalWorld.js`
**Lines:** 393–440

Same PLOT_LAND fix as 1.2.

Additionally, match Python's guard condition which checks against `iNumPlotsX` (not `iNumPlotsY`). This is a quirk/bug in the original Civ4 code but we must reproduce it:

```javascript
// BEFORE (diverges from Python):
if (stripSize > this.iNumPlotsY) return 0;

// AFTER (matches Python — uses X dimension):
if (stripSize > this.iNumPlotsX) return 0;
```

---

### 1.4 Fix `shiftPlotTypesBy()` — Positive-only guard + always-wrap Y

**File:** `src/game/mapgen/FractalWorld.js`
**Lines:** 448–473

**Problem 1:** Python only executes when `xshift > 0 or yshift > 0`. JS executes for any non-zero value.

**Problem 2:** Python always wraps both X and Y with simple modulo. JS conditionally wraps Y and fills out-of-bounds with OCEAN.

**Change:** Replace the entire method body:

```javascript
shiftPlotTypesBy(xshift, yshift) {
  if (xshift <= 0 && yshift <= 0) return;

  const buf = [...this.plotTypes];

  for (let destY = 0; destY < this.iNumPlotsY; destY++) {
    for (let destX = 0; destX < this.iNumPlotsX; destX++) {
      const destI = this.iNumPlotsX * destY + destX;
      let sourceX = (destX + xshift) % this.iNumPlotsX;
      let sourceY = (destY + yshift) % this.iNumPlotsY;
      // Python uses simple modulo which is always non-negative for positive divisors
      // JS modulo can be negative, so normalize:
      sourceX = ((sourceX % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
      sourceY = ((sourceY % this.iNumPlotsY) + this.iNumPlotsY) % this.iNumPlotsY;
      const sourceI = this.iNumPlotsX * sourceY + sourceX;
      this.plotTypes[destI] = buf[sourceI];
    }
  }
}
```

---

## 2. HintedWorld.js

### 2.1 Replace `bestHintsSplitX()` — Simple neighbor counting

**File:** `src/game/mapgen/HintedWorld.js`
**Lines:** 493–528

**Problem:** JS uses the FractalWorld-style weighted strip algorithm. Python uses a simple two-value counting approach per column.

**Change:** Replace the method body entirely to match Python:

```javascript
bestHintsSplitX() {
  const scores = new Array(this.w).fill(0);
  for (let x = 0; x < this.w; x++) {
    for (let y = 0; y < this.h; y++) {
      const val = this.getValue(x, y);
      if (val !== null && val >= 192) scores[x] += 1;
      const leftVal = this.getValue(x - 1, y);
      if (leftVal !== null && leftVal >= 192) scores[x] += 1;
    }
  }
  // argmin
  let bestIdx = 0;
  let bestScore = scores[0];
  for (let i = 1; i < this.w; i++) {
    if (scores[i] < bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}
```

No strip weights, no +30 bonus — just a direct count of land blocks at column `x` and column `x-1`.

---

### 2.2 Replace `bestHintsSplitY()` — Simple neighbor counting

**File:** `src/game/mapgen/HintedWorld.js`
**Lines:** 537–569

Same approach as 2.1 but for rows. Match Python:

```javascript
bestHintsSplitY() {
  const scores = new Array(this.h).fill(0);
  for (let x = 0; x < this.w; x++) {
    for (let y = 0; y < this.h; y++) {
      const val = this.getValue(x, y);
      if (val !== null && val >= 192) scores[y] += 1;
      const belowVal = this.getValue(x, y - 1);
      if (belowVal !== null && belowVal >= 192) scores[y] += 1;
    }
  }
  let bestIdx = 0;
  let bestScore = scores[0];
  for (let i = 1; i < this.h; i++) {
    if (scores[i] < bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}
```

Note: The `shiftHintsToMap()` method that calls these also needs updating — it currently computes a `hintStripRadius` and passes it to these methods, but the Python versions take no arguments. Remove the `stripRadius` parameter from these methods and update `shiftHintsToMap()` accordingly.

---

### 2.3 Fix `isValid()` — Remove wrap-aware distance for maxradius

**File:** `src/game/mapgen/HintedWorld.js`
**Lines:** 256–263

**Problem:** JS accounts for wrapping when computing Manhattan distance to continent center. Python uses raw coordinate differences.

**Change:**

```javascript
// BEFORE (wrong — wrap-aware):
if (continent && continent.maxradius > 0) {
  let dx = Math.abs(nx - continent.centerx);
  let dy = Math.abs(ny - continent.centery);
  if (this.wrapX) dx = Math.min(dx, this.w - dx);
  if (this.wrapY) dy = Math.min(dy, this.h - dy);
  if (dx + dy > continent.maxradius) return false;
}

// AFTER (matches Python — raw coords):
if (continent && continent.maxradius > 0) {
  if (Math.abs(x - continent.centerx) + Math.abs(y - continent.centery) > continent.maxradius) {
    return false;
  }
}
```

Note: Use the **original** `x, y` parameters (before normalization), matching Python which passes raw `x, y` to the distance check.

---

### 2.4 Fix `findValid()` — Use Chebyshev distance shells

**File:** `src/game/mapgen/HintedWorld.js`
**Lines:** 297–332

**Problem:** JS uses Manhattan distance diamond perimeter. Python uses Chebyshev distance (max of absolute values) and a recursive search from distance 0 upward.

**Change:** Replace with iterative Chebyshev-shell search matching the Python recursive approach:

```javascript
findValid(x, y, maxDist = -1, continent = null, rng = null) {
  if (maxDist < 0) {
    maxDist = Math.max(this.w, this.h);
  }

  // Search shells from 0 to maxDist (Python recurses inward first, equivalent to
  // iterating outward since it checks the innermost distance first)
  for (let dist = 0; dist <= maxDist; dist++) {
    const candidates = [];
    for (let dx = -dist; dx <= dist; dx++) {
      for (let dy = -dist; dy <= dist; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === dist) {
          candidates.push({ x: x + dx, y: y + dy });
        }
      }
    }

    // Shuffle candidates
    if (rng) {
      rng.shuffle(candidates);
    }

    for (const cand of candidates) {
      if (this.isValid(cand.x, cand.y, continent)) {
        const norm = this.normalizeBlock(cand.x, cand.y);
        return { x: norm.x, y: norm.y };
      }
    }
  }

  return null;
}
```

---

### 2.5 Fix `expandContinentBy()` — Greedy first-valid selection

**File:** `src/game/mapgen/HintedWorld.js`
**Lines:** 385–429

**Problem:** JS collects all valid candidates then picks randomly. Python is greedy — it shuffles existing blocks, shuffles directions for each block, and takes the **first** valid neighbor found, then recurses for additional blocks.

**Change:** Replace with greedy approach matching Python:

```javascript
expandContinentBy(rng, continent, numBlocks) {
  if (numBlocks <= 0) return true;

  // Shuffle block order
  const blockOrder = [...Array(continent.blocks.length).keys()];
  rng.shuffle(blockOrder);

  for (const blockIndex of blockOrder) {
    const [bx, by] = continent.blocks[blockIndex];

    // Shuffle cardinal directions
    const dirOrder = [...Array(CARDINAL_DIRS.length).keys()];
    rng.shuffle(dirOrder);

    for (const dirIndex of dirOrder) {
      const [dx, dy] = CARDINAL_DIRS[dirIndex];
      if (this.isValid(bx + dx, by + dy, continent)) {
        const norm = this.normalizeBlock(bx + dx, by + dy);
        if (!norm.valid) continue;

        continent.blocks.push([norm.x, norm.y]);
        const expandValue = 208 + rng.nextInt(0, 47);
        this.setValue(norm.x, norm.y, expandValue);
        this._blockOwner.set(`${norm.x},${norm.y}`, continent.id);
        continent.invalidateRects();

        if (numBlocks > 1) {
          return this.expandContinentBy(rng, continent, numBlocks - 1);
        } else {
          return true;
        }
      }
    }
  }

  // Could not expand
  continent.done = true;
  return false;
}
```

Also add a `done` property to the `Continent` class, initialized based on `numBlocks <= 1` in the constructor (matching Python's `self.done`).

---

### 2.6 Update `buildAllContinents()` — Use `continent.done` flag

**File:** `src/game/mapgen/HintedWorld.js`
**Lines:** 437–479

With the `done` flag now set by `expandContinentBy()` and the `Continent` constructor, simplify the loop to match Python:

```javascript
buildAllContinents(rng) {
  let allDone = false;
  while (!allDone) {
    allDone = true;
    for (const cont of this.continents) {
      if (!cont.done) {
        this.expandContinentBy(rng, cont, 1);
        allDone = false;
      }
    }
  }
}
```

Remove the existing safety checks and `canGrow` logic — Python has none of these.

---

## 3. MultilayeredFractal.js

### 3.1 Fix `calcWeights()` — Same fix as 1.1

**File:** `src/game/mapgen/MultilayeredFractal.js`
**Lines:** 313–338

Apply the same `distFromCenter = stripRadius - distFromEdge` fix as section 1.1.

---

### 3.2 Fix `shiftRegionPlots()` — Add min/max clamping

**File:** `src/game/mapgen/MultilayeredFractal.js`
**Lines:** 458–474

**Problem:** Python applies `min(15, iStrip)` then `max(3, iStrip)`. The `min` is overwritten, so the effective result is `max(3, iStrip)`. JS has no clamping.

**Change:** Add the same (buggy) clamping to match Python:

```javascript
shiftRegionPlots(plotData, regionWidth, regionHeight, iStrip = 15) {
  // Match Python's min/max sequence: min is overwritten by max
  let stripRadius = Math.min(15, iStrip);
  stripRadius = Math.max(3, iStrip);  // Note: uses iStrip, not stripRadius — matches Python bug

  const bestShiftX = this.findBestRegionSplitX(plotData, regionWidth, regionHeight, stripRadius);
  const bestShiftY = this.findBestRegionSplitY(plotData, regionWidth, regionHeight, stripRadius);
  // ... rest unchanged
}
```

---

### 3.3 Fix `findBestRegionSplitX()` / `findBestRegionSplitY()` — Count only PLOT_LAND

**File:** `src/game/mapgen/MultilayeredFractal.js`
**Lines:** 352–445

Same fix as section 1.2. Change `!== PLOT.OCEAN` to `=== PLOT.LAND` and use `landScore`/`bFoundLand` pattern.

---

### 3.4 Remove rift/invert_heights handling from `generatePlotsInRegion()`

**File:** `src/game/mapgen/MultilayeredFractal.js`
**Lines:** 157–298

**Problem:** JS implements rift support and `invert_heights` in `generatePlotsInRegion()`. Python does not use these parameters — it always calls plain `fracInit`.

**Change:** Remove the rift_grain/has_center_rift/invert_heights logic. Always use plain `fracInit`:

```javascript
// Replace lines 189-211 with:
continentsFrac.fracInit(
  iRegionWidth, iRegionHeight,
  iRegionGrain, rng, iRegionPlotFlags
);
```

Remove the `FRAC_INVERT_HEIGHTS` and `FRAC_CENTER_RIFT` flag building for this method. The parameters can remain in the interface for documentation purposes but should be ignored in the implementation body.

---

### 3.5 Remove sea level adjustment from `generatePlotsInRegion()`

**File:** `src/game/mapgen/MultilayeredFractal.js`
**Lines:** 224–228

**Problem:** JS applies `seaLevelChange`. Python uses raw `iWaterPercent`.

**Change:**

```javascript
// BEFORE:
const adjustedWaterPercent = clamp(iWaterPercent + this.seaLevelChange, 0, 100);
const iWaterThreshold = continentsFrac.getHeightFromPercent(adjustedWaterPercent);

// AFTER:
const iWaterThreshold = continentsFrac.getHeightFromPercent(iWaterPercent);
```

---

## 4. TerrainGenerator.js

### 4.1 Fix variation fractal grain — Use base grain, not +1

**File:** `src/game/mapgen/TerrainGenerator.js`
**Lines:** 170–173

**Problem:** JS initializes variation fractal with `grain_amount + 1` (same as plains). Python uses `grain_amount` (same as desert).

**Change:**

```javascript
// BEFORE (wrong — same grain as plains):
this.variationFrac.fracInit(
  W, H, this.grain_amount + 1 + grainAdjust, rng, flags
);

// AFTER (matches Python — same grain as desert):
this.variationFrac.fracInit(
  W, H, this.grain_amount + grainAdjust, rng, flags
);
```

---

### 4.2 Remove mountain terrain override

**File:** `src/game/mapgen/TerrainGenerator.js`

**Problem:** JS has a `mountainFrac` (4th fractal) and a mountain terrain override system (lines 270–278) that forces some hills/peaks at tundra+ latitudes to SNOW. This does not exist in the Python.

**Changes:**

1. Remove `this.mountainFrac` creation from the constructor (line 122).
2. Remove `this._iMountainTopHeight` and `this._iMountainBottomHeight` from the constructor (lines 126–127).
3. Remove `this.iMountainTopPercent` and `this.iMountainBottomPercent` from the constructor (lines 115–116).
4. Remove `mountainFrac.fracInit()` call from `initFractals()` (lines 175–178).
5. Remove the mountain threshold computation from `generateTerrain()` (lines 303–304).
6. Remove the mountain terrain override block from `generateTerrainAtPlot()` (lines 270–278).

---

### 4.3 Fix `getLatitudeAtPlot()` — Use Civ4's H/2 normalization

**File:** `src/game/mapgen/TerrainGenerator.js`
**Lines:** 198–211

**Problem:** JS uses a `topLatitude`/`bottomLatitude` system with `(H-1)` normalization. Python uses `abs((H/2) - y) / (H/2)`.

**Change:** Replace the method to match Python exactly:

```javascript
getLatitudeAtPlot(x, y) {
  // Civ4: lat = abs((H/2) - y) / (H/2)
  // 0.0 = equator (center of map), 1.0 = pole (top/bottom)
  const halfH = this.iNumPlotsY / 2;
  let lat = Math.abs(halfH - y) / halfH;

  // Variation fractal jitter: ±0.1 range
  lat += (128 - this.variationFrac.getHeight(x, y)) / (255.0 * 5.0);

  return Math.max(0.0, Math.min(1.0, lat));
}
```

Remove the `topLatitude` and `bottomLatitude` properties from the constructor. They are not part of the Python TerrainGenerator.

> **Note:** If any map scripts (Inland Sea, Ice Age, etc.) override `getLatitudeAtPlot()` using the `topLatitude`/`bottomLatitude` system, those overrides must be updated to use the Civ4 base formula and apply their own compression on top.

---

## 5. FeatureGenerator.js

### 5.1 Fix jungle fractal thresholds — Centered band

**File:** `src/game/mapgen/FeatureGenerator.js`
**Lines:** 215–216

**Problem:** JS uses bottom-anchored range (0th–80th percentile). Python centers the eligible band (10th–90th percentile).

**Change:**

```javascript
// BEFORE (wrong — bottom-anchored):
this._iJungleTop = this.jungleFrac.getHeightFromPercent(this.iJunglePercent);
this._iJungleBottom = this.jungleFrac.getHeightFromPercent(0);

// AFTER (matches Python — centered band):
this._iJungleBottom = this.jungleFrac.getHeightFromPercent(
  Math.floor((100 - this.iJunglePercent) / 2)
);
this._iJungleTop = this.jungleFrac.getHeightFromPercent(
  Math.floor((100 + this.iJunglePercent) / 2)
);
```

With `iJunglePercent=80`: bottom = 10th percentile, top = 90th percentile.

---

### 5.2 Fix forest threshold — Top 40%, not top 60%

**File:** `src/game/mapgen/FeatureGenerator.js`
**Line:** 217

**Problem:** JS computes `getHeightFromPercent(100 - 60) = 40th percentile`, giving top 60% forest. Python computes `getHeightFromPercent(60) = 60th percentile`, giving top 40% forest.

**Change:**

```javascript
// BEFORE (wrong — top 60%):
this._iForestLevel = this.forestFrac.getHeightFromPercent(100 - this.iForestPercent);

// AFTER (matches Python — top 40%):
this._iForestLevel = this.forestFrac.getHeightFromPercent(this.iForestPercent);
```

---

### 5.3 Fix `addIceAtPlot()` — Edge condition, single random roll, ice latitude

**File:** `src/game/mapgen/FeatureGenerator.js`
**Lines:** 315–346

**Problem 1:** JS always applies edge-row ice. Python only does this for wrapX-but-not-wrapY maps (and vice versa for columns).

**Problem 2:** JS uses two random rolls. Python uses one.

**Problem 3:** JS generates `_randIceLatitude` from RNG. Python reads it from climate XML via `getRandIceLatitude()`.

**Change:** The `_randIceLatitude` value should be passed in via settings (caller provides the climate-appropriate value). Replace the method:

```javascript
addIceAtPlot(x, y, lat, plotTypes, features, rng) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;
  const plot = plotTypes[idx];

  // Ice only on water
  if (plot !== PLOT.OCEAN && plot !== PLOT.COAST) return;

  // Edge rows: ice only on specific wrap configurations
  if (this.wrapX && !this.wrapY) {
    if (y === 0 || y === H - 1) {
      features[idx] = FEATURE.ICE;
      return;
    }
  } else if (this.wrapY && !this.wrapX) {
    if (x === 0 || x === W - 1) {
      features[idx] = FEATURE.ICE;
      return;
    }
  }

  // Single random roll for both checks (matches Python)
  const rand = rng.nextInt(0, 99) / 100.0;

  // Dense ice band
  if (rand < 8.0 * (lat - (1.0 - (this._randIceLatitude / 2.0)))) {
    features[idx] = FEATURE.ICE;
  }
  // Sparse ice band (elif — only checked if dense didn't trigger)
  else if (rand < 4.0 * (lat - (1.0 - this._randIceLatitude))) {
    features[idx] = FEATURE.ICE;
  }
}
```

Key differences from current JS:
- Edge-row ice is conditional on wrap configuration
- One `rng.nextInt(0, 99) / 100.0` roll (integer 0–99 divided by 100), not `rng.next()`
- `elif` for sparse check (not independent `if`)

For `_randIceLatitude`: add a `randIceLatitude` setting to the constructor that callers pass in from their climate configuration. Remove the RNG-based generation from `generateFeatures()`.

---

### 5.4 Fix `getLatitudeAtPlot()` — Use Civ4's H/2 normalization

**File:** `src/game/mapgen/FeatureGenerator.js`
**Lines:** 176–184

Same fix as TerrainGenerator 4.3, but **without** the variation fractal jitter (FeatureGenerator's latitude is simpler):

```javascript
getLatitudeAtPlot(_x, y) {
  const halfH = this.iNumPlotsY / 2;
  let lat = Math.abs(halfH - y) / halfH;
  return Math.max(0.0, Math.min(1.0, lat));
}
```

Remove the `topLatitude` and `bottomLatitude` properties from the constructor.

---

## 6. Cross-cutting: Continent class changes

### 6.1 Add `done` flag to Continent

**File:** `src/game/mapgen/HintedWorld.js`

Add `done` property to the `Continent` constructor:

```javascript
constructor(id, centerX, centerY, targetNumBlocks, maxRadius = -1) {
  // ... existing properties ...
  this.done = (targetNumBlocks <= 1);
}
```

This is used by `buildAllContinents()` (section 2.6) and set by `expandContinentBy()` on failure (section 2.5).

---

## 7. Callers / map scripts

After making these changes, audit all map scripts in `src/game/mapgen/scripts/` for:

1. **`_randIceLatitude`**: Scripts that create `FeatureGenerator` must pass `randIceLatitude` from their climate config instead of relying on RNG generation.

2. **`topLatitude`/`bottomLatitude`**: Any script overriding `getLatitudeAtPlot()` using these removed properties must be updated to use the Civ4 `H/2` formula as the base, with script-specific compression applied on top.

3. **`expandContinentBy` is now recursive**: Callers that previously expected iterative behavior should verify stack depth is acceptable (continent blocks are typically < 30, so recursion depth is safe).

4. **`MultilayeredFractal.generatePlotsInRegion`**: Scripts passing `rift_grain`, `has_center_rift`, or `invert_heights` should be aware these are now no-ops. If any script relied on JS-only rift behavior in regions, that behavior will change.

---

## Change Summary

| #   | File                      | Method                        | Change Type     |
|-----|---------------------------|-------------------------------|-----------------|
| 1.1 | FractalWorld.js           | `calcWeights`                 | Formula fix     |
| 1.2 | FractalWorld.js           | `findBestSplitX`              | Condition fix   |
| 1.3 | FractalWorld.js           | `findBestSplitY`              | Condition fix   |
| 1.4 | FractalWorld.js           | `shiftPlotTypesBy`            | Rewrite         |
| 2.1 | HintedWorld.js            | `bestHintsSplitX`             | Rewrite         |
| 2.2 | HintedWorld.js            | `bestHintsSplitY`             | Rewrite         |
| 2.3 | HintedWorld.js            | `isValid`                     | Formula fix     |
| 2.4 | HintedWorld.js            | `findValid`                   | Rewrite         |
| 2.5 | HintedWorld.js            | `expandContinentBy`           | Rewrite         |
| 2.6 | HintedWorld.js            | `buildAllContinents`          | Simplify        |
| 3.1 | MultilayeredFractal.js    | `calcWeights`                 | Formula fix     |
| 3.2 | MultilayeredFractal.js    | `shiftRegionPlots`            | Add clamping    |
| 3.3 | MultilayeredFractal.js    | `findBestRegionSplit*`        | Condition fix   |
| 3.4 | MultilayeredFractal.js    | `generatePlotsInRegion`       | Remove rifts    |
| 3.5 | MultilayeredFractal.js    | `generatePlotsInRegion`       | Remove sea adj  |
| 4.1 | TerrainGenerator.js       | `initFractals`                | Grain fix       |
| 4.2 | TerrainGenerator.js       | constructor + multiple        | Remove mountain |
| 4.3 | TerrainGenerator.js       | `getLatitudeAtPlot`           | Rewrite         |
| 5.1 | FeatureGenerator.js       | `generateFeatures`            | Threshold fix   |
| 5.2 | FeatureGenerator.js       | `generateFeatures`            | Threshold fix   |
| 5.3 | FeatureGenerator.js       | `addIceAtPlot`                | Rewrite         |
| 5.4 | FeatureGenerator.js       | `getLatitudeAtPlot`           | Rewrite         |
| 6.1 | HintedWorld.js            | `Continent` constructor       | Add `done` flag |
