# CvMapGeneratorUtil.py → JS Sync Spec (Round 2)

This document specifies every remaining change required to make the JS map
engine classes an exact port of `CvMapGeneratorUtil.py` from Civ4 BTS.

Source of truth: `D:\Games\Civilization IV Complete\Civ4\Assets\Python\CvMapGeneratorUtil.py`

Previous round of fixes already addressed: `calcWeights` symmetry,
`findBestSplitX/Y` PLOT_LAND counting, `bestHintsSplitX/Y` simple counting,
`shiftPlotTypesBy` guard + wrap, `isValid` raw distance, `findValid`
Chebyshev shells, `expandContinentBy` greedy selection, `buildAllContinents`
done flag, `shiftRegionPlots` clamping, jungle centered band, forest
threshold direction, ice edge conditions + single roll, latitude H/2
normalization, variation fractal grain.

---

## 1. HintedWorld.js — `addContinent`: Do NOT pass continent to `findValid`

**Python (line 320):**
```python
foundx, foundy = self.findValid(x, y, maxDist)
```
`findValid` is called without a continent reference. Inside `findValid`,
`isValid(tryx, tryy)` is called without `cont`, meaning:
- No `maxradius` check during initial placement search.
- ANY neighboring block ≥ 192 causes rejection (the `not cont` path at
  line 447).

**Current JS (line 366):**
```javascript
const continent = new Continent(id, startX, startY, numBlocks, maxRadius);
const validPos = this.findValid(startX, startY, maxDist, continent, rng);
```
JS creates the Continent BEFORE `findValid` and passes it in. This adds
`maxradius` checking and allows own-block neighbors during initial placement.

**Required change:**
- Call `this.findValid(startX, startY, maxDist, null, rng)` — pass `null`
  for continent.
- Create the Continent object AFTER `findValid` returns a valid position.

```javascript
addContinent(rng, numBlocks, x = -1, y = -1, maxDist = -1, maxRadius = -1) {
    let startX = x, startY = y;
    if (startX === -1) startX = rng.nextInt(0, this.w - 1);
    if (startY === -1) startY = rng.nextInt(0, this.h - 1);

    // Python: self.findValid(x, y, maxDist) — no continent passed
    const validPos = this.findValid(startX, startY, maxDist, null, rng);
    if (!validPos) return null;

    // Create continent AFTER finding valid position
    const id = this._nextContinentId++;
    const continent = new Continent(id, validPos.x, validPos.y, numBlocks, maxRadius);

    const centerValue = LAND_THRESHOLD + rng.nextInt(0, 63);
    this.setValue(validPos.x, validPos.y, centerValue);
    this._blockOwner.set(`${validPos.x},${validPos.y}`, continent.id);

    this.continents.push(continent);
    return continent;
}
```

---

## 2. HintedWorld.js — `generatePlotTypes`: Fix order of operations

**Python (lines 481–495):**
```python
def generatePlotTypes(self, water_percent=-1, shift_plot_types=False):
    # Step 1: Fill null entries with random water values
    for i in range(len(self.data)):
        if self.data[i] == None:
            self.data[i] = self.mapRand.get(48, "Generate Plot Types PYTHON")

    # Step 2: __doInitFractal → shiftHintsToMap() then fracInitHints()
    self.__doInitFractal()

    # Step 3: Auto-calculate water percent
    if (water_percent == -1):
        numPlots = len(self.data)
        numWaterPlots = 0
        for val in self.data:
            if val < 192:
                numWaterPlots += 1
        water_percent = int(100*numWaterPlots/numPlots)

    # Step 4: Delegate to parent
    return FractalWorld.generatePlotTypes(self, water_percent, shift_plot_types)
```

Order is: **fill nulls → shift hints → fracInitHints → water% → parent**.

**Current JS (lines 581–638):**
Order is: **shift hints → fill nulls → grain → fracInitHints → water% → parent**.

The shift happens BEFORE null-filling, so `shiftHintsToMap` operates on data
that still contains `null` entries. In Python, nulls are filled first, so
the hint-shifting scores operate on fully populated data.

**Required change:**
Reorder to match Python — fill nulls first, then shift:

