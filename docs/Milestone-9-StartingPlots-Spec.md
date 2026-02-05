# Milestone 9: Starting Plots + Normalization — Implementation Specification

## Overview

**File**: `src/game/mapgen/StartingPlots.js`

Port of Civ4's starting plot assignment and 9 normalization passes. Ensures each player starts in a balanced location with food, production, and fresh water.

Called in the Civ4 pipeline **last**:
```
addBonuses() → assignStartingPlots() → normalization passes
```

---

## 1. Imports

```javascript
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';
import { BONUS_DEFS } from './BonusGenerator.js';
import { clamp } from './utils.js';
```

---

## 2. Constructor

```javascript
constructor(mapWidth, mapHeight, settings = {})
```

### Instance Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `iNumPlotsX` | mapWidth | Map width |
| `iNumPlotsY` | mapHeight | Map height |
| `wrapX` | `settings.wrapX !== false` | Horizontal wrapping |
| `wrapY` | `settings.wrapY \|\| false` | Vertical wrapping |
| `minStartingDistanceModifier` | `settings.minStartingDistanceModifier \|\| 0` | Per-script modifier (see table below) |

### Per-Script Distance Modifiers

| Script | Modifier | Constructor Setting |
|--------|----------|-------------------|
| Default / Continents / Fractal / Archipelago | 0 | `{ minStartingDistanceModifier: 0 }` |
| Lakes | -15 | `{ minStartingDistanceModifier: -15 }` |
| Terra | -20 | `{ minStartingDistanceModifier: -20 }` |
| Oasis | -35 | `{ minStartingDistanceModifier: -35 }` |
| Mirror / Team Battleground | -65 | `{ minStartingDistanceModifier: -65 }` |
| Inland Sea / Hub | -95 | `{ minStartingDistanceModifier: -95 }` |

---

## 3. Core Methods

### 3.1 `assignStartingPlots(numPlayers, rng, plotTypes, terrain, features, bonuses, rivers, lakes)` — Main Entry Point

Returns array of `{ x, y }` starting locations, one per player.

```javascript
assignStartingPlots(numPlayers, rng, plotTypes, terrain, features, bonuses, rivers, lakes) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // 1. Score every tile
  const scores = this._scoreAllTiles(plotTypes, terrain, features, bonuses, rivers, lakes);

  // 2. Build sorted candidate list (highest score first)
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (scores[idx] <= -900) continue;  // skip invalid tiles
      candidates.push({ x, y, score: scores[idx] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  // 3. Calculate minimum starting distance
  const baseRange = this._startingPlotRange(numPlayers);
  let minDist = baseRange;

  // 4. Multi-pass assignment with relaxing distance
  const starts = [];
  let maxPasses = 50;  // Civ4 uses up to 50 relaxation passes

  for (let pass = 0; pass < maxPasses && starts.length < numPlayers; pass++) {
    for (const candidate of candidates) {
      if (starts.length >= numPlayers) break;

      // Already selected?
      if (starts.some(s => s.x === candidate.x && s.y === candidate.y)) continue;

      // Distance check against all existing starts
      let tooClose = false;
      for (const existing of starts) {
        const dist = this._wrappedDistance(candidate.x, candidate.y, existing.x, existing.y);
        if (dist < minDist) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        starts.push({ x: candidate.x, y: candidate.y });
      }
    }

    // Relax distance each pass
    minDist = Math.max(1, minDist - 1);
  }

  return starts;
}
```

### 3.2 `_startingPlotRange(numPlayers)` — Minimum Distance Calculation

```javascript
_startingPlotRange(numPlayers) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // Civ4 formula: based on map area and player count
  const mapArea = W * H;
  let range = Math.floor(Math.sqrt(mapArea / Math.max(1, numPlayers)) * 0.7);

  // Apply per-script modifier (percentage adjustment)
  range = Math.max(1, Math.floor(range * (100 + this.minStartingDistanceModifier) / 100));

  return range;
}
```

### 3.3 `_scoreAllTiles(plotTypes, terrain, features, bonuses, rivers, lakes)` — Heuristic City Value

Returns 1D array of scores. Approximates Civ4's `AI_updateFoundValues()` by scoring the BFC (big fat cross — 21 tiles within city radius 2).