```javascript
generatePlotTypes(rng, params = {}) {
    const { water_percent = -1, grain_amount = 3, shift_plot_types = false } = params;

    // Step 1: Fill null entries FIRST (before shifting)
    for (let i = 0; i < this.data.length; i++) {
        if (this.data[i] === null) {
            this.data[i] = rng.nextInt(0, 47);
        }
    }

    // Step 2: Shift hints (now operating on fully-populated data)
    this.shiftHintsToMap();

    // Step 3: Compute grain (see item 3)
    // Step 4: fracInitHints
    // Step 5: water percent
    // Step 6: parent generatePlotTypes
    // ... rest unchanged ...
}
```

Also: Python uses `int(100*numWaterPlots/numPlots)` (integer multiplication
then integer division in Python 2). JS should use
`Math.floor((waterBlocks / this.data.length) * 100)`.

---

## 3. HintedWorld.js — Grain loop: take LAST match, not first

**Python (lines 422–430):**
```python
iGrain = None
for i in range(minExp):
    width = (1 << (self.fracXExp - minExp + i))
    height = (1 << (self.fracYExp - minExp + i))
    if not self.iFlags & CyFractal.FracVals.FRAC_WRAP_X:
        width += 1
    if not self.iFlags & CyFractal.FracVals.FRAC_WRAP_Y:
        height += 1
    if size == width*height:
        iGrain = i
# No break — takes the LAST match
# assert(iGrain != None)
```

**Current JS (lines 601–611):**
```javascript
let iGrain = 1; // fallback
for (let i = 0; i < minExp; i++) {
    // ...
    if (size === gw * gh) {
        iGrain = i;
        break;  // BUG: takes first match, not last
    }
}
```