```javascript
_scoreAllTiles(plotTypes, terrain, features, bonuses, rivers, lakes) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const scores = new Array(W * H).fill(0);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      scores[y * W + x] = this._scoreSingleTile(x, y, plotTypes, terrain, features, bonuses, rivers, lakes);
    }
  }

  return scores;
}
```

### 3.4 `_scoreSingleTile(x, y, ...)` — Per-Tile Scoring

Scores the BFC (21 tiles in radius-2 cross pattern):

```javascript
_scoreSingleTile(x, y, plotTypes, terrain, features, bonuses, rivers, lakes) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;

  // Must be land (not water, not peak)
  const plot = plotTypes[idx];
  if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) return -999;

  let score = 0;
  let hasFreshWater = false;
  let hasCoast = false;

  // Score all tiles within radius 2 (BFC = big fat cross)
  // Radius-2 cross: all (dx, dy) where |dx| + |dy| <= 2 AND max(|dx|,|dy|) <= 2
  // This gives 21 tiles (the city's workable tiles)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      // BFC shape: exclude corners of the 5x5 square
      if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;

      let nx = x + dx;
      let ny = y + dy;

      if (this.wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;

      if (ny < 0 || ny >= H) continue;

      const nIdx = ny * W + nx;
      const nTerr = terrain[nIdx];
      const nPlot = plotTypes[nIdx];
      const nFeat = features[nIdx];
      const nBonus = bonuses[nIdx];

      // Food scoring
      if (nTerr === TERRAIN.GRASSLAND) score += 3;
      else if (nTerr === TERRAIN.PLAINS) score += 2;
      else if (nTerr === TERRAIN.DESERT) score -= 1;
      else if (nTerr === TERRAIN.TUNDRA) score -= 1;
      else if (nTerr === TERRAIN.SNOW) score -= 3;

      // Production scoring
      if (nPlot === PLOT.HILLS) score += 2;

      // Feature scoring
      if (nFeat === FEATURE.FOREST) score += 1;
      if (nFeat === FEATURE.JUNGLE) score -= 1;  // bad early game

      // Resource scoring
      if (nBonus !== null) {
        score += 4;
        // Extra for strategic resources
        const bonusDef = BONUS_DEFS.find(b => b.id === nBonus);
        if (bonusDef && (bonusDef.bonusClass === 'general' ||
            bonusDef.bonusClass === 'ancient' ||
            bonusDef.bonusClass === 'modern')) {
          score += 2;
        }
      }

      // Fresh water (river)
      if (rivers && this._tileHasRiver(rivers, nx, ny)) {
        score += 3;
        hasFreshWater = true;
      }

      // Fresh water (lake)
      if (lakes && lakes[nIdx]) {
        score += 2;
        hasFreshWater = true;
      }

      // Coast (within 1 tile for coastal access)
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        if (nTerr === TERRAIN.COAST || nPlot === PLOT.COAST) {
          hasCoast = true;
        }
      }
    }
  }

  // Coastal access bonus
  if (hasCoast) score += 3;

  // Fresh water penalty
  if (!hasFreshWater) score -= 5;

  return score;
}
```

**BFC shape** (21 tiles within radius 2):
```
    X
   XXX
  XXXXX
   XXX
    X
```
Excludes the 4 corners of the 5x5 square (where `|dx|=2` AND `|dy|=2`).

---

## 4. Normalization Passes

### 4.1 `normalize(starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng)` — Run All Passes

Runs all 9 normalization passes in Civ4 order. Each pass mutates the map data arrays in-place.

```javascript
normalize(starts, plotTypes, terrain, features, bonuses, rivers, lakes, rng) {
  // Pass 1: Group team starts (skip in single-player)
  // this.normalizeStartingPlotLocations(starts);

  // Pass 2: Ensure river near start
  this.normalizeAddRiver(starts, plotTypes, terrain, features, rivers, rng);

  // Pass 3: Remove peaks near start
  this.normalizeRemovePeaks(starts, plotTypes);

  // Pass 4: Ensure fresh water (add lake if needed)
  this.normalizeAddLakes(starts, plotTypes, terrain, rivers, lakes);

  // Pass 5: Remove jungle near start
  this.normalizeRemoveBadFeatures(starts, features);

  // Pass 6: Fix bad terrain near start
  this.normalizeRemoveBadTerrain(starts, plotTypes, terrain);

  // Pass 7: Ensure food resources near start
  this.normalizeAddFoodBonuses(starts, plotTypes, terrain, features, bonuses, rng);

  // Pass 8: Improve terrain quality near start
  this.normalizeAddGoodTerrain(starts, plotTypes, terrain);

  // Pass 9: Final extras (subclass hook for Balanced strategic placement)
  this.normalizeAddExtras(starts, plotTypes, terrain, features, bonuses, rivers, rng);
}
```

### 4.2 Pass 1: `normalizeStartingPlotLocations(starts)` — Team Grouping

Groups team members closer together. In single-player mode, this is a no-op.

```javascript
normalizeStartingPlotLocations(_starts) {
  // No-op in single player.
  // In team games: move each player's start toward their team centroid.
  // Implementation deferred until multiplayer support is added.
}
```

### 4.3 Pass 2: `normalizeAddRiver(starts, plotTypes, terrain, features, rivers, rng)` — Add River

If no river within 2 tiles of start, add one on the best nearby tile.

```javascript
normalizeAddRiver(starts, plotTypes, terrain, features, rivers, rng) {
  for (const start of starts) {
    // Check if any tile within radius 2 has a river
    if (this._hasRiverInRadius(start.x, start.y, 2, rivers)) continue;

    // Find best tile within radius 2 for a new river
    // Prefer: flat land, non-desert, non-snow, adjacent to start
    const bestTile = this._findBestRiverTile(start.x, start.y, plotTypes, terrain);
    if (!bestTile) continue;

    // Add river edges on that tile
    // Simple approach: add a north edge and/or west edge with sensible flow
    this._addRiverAtTile(bestTile.x, bestTile.y, rivers, plotTypes, rng);
  }
}
```

### 4.4 Pass 3: `normalizeRemovePeaks(starts, plotTypes)` — Remove Peaks

Convert peaks within 2 tiles of start to hills.

```javascript
normalizeRemovePeaks(starts, plotTypes) {
  const W = this.iNumPlotsX;

  for (const start of starts) {
    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
      const idx = ny * W + nx;
      if (plotTypes[idx] === PLOT.PEAK) {
        plotTypes[idx] = PLOT.HILLS;
      }
    }
  }
}
```

### 4.5 Pass 4: `normalizeAddLakes(starts, plotTypes, terrain, rivers, lakes)` — Add Lake

If start has no fresh water, convert a nearby flat land tile to a lake.

```javascript
normalizeAddLakes(starts, plotTypes, terrain, rivers, lakes) {
  const W = this.iNumPlotsX;

  for (const start of starts) {
    // Check for existing fresh water
    if (this._hasRiverInRadius(start.x, start.y, 2, rivers)) continue;
    if (this._hasLakeInRadius(start.x, start.y, 2, lakes)) continue;

    // Find best tile within 2 to convert to lake
    // Prefer: flat land, non-desert, adjacent to start
    let bestTile = null;
    let bestDist = Infinity;

    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
      const idx = ny * W + nx;
      if (plotTypes[idx] !== PLOT.LAND) continue;
      if (nx === start.x && ny === start.y) continue;  // don't lake the start tile

      const dist = this._wrappedDistance(start.x, start.y, nx, ny);
      if (dist < bestDist) {
        bestDist = dist;
        bestTile = { x: nx, y: ny };
      }
    }

    if (bestTile) {
      const idx = bestTile.y * W + bestTile.x;
      plotTypes[idx] = PLOT.OCEAN;
      terrain[idx] = TERRAIN.COAST;
      lakes[idx] = true;
    }
  }
}
```

### 4.6 Pass 5: `normalizeRemoveBadFeatures(starts, features)` — Remove Jungle

Remove jungle within 2 tiles of start.

```javascript
normalizeRemoveBadFeatures(starts, features) {
  const W = this.iNumPlotsX;

  for (const start of starts) {
    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
      const idx = ny * W + nx;
      if (features[idx] === FEATURE.JUNGLE) {
        features[idx] = FEATURE.NONE;
      }
    }
  }
}
```

### 4.7 Pass 6: `normalizeRemoveBadTerrain(starts, plotTypes, terrain)` — Fix Bad Terrain