**Required change:**
- Remove the `break`.
- Initialize `iGrain = null`.
- After loop, warn if null (matching Python's `assert`), fall back to 1.

```javascript
let iGrain = null;
for (let i = 0; i < minExp; i++) {
    let gw = 1 << (this.fracXExp - minExp + i);
    let gh = 1 << (this.fracYExp - minExp + i);
    if (!this.wrapX) gw += 1;
    if (!this.wrapY) gh += 1;
    if (size === gw * gh) {
        iGrain = i;  // no break — take last match
    }
}
if (iGrain === null) {
    console.warn('HintedWorld: no matching grain for data size', size);
    iGrain = 1;
}
```

---

## 4. MultilayeredFractal.js — `findBestRegionSplitY`: Reproduce the Civ4 bug

**Python (lines 680–682):**
```python
def findBestRegionSplitY(self, iRegionWidth, iRegionHeight, stripRadius):
    stripSize = 2*stripRadius
    if stripSize > iRegionWidth:   # checks WIDTH, not HEIGHT (bug)
        return 0
```

Same bug as `FractalWorld.findBestSplitY` (which JS already reproduces).

**Current JS (line 387):**
```javascript
if (stripSize > regionHeight) return 0;  // "fixed" — checks height
```

**Required change:**
```javascript
// Civ4 bug: checks regionWidth, not regionHeight — reproduced for accuracy
if (stripSize > regionWidth) return 0;
```

---

## 5. MultilayeredFractal.js — `generatePlotsInRegion`: Remove defensive wrapping

**Python (lines 820–827):**
```python
for x in range(iRegionWidth):
    wholeworldX = x + iWestX
    for y in range(iRegionHeight):
        i = y*iRegionWidth + x
        if self.plotTypes[i] == PlotTypes.PLOT_OCEAN: continue
        wholeworldY = y + iSouthY
        iWorld = wholeworldY*self.iW + wholeworldX
        self.wholeworldPlotTypes[iWorld] = self.plotTypes[i]
```
No X-wrapping modulo. No Y-bounds check. Simple addition.

**Current JS (lines 262–276):**
```javascript
const globalX = ((iRegionWestX + rx) % this.iNumPlotsX + this.iNumPlotsX) % this.iNumPlotsX;
const globalY = iRegionSouthY + ry;
if (globalY >= 0 && globalY < this.iNumPlotsY) { ... }
```

**Required change:**
```javascript
for (let ry = 0; ry < iRegionHeight; ry++) {
    for (let rx = 0; rx < iRegionWidth; rx++) {
        const ri = ry * iRegionWidth + rx;
        if (regionalPlots[ri] === PLOT.OCEAN) continue;

        const globalX = iRegionWestX + rx;
        const globalY = iRegionSouthY + ry;
        const iWorld = globalY * this.iNumPlotsX + globalX;
        this.wholeworldPlotTypes[iWorld] = regionalPlots[ri];
    }
}
```

Callers MUST pass valid region dimensions (documented Civ4 contract).

---

## 6. TerrainGenerator.js — Replace approximate grain with exact XML table

**Python (line 983):**
```python
grain_amount += self.gc.getWorldInfo(self.map.getWorldSize()).getTerrainGrainChange()
```

From `CIV4WorldInfo.xml`:

| World Size | TerrainGrainChange | FeatureGrainChange |
|------------|-------------------|--------------------|
| Duel       | 0                 | 0                  |
| Tiny       | 0                 | 0                  |
| Small      | 0                 | 0                  |
| Standard   | 1                 | 1                  |
| Large      | 1                 | 1                  |
| Huge       | 1                 | 1                  |

**Current JS (lines 130–135):**
```javascript
getWorldSizeGrainAdjust() {
    const totalPlots = this.iNumPlotsX * this.iNumPlotsY;
    if (totalPlots <= 2048) return 0;
    if (totalPlots <= 4800) return 1;
    return 2;  // WRONG: returns 2 for Large/Huge, XML says 1
}
```

**Required change** (in both `TerrainGenerator.js` and `FeatureGenerator.js`):

Accept `mapSize` as a constructor setting:

```javascript
constructor(mapWidth, mapHeight, settings = {}) {
    // ...
    this.mapSize = settings.mapSize || 'standard';
}

getWorldSizeGrainAdjust() {
    const grainBySize = {
        duel: 0, tiny: 0, small: 0,
        standard: 1, large: 1, huge: 1
    };
    return grainBySize[this.mapSize] ?? 1;
}
```

Update all callers to pass `mapSize`.

---

## 7. TerrainGenerator.js — `generateTerrainAtPlot`: Return existing terrain for water

**Python (lines 1092–1093):**
```python
if (self.map.plot(iX, iY).isWater()):
    return self.map.plot(iX, iY).getTerrainType()
```
Returns the **already-assigned** terrain type for water tiles.

**Current JS (lines 223–224):**
```javascript
if (plotType === PLOT.OCEAN) return TERRAIN.OCEAN;
if (plotType === PLOT.COAST) return TERRAIN.COAST;
```
Returns hardcoded constants.

**Required change:**
Accept existing terrain and return it for water tiles:

```javascript
generateTerrainAtPlot(x, y, plotType, existingTerrain) {
    if (plotType === PLOT.OCEAN || plotType === PLOT.COAST) {
        return existingTerrain;
    }
    // ...rest unchanged...
}
```

Update `generateTerrain` to pre-populate water terrain:

```javascript
generateTerrain(rng, plotTypes) {
    // ...init fractals, compute thresholds...

    const terrain = new Array(W * H);
    for (let i = 0; i < W * H; i++) {
        if (plotTypes[i] === PLOT.OCEAN) terrain[i] = TERRAIN.OCEAN;
        else if (plotTypes[i] === PLOT.COAST) terrain[i] = TERRAIN.COAST;
        else terrain[i] = null;
    }

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const idx = y * W + x;
            terrain[idx] = this.generateTerrainAtPlot(x, y, plotTypes[idx], terrain[idx]);
        }
    }
    return terrain;
}
```

---

## 8. TerrainGenerator.js — `generateTerrainAtPlot`: Add desert/plains top-threshold checks

**Python (line 1106):**
```python
if ((desertVal >= self.iDesertBottom) and (desertVal <= self.iDesertTop) and
    (lat >= self.fDesertBottomLatitude) and (lat < self.fDesertTopLatitude)):
```
Checks BOTH `>= iDesertBottom` AND `<= iDesertTop`. Same for plains.

**Current JS (lines 243–248):**
Only checks the bottom threshold. The top threshold
(`getHeightFromPercent(100)`) is the fractal maximum, so the top check is
always true in practice — but the code should match Python exactly.

**Required change:**

Rename confusing fields and add top thresholds:

```javascript
// In generateTerrain, replace threshold computation:
this._iDesertBottom = this.desertFrac.getHeightFromPercent(this.iDesertBottomPercent);
this._iDesertTop = this.desertFrac.getHeightFromPercent(100);
this._iPlainsBottom = this.plainsFrac.getHeightFromPercent(this.iPlainsBottomPercent);
this._iPlainsTop = this.plainsFrac.getHeightFromPercent(100);

// In generateTerrainAtPlot:
if (desertVal >= this._iDesertBottom && desertVal <= this._iDesertTop &&
    lat >= this.fDesertBottomLatitude && lat < this.fDesertTopLatitude) {
    terrain = TERRAIN.DESERT;
} else if (plainsVal >= this._iPlainsBottom && plainsVal <= this._iPlainsTop) {
    terrain = TERRAIN.PLAINS;
}
```

---

## 9. FeatureGenerator.js — Add generic XML feature pass

**Python (lines 1178–1181):**
```python
for iI in range(self.gc.getNumFeatureInfos()):
    if pPlot.canHaveFeature(iI):
        if self.mapRand.get(10000, "Add Feature PYTHON") < self.gc.getFeatureInfo(iI).getAppearanceProbability():
            pPlot.setFeatureType(iI, -1)
```
Before ice/jungle/forest, Python iterates ALL feature types and places each
with its XML `iAppearanceProbability` (out of 10000). In standard BTS XML,
only **FEATURE_FOREST** has a non-zero value (5000, i.e. 50%).

**Current JS:** Entirely skipped.

**Required change:**
Add a generic feature pass before ice/jungle/forest. Since only forest has
non-zero probability in BTS, implement just that:

```javascript
addGenericFeaturesAtPlot(x, y, plotTypes, terrain, features, rng) {
    const idx = y * this.iNumPlotsX + x;
    const plot = plotTypes[idx];
    const terr = terrain[idx];

    // FEATURE_FOREST: iAppearanceProbability = 5000 (out of 10000)
    // canHaveFeature checks: land or hills, terrain is grass/plains/tundra/snow
    if ((plot === PLOT.LAND || plot === PLOT.HILLS) &&
        terr !== TERRAIN.DESERT && terr !== TERRAIN.OCEAN && terr !== TERRAIN.COAST) {
        if (rng.nextInt(0, 9999) < 5000) {
            features[idx] = FEATURE.FOREST;
        }
    }
}
```

Update `addFeaturesAtPlot` to call this first:

```javascript
addFeaturesAtPlot(x, y, plotTypes, terrain, features, rng) {
    const idx = y * this.iNumPlotsX + x;
    const lat = this.getLatitudeAtPlot(x, y);

    // Step 1: Generic XML features (appearance probability)
    this.addGenericFeaturesAtPlot(x, y, plotTypes, terrain, features, rng);

    // Step 2: Ice (only if no feature yet — matches Python check pattern)
    if (features[idx] === FEATURE.NONE) {
        this.addIceAtPlot(x, y, lat, plotTypes, features, rng);
    }

    // Step 3: Jungle
    if (features[idx] === FEATURE.NONE) {
        this.addJunglesAtPlot(x, y, lat, plotTypes, terrain, features);
    }

    // Step 4: Forest
    if (features[idx] === FEATURE.NONE) {
        this.addForestsAtPlot(x, y, lat, plotTypes, terrain, features);
    }
}
```

---

## 10. FeatureGenerator.js — `_randIceLatitude`: Use climate parameter, not random

**Python (lines 1200–1203):**
```python
if rand < 8 * (lat - (1.0 - (self.gc.getClimateInfo(self.map.getClimate()).getRandIceLatitude() / 2.0))):
```
`getRandIceLatitude()` returns a **fixed climate XML parameter**:

| Climate    | fRandIceLatitude |
|------------|-----------------|
| Tropical   | 0.30            |
| Arid       | 0.30            |
| Rocky      | 0.30            |
| Cold       | 0.60            |
| Temperate  | 0.30            |

**Current JS (line 218):**
```javascript
this._randIceLatitude = rng.nextInt(0, 99) / 500.0;  // random 0–0.198
```
Generates a random value instead of using the climate constant.

**Required change:**
Accept `randIceLatitude` as a constructor setting:

```javascript
constructor(mapWidth, mapHeight, settings = {}) {
    // ...
    this.randIceLatitude = settings.randIceLatitude ?? 0.30;
}
```

In `generateFeatures`, remove the random generation line. Use
`this.randIceLatitude` directly in `addIceAtPlot` instead of
`this._randIceLatitude`.

Update all callers to pass the climate-appropriate value.

---

## 11. FeatureGenerator.js — Add `canHaveFeature` helper

**Python** uses C++ `pPlot.canHaveFeature(featureType)` for all feature
placement. JS manually checks plot type and terrain in each `add*` method.

**Required change:**
Add a centralized `canHaveFeature` method matching Civ4 XML rules:

```javascript
canHaveFeature(featureType, plotType, terrainType) {
    switch (featureType) {
        case FEATURE.ICE:
            return (plotType === PLOT.OCEAN || plotType === PLOT.COAST);

        case FEATURE.JUNGLE:
            if (plotType !== PLOT.LAND && plotType !== PLOT.HILLS) return false;
            return (terrainType === TERRAIN.GRASSLAND);

        case FEATURE.FOREST:
            if (plotType !== PLOT.LAND && plotType !== PLOT.HILLS) return false;
            return (terrainType === TERRAIN.GRASSLAND ||
                    terrainType === TERRAIN.PLAINS ||
                    terrainType === TERRAIN.TUNDRA ||
                    terrainType === TERRAIN.SNOW);

        case FEATURE.OASIS:
            return (plotType === PLOT.LAND && terrainType === TERRAIN.DESERT);

        case FEATURE.FLOODPLAINS:
            return (plotType === PLOT.LAND && terrainType === TERRAIN.DESERT);

        default:
            return false;
    }
}
```

Use this in `addIceAtPlot`, `addJunglesAtPlot`, `addForestsAtPlot`,
`addGenericFeaturesAtPlot`, and `addOasisAtPlot` instead of inline checks.

---

## Files affected

| File | Items |
|------|-------|
| `src/game/mapgen/HintedWorld.js` | 1, 2, 3 |
| `src/game/mapgen/MultilayeredFractal.js` | 4, 5 |
| `src/game/mapgen/TerrainGenerator.js` | 6, 7, 8 |
| `src/game/mapgen/FeatureGenerator.js` | 9, 10, 11 |
| `src/game/mapgen/FractalWorld.js` | No changes needed |
| `src/game/mapgen/utils.js` | No changes needed |

## Callers to update

Items 6 and 10 add new constructor settings (`mapSize`, `randIceLatitude`)
that must be passed by callers. Grep for `new TerrainGenerator` and
`new FeatureGenerator` across:
- `src/game/mapgen/scripts/*.js` (all 10 map scripts)
- `src/game/mapgen/index.js` (pipeline entry point)

---

## Change Summary

| #  | File                   | Method / Area                   | Change Type      |
|----|------------------------|---------------------------------|------------------|
| 1  | HintedWorld.js         | `addContinent`                  | Reorder logic    |
| 2  | HintedWorld.js         | `generatePlotTypes`             | Reorder steps    |
| 3  | HintedWorld.js         | grain loop in `generatePlotTypes` | Remove `break` |
| 4  | MultilayeredFractal.js | `findBestRegionSplitY`          | Bug reproduction |
| 5  | MultilayeredFractal.js | `generatePlotsInRegion` layering | Remove wrapping |
| 6  | TerrainGenerator.js    | `getWorldSizeGrainAdjust`       | Use XML table    |
| 7  | TerrainGenerator.js    | `generateTerrainAtPlot` water   | Pass-through     |
| 8  | TerrainGenerator.js    | `generateTerrainAtPlot` desert  | Add top check    |
| 9  | FeatureGenerator.js    | `addFeaturesAtPlot`             | Add XML pass     |
| 10 | FeatureGenerator.js    | `_randIceLatitude`              | Climate param    |
| 11 | FeatureGenerator.js    | new `canHaveFeature`            | Centralize       |