Convert desert/snow/tundra within **1 tile** of start to plains or grassland.

```javascript
normalizeRemoveBadTerrain(starts, plotTypes, terrain) {
  const W = this.iNumPlotsX;

  for (const start of starts) {
    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 1)) {
      const idx = ny * W + nx;
      const plot = plotTypes[idx];
      if (plot === PLOT.OCEAN || plot === PLOT.COAST) continue;

      const terr = terrain[idx];
      if (terr === TERRAIN.DESERT) {
        terrain[idx] = TERRAIN.PLAINS;
      } else if (terr === TERRAIN.SNOW) {
        terrain[idx] = TERRAIN.PLAINS;
      } else if (terr === TERRAIN.TUNDRA) {
        terrain[idx] = TERRAIN.GRASSLAND;
      }
    }
  }
}
```

### 4.8 Pass 7: `normalizeAddFoodBonuses(starts, plotTypes, terrain, features, bonuses, rng)` — Add Food

If fewer than 1 food resource within radius 2, add one.

```javascript
normalizeAddFoodBonuses(starts, plotTypes, terrain, features, bonuses, rng) {
  const W = this.iNumPlotsX;

  // Food bonus IDs that can be placed
  const foodBonuses = ['wheat', 'corn', 'rice', 'cow', 'pig', 'sheep', 'deer'];

  for (const start of starts) {
    // Count existing food resources in BFC
    let foodCount = 0;
    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
      const bonus = bonuses[ny * W + nx];
      if (bonus && foodBonuses.includes(bonus)) foodCount++;
    }

    if (foodCount >= 1) continue;  // already has food

    // Try to place a food resource within radius 2
    const candidates = [];
    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
      const idx = ny * W + nx;
      if (bonuses[idx] !== null) continue;

      const plot = plotTypes[idx];
      const terr = terrain[idx];
      const feat = features[idx];

      // Try each food bonus, pick first that fits
      for (const foodId of foodBonuses) {
        const def = BONUS_DEFS.find(b => b.id === foodId);
        if (!def) continue;

        // Basic terrain/feature check (skip spacing for normalization)
        if (def.terrain && !def.terrain.includes(terr)) continue;
        if (def.requiresHills && plot !== PLOT.HILLS) continue;
        if (def.requiresFlatlands && plot !== PLOT.LAND) continue;
        if (def.noFeature && feat !== FEATURE.NONE) continue;
        if (def.features && !def.features.includes(feat)) continue;
        if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) continue;

        candidates.push({ x: nx, y: ny, bonusId: foodId });
        break;  // first match for this tile
      }
    }

    if (candidates.length > 0) {
      const pick = candidates[rng.nextInt(0, candidates.length - 1)];
      bonuses[pick.y * W + pick.x] = pick.bonusId;
    }
  }
}
```

### 4.9 Pass 8: `normalizeAddGoodTerrain(starts, plotTypes, terrain)` — Improve Terrain

Improve terrain quality near start: convert some plains to grassland, add hills for production.

```javascript
normalizeAddGoodTerrain(starts, plotTypes, terrain) {
  const W = this.iNumPlotsX;

  for (const start of starts) {
    let grassCount = 0;
    let hillsCount = 0;

    // Count existing good terrain in radius 2
    for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
      const idx = ny * W + nx;
      if (terrain[idx] === TERRAIN.GRASSLAND) grassCount++;
      if (plotTypes[idx] === PLOT.HILLS) hillsCount++;
    }

    // If too few grassland, convert some plains within radius 1
    if (grassCount < 3) {
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 1)) {
        const idx = ny * W + nx;
        if (terrain[idx] === TERRAIN.PLAINS && grassCount < 3) {
          terrain[idx] = TERRAIN.GRASSLAND;
          grassCount++;
        }
      }
    }

    // If no hills, convert one flat land within radius 2 to hills
    if (hillsCount === 0) {
      for (const [nx, ny] of this._getTilesInRadius(start.x, start.y, 2)) {
        const idx = ny * W + nx;
        if (plotTypes[idx] === PLOT.LAND &&
            terrain[idx] !== TERRAIN.DESERT &&
            !(nx === start.x && ny === start.y)) {
          plotTypes[idx] = PLOT.HILLS;
          break;
        }
      }
    }
  }
}
```

### 4.10 Pass 9: `normalizeAddExtras(...)` — Final Adjustments (Subclass Hook)

Base implementation is a no-op. Balanced.py overrides this to place strategic resources within 5 tiles of each start.

```javascript
normalizeAddExtras(_starts, _plotTypes, _terrain, _features, _bonuses, _rivers, _rng) {
  // No-op in base class.
  // Balanced.py overrides to place ALUMINUM, COAL, COPPER, HORSE, IRON, OIL, URANIUM
  // within 5 tiles of each start, using 4 relaxation passes.
}
```

---

## 5. Helper Methods

### 5.1 `_getTilesInRadius(x, y, radius)` — BFC Tile Iterator

Returns array of `[nx, ny]` pairs within the given radius, accounting for wrapping.

```javascript
_getTilesInRadius(x, y, radius) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const tiles = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      // BFC shape for radius 2: exclude corners
      if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;

      let nx = x + dx;
      let ny = y + dy;

      if (this.wrapX) nx = ((nx % W) + W) % W;
      else if (nx < 0 || nx >= W) continue;

      if (ny < 0 || ny >= H) continue;

      tiles.push([nx, ny]);
    }
  }

  return tiles;
}
```

### 5.2 `_wrappedDistance(x1, y1, x2, y2)` — Distance with Wrapping

```javascript
_wrappedDistance(x1, y1, x2, y2) {
  let dx = Math.abs(x1 - x2);
  if (this.wrapX) dx = Math.min(dx, this.iNumPlotsX - dx);

  let dy = Math.abs(y1 - y2);
  if (this.wrapY) dy = Math.min(dy, this.iNumPlotsY - dy);

  return Math.sqrt(dx * dx + dy * dy);
}
```

### 5.3 `_hasRiverInRadius(x, y, radius, rivers)` / `_hasLakeInRadius(x, y, radius, lakes)`

```javascript
_hasRiverInRadius(x, y, radius, rivers) {
  if (!rivers) return false;
  const W = this.iNumPlotsX;

  for (const [nx, ny] of this._getTilesInRadius(x, y, radius)) {
    if (this._tileHasRiver(rivers, nx, ny)) return true;
  }
  return false;
}

_hasLakeInRadius(x, y, radius, lakes) {
  if (!lakes) return false;
  const W = this.iNumPlotsX;

  for (const [nx, ny] of this._getTilesInRadius(x, y, radius)) {
    if (lakes[ny * W + nx]) return true;
  }
  return false;
}
```

### 5.4 `_tileHasRiver(rivers, x, y)` — Same as RiverGenerator/FeatureGenerator

```javascript
_tileHasRiver(rivers, x, y) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;

  const tile = rivers[idx];
  if (tile && (tile.isNOfRiver || tile.isWOfRiver)) return true;

  if (y + 1 < H && rivers[(y + 1) * W + x].isNOfRiver) return true;

  const ex = this.wrapX ? (x + 1) % W : x + 1;
  if (ex < W && rivers[y * W + ex].isWOfRiver) return true;

  return false;
}
```

**Note**: `_tileHasRiver` is duplicated across FeatureGenerator, RiverGenerator, and StartingPlots. Consider extracting to `utils.js` as a shared function during implementation. Or accept the duplication for now — each module stays self-contained.

### 5.5 River Addition Helpers (for Pass 2)

```javascript
_findBestRiverTile(startX, startY, plotTypes, terrain) {
  const W = this.iNumPlotsX;
  let best = null;
  let bestScore = -Infinity;

  for (const [nx, ny] of this._getTilesInRadius(startX, startY, 2)) {
    const idx = ny * W + nx;
    const plot = plotTypes[idx];
    const terr = terrain[idx];

    if (plot === PLOT.OCEAN || plot === PLOT.COAST || plot === PLOT.PEAK) continue;

    let score = 0;
    if (plot === PLOT.LAND) score += 2;  // prefer flat
    if (terr === TERRAIN.GRASSLAND) score += 1;
    if (terr === TERRAIN.PLAINS) score += 1;
    // Closer to start is better
    const dist = this._wrappedDistance(startX, startY, nx, ny);
    score -= dist;

    if (score > bestScore) {
      bestScore = score;
      best = { x: nx, y: ny };
    }
  }

  return best;
}

_addRiverAtTile(x, y, rivers, plotTypes, rng) {
  const W = this.iNumPlotsX;
  const idx = y * W + x;

  // Add a simple river segment on this tile's north edge
  rivers[idx].isNOfRiver = true;
  rivers[idx].riverNSDirection = rng.next() < 0.5 ? 'E' : 'W';
}
```

---

## 6. Normalization Disable Flags

Map scripts can disable specific normalization passes. Support this via settings:

```javascript
constructor(mapWidth, mapHeight, settings = {}) {
  // ... other settings ...

  // Normalization disable flags
  this.skipNormalization = settings.skipNormalization || false;           // skip ALL
  this.skipRemovePeaks = settings.skipRemovePeaks || false;              // Archipelago
  this.skipRemoveBadTerrain = settings.skipRemoveBadTerrain || false;    // Highlands
  this.skipAddGoodTerrain = settings.skipAddGoodTerrain || false;        // Highlands
  this.skipRemoveBadFeatures = settings.skipRemoveBadFeatures || false;  // Fantasy Realm
}
```

| Script | Settings |
|--------|----------|
| Archipelago | `{ skipRemovePeaks: true }` |
| Mirror | `{ skipNormalization: true }` |
| Oasis | `{ skipNormalization: true }` |
| Great Plains | `{ skipNormalization: true }` |
| Highlands | `{ skipRemovePeaks: true, skipRemoveBadTerrain: true, skipAddGoodTerrain: true }` |
| Fantasy Realm | `{ skipRemovePeaks: true, skipRemoveBadTerrain: true, skipRemoveBadFeatures: true, skipAddGoodTerrain: true }` |

In `normalize()`:
```javascript
normalize(starts, ...) {
  if (this.skipNormalization) return;

  this.normalizeStartingPlotLocations(starts);
  this.normalizeAddRiver(starts, ...);
  if (!this.skipRemovePeaks) this.normalizeRemovePeaks(starts, ...);
  this.normalizeAddLakes(starts, ...);
  if (!this.skipRemoveBadFeatures) this.normalizeRemoveBadFeatures(starts, ...);
  if (!this.skipRemoveBadTerrain) this.normalizeRemoveBadTerrain(starts, ...);
  this.normalizeAddFoodBonuses(starts, ...);
  if (!this.skipAddGoodTerrain) this.normalizeAddGoodTerrain(starts, ...);
  this.normalizeAddExtras(starts, ...);
}
```

---

## 7. Exports

```javascript
export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
export { BONUS_DEFS } from './BonusGenerator.js';
```

---

## 8. Differences from Existing `mapGenerator.js`

| Aspect | Old `findStartingLocations()` | New `StartingPlots` |
|--------|------------------------------|---------------------|
| Scoring | Simple sum in radius 2 | BFC-shaped scoring with food/prod/freshwater/coast weights |
| Distance | `sqrt(area/players) * 0.7` Euclidean | Civ4 range formula + per-script modifier, multi-pass relaxation |
| Normalization | None | 9 passes: river, peaks, lakes, jungle, terrain, food, terrain quality, extras |
| Fresh water | Not checked | Penalty for no fresh water, normalization adds river/lake if missing |
| Food guarantee | Not checked | Pass 7 ensures at least 1 food resource within BFC |
| Peak removal | Not done | Pass 3 converts peaks within 2 tiles to hills |
| Data format | 2D arrays | 1D arrays |

---

## 9. Testing / Verification Criteria

1. **Every start on land**: no starts on water or peaks
2. **Minimum separation**: starts are spread across the map
3. **Fresh water**: after normalization, every start has river or lake within 2 tiles
4. **No peaks near start**: after normalization, no peaks within 2 tiles
5. **No jungle near start**: after normalization, no jungle within 2 tiles
6. **No bad terrain near start**: after normalization, no desert/snow/tundra within 1 tile
7. **Food resources**: after normalization, at least 1 food resource within BFC
8. **Grassland**: after normalization, at least 3 grassland tiles near start
9. **Disabled passes**: when `skipNormalization=true`, no map mutations occur
10. **`npm run lint`**: clean, **`npm run build`**: clean
