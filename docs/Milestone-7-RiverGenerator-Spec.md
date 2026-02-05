# Milestone 7: RiverGenerator + Lakes — Implementation Specification

## Overview

**File**: `src/game/mapgen/RiverGenerator.js`

Port of Civ4's C++ `CvMapGenerator::addRivers()` and `addLakes()`. Rivers flow along tile edges (not through tile centers) using an altitude-based downhill tracing algorithm.

Called in the Civ4 pipeline **after** terrain, **before** features:
```
generatePlotTypes() → generateTerrain() → addRivers() → addLakes() → addFeatures()
```

---

## 1. Direction Enums

```javascript
/**
 * Cardinal directions for river start/flow determination.
 * Matches Civ4's CardinalDirectionTypes.
 */
export const CARDINAL = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3
};

/**
 * Cardinal direction offsets (dx, dy) for each direction.
 * In our coordinate system: y=0 is top (north pole), y increases southward.
 */
export const CARDINAL_OFFSETS = {
  [CARDINAL.NORTH]: [0, -1],   // north = y decreases
  [CARDINAL.EAST]:  [1, 0],
  [CARDINAL.SOUTH]: [0, 1],    // south = y increases
  [CARDINAL.WEST]:  [-1, 0]
};

/**
 * Flow directions for river edges.
 * Used by the rendering pipeline.
 */
export const FLOW = {
  EAST: 'E',
  WEST: 'W',
  NORTH: 'N',
  SOUTH: 'S'
};
```

---

## 2. River Data Structure

Each tile stores river edge data. Rivers run on the **north edge** and **west edge** of a tile:

```javascript
// 1D array of river objects, indexed [y * width + x]
{
  isNOfRiver: false,      // river on north edge (horizontal, between this tile and tile above)
  isWOfRiver: false,      // river on west edge (vertical, between this tile and tile to the left)
  riverNSDirection: null,  // flow direction on north edge: FLOW.EAST or FLOW.WEST
  riverWEDirection: null   // flow direction on west edge: FLOW.NORTH or FLOW.SOUTH
}
```

**Edge semantics**:
- `isNOfRiver` on tile (x,y): horizontal river segment between (x,y) and (x,y-1)
- `isWOfRiver` on tile (x,y): vertical river segment between (x,y) and (x-1,y)
- A tile "has a river" if ANY of its 4 edges has a river (check own N/W + south neighbor's N + east neighbor's W)

---

## 3. Imports

```javascript
import { PLOT } from './FractalWorld.js';
import { TERRAIN } from './TerrainGenerator.js';
import { FEATURE } from './FeatureGenerator.js';
import { clamp } from './utils.js';
```

---

## 4. Constructor

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

No fractals needed — this module uses the altitude system instead.

---

## 5. Core Methods

### 5.1 `addRivers(rng, plotTypes, terrain, features)` — Main Entry Point

Returns 1D array of river objects.

```javascript
addRivers(rng, plotTypes, terrain, features) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;

  // 1. Allocate river data array
  const rivers = new Array(W * H);
  for (let i = 0; i < W * H; i++) {
    rivers[i] = { isNOfRiver: false, isWOfRiver: false, riverNSDirection: null, riverWEDirection: null };
  }

  // 2. Build altitude map
  const altitudes = this._buildAltitudeMap(rng, plotTypes, terrain, features);

  // 3. Build sorted tile list (highest altitude first)
  const tiles = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      tiles.push({ x, y, altitude: altitudes[y * W + x] });
    }
  }
  tiles.sort((a, b) => b.altitude - a.altitude);

  // 4. For each tile (highest to lowest): try to start a river
  for (const tile of tiles) {
    const { x, y } = tile;
    const idx = y * W + x;

    // Skip water tiles
    if (plotTypes[idx] === PLOT.OCEAN || plotTypes[idx] === PLOT.COAST) continue;

    // Skip tiles that already have a river
    if (this._tileHasRiver(rivers, x, y)) continue;

    // Find best start direction
    const direction = this.getRiverStartCardinalDirection(x, y, plotTypes, altitudes);
    if (direction === null) continue;

    // Trace river from this tile
    this._doRiver(x, y, direction, plotTypes, altitudes, rivers);
  }

  return rivers;
}
```

### 5.2 `getRiverAltitude(x, y, plotTypes, terrain, features, rng)` — Exact Civ4 Algorithm

Per-tile altitude for river flow. Higher tiles = rivers start here, lower tiles = rivers flow toward.

```javascript
// Base altitude from plot type
//   Peak = 4, Hills = 3, Land = 2, Water = 1
//
// Terrain modifier:
//   Desert or Snow: +1 (rivers avoid these, flow around them)
//
// Feature modifier:
//   Jungle or Forest: +1 (rivers start in forests/jungles)
//
// Scale and randomize:
//   altitude = altitude * 10 + rng.nextInt(0, 9)
```

The multiplication by 10 + random creates meaningful altitude separation while adding slight randomness so rivers don't all follow the same deterministic path.

### 5.3 `_buildAltitudeMap(rng, plotTypes, terrain, features)` — Helper

Build the full altitude array once (called from `addRivers`):

```javascript
_buildAltitudeMap(rng, plotTypes, terrain, features) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const altitudes = new Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const plot = plotTypes[idx];
      const terr = terrain[idx];
      const feat = features ? features[idx] : null;

      // Base from plot type
      let alt;
      if (plot === PLOT.PEAK) alt = 4;
      else if (plot === PLOT.HILLS) alt = 3;
      else if (plot === PLOT.LAND) alt = 2;
      else alt = 1;  // OCEAN or COAST

      // Terrain modifier
      if (terr === TERRAIN.DESERT || terr === TERRAIN.SNOW) alt += 1;

      // Feature modifier
      if (feat === FEATURE.JUNGLE || feat === FEATURE.FOREST) alt += 1;

      // Scale and randomize
      altitudes[idx] = alt * 10 + rng.nextInt(0, 9);
    }
  }

  return altitudes;
}
```

**Note**: Features are available at this point because in our pipeline rivers are placed after terrain. However, in Civ4's actual pipeline order, features come AFTER rivers. The altitude formula that references features uses feature data that was placed in a *previous game*'s cached data or is approximated. For our implementation: accept features as an optional parameter. If features is null, skip the feature modifier. This allows calling `addRivers` either before or after feature generation.

**Revision**: Re-reading the Civ4 pipeline more carefully:
```
addRivers() → addLakes() → addFeatures()
```
Rivers are placed BEFORE features. So features won't exist yet when `addRivers` is called. The `getRiverAltitude` in C++ reads the plot's current feature, which is `NO_FEATURE` at river time. The feature modifier (+1 for jungle/forest) would never trigger during initial generation. However, it IS used during normalization pass 2 (`normalizeAddRiver`), which runs after features are placed.

**Decision**: Accept features as optional. During initial `addRivers()` call, pass null. During `normalizeAddRiver()` (Milestone 9), pass the actual features array.

### 5.4 `getRiverStartCardinalDirection(x, y, plotTypes, altitudes)` — Exact Civ4 Algorithm

Determine if a river should start at this tile, and in which direction.

```javascript
getRiverStartCardinalDirection(x, y, plotTypes, altitudes) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const thisAlt = altitudes[y * W + x];

  let bestDir = null;
  let lowestAlt = thisAlt;  // only flow downhill
  let towardWater = false;

  for (const dir of [CARDINAL.NORTH, CARDINAL.EAST, CARDINAL.SOUTH, CARDINAL.WEST]) {
    const [dx, dy] = CARDINAL_OFFSETS[dir];
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
    const nAlt = altitudes[nIdx];
    const nPlot = plotTypes[nIdx];
    const nIsWater = (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST);

    // Prefer water neighbors (river endpoint)
    if (nIsWater && !towardWater) {
      bestDir = dir;
      lowestAlt = nAlt;
      towardWater = true;
    } else if (nIsWater && towardWater && nAlt < lowestAlt) {
      bestDir = dir;
      lowestAlt = nAlt;
    } else if (!towardWater && nAlt < lowestAlt) {
      bestDir = dir;
      lowestAlt = nAlt;
    }
  }

  return bestDir;  // null if no downhill neighbor
}
```

### 5.5 `_doRiver(startX, startY, startDir, plotTypes, altitudes, rivers)` — River Tracing

Traces a river from the starting tile, placing edge segments until reaching water or a dead end.

The core challenge is mapping cardinal movement directions to river edge placements:

**Edge placement rules based on flow direction**:
- River flowing **NORTH** (into tile from south): set `isWOfRiver` on the tile, flow = NORTH or SOUTH based on next turn
- River flowing **SOUTH** (into tile from north): set `isWOfRiver` on the appropriate tile
- River flowing **EAST** (into tile from west): set `isNOfRiver` on the tile
- River flowing **WEST** (into tile from east): set `isNOfRiver` on the appropriate tile

More precisely, the mapping from the LAST cardinal direction the river was traveling to the edge it creates:

| Last Direction | Edge Created | On Which Tile | Flow Direction |
|---------------|-------------|---------------|----------------|
| Entered from SOUTH (was going NORTH) | `isNOfRiver` on current tile | current (x,y) | depends on next direction: left turn → WEST, right turn → EAST |
| Entered from NORTH (was going SOUTH) | `isNOfRiver` on current tile | current (x,y) | depends on next: left → EAST, right → WEST |
| Entered from WEST (was going EAST) | `isWOfRiver` on current tile | current (x,y) | depends on next: left → NORTH, right → SOUTH |
| Entered from EAST (was going WEST) | `isWOfRiver` on current tile | current (x,y) | depends on next: left → SOUTH, right → NORTH |

**Simplified algorithm** (matching Civ4's approach):

```javascript
_doRiver(startX, startY, startDir, plotTypes, altitudes, rivers) {
  let x = startX;
  let y = startY;
  let lastDir = startDir;

  const maxSteps = this.iNumPlotsX + this.iNumPlotsY;  // prevent infinite loops
  const visited = new Set();

  for (let step = 0; step < maxSteps; step++) {
    const key = `${x},${y},${lastDir}`;
    if (visited.has(key)) break;  // loop detection
    visited.add(key);

    // Move in lastDir direction
    const [dx, dy] = CARDINAL_OFFSETS[lastDir];
    let nx = x + dx;
    let ny = y + dy;

    // Handle wrapping
    nx = this._wrapX(nx);
    if (ny < 0 || ny >= this.iNumPlotsY) break;

    const nIdx = ny * this.iNumPlotsX + nx;

    // Place river edge between (x,y) and (nx,ny)
    this._placeRiverEdge(x, y, nx, ny, lastDir, rivers);

    // Check if we reached water — if so, stop
    if (plotTypes[nIdx] === PLOT.OCEAN || plotTypes[nIdx] === PLOT.COAST) break;

    // Find best next direction from (nx, ny)
    const nextDir = this._getBestRiverDirection(nx, ny, lastDir, plotTypes, altitudes, rivers);
    if (nextDir === null) break;

    x = nx;
    y = ny;
    lastDir = nextDir;
  }
}
```

### 5.6 `_placeRiverEdge(fromX, fromY, toX, toY, direction, rivers)` — Edge Placement

Maps a cardinal movement to the correct river edge:

```javascript
_placeRiverEdge(fromX, fromY, toX, toY, direction, rivers) {
  const W = this.iNumPlotsX;

  switch (direction) {
    case CARDINAL.NORTH: {
      // Moving north: horizontal edge between fromY and toY (= fromY - 1)
      // isNOfRiver on the NORTHERN tile (toX, toY) — its north edge is this river
      // Actually: isNOfRiver on (fromX, fromY) since "N of river" means
      // the river is on the tile's north side
      // Wait — need to be precise about which tile stores the edge.
      //
      // Convention: isNOfRiver on (x,y) means a river on the NORTH edge of (x,y),
      // which is the SOUTH edge of (x, y-1).
      // Moving NORTH from (fromX, fromY) to (toX, toY=fromY-1):
      // The edge is between them. Store on fromX, fromY's north edge = (fromX, fromY).isNOfRiver?
      // No — store on the lower tile. isNOfRiver on (toX, toY) would be its north edge,
      // which is wrong. Store isNOfRiver on (fromX, fromY) — this tile's north edge.
      //
      // Hmm, let me use the Civ4 convention directly:
      // isNOfRiver on (x,y) = horizontal river between (x,y) and (x, y+1)
      // So moving NORTH from (x, y) to (x, y-1), the edge is at y-1's south = y's north? No.
      //
      // Let me define clearly:
      // Our y=0 is top (north). isNOfRiver at (x,y) = river on north edge =
      // between (x,y) and (x, y-1).
      //
      // Moving NORTH from (x,fromY) to (x, fromY-1):
      // Edge is between fromY and fromY-1 → isNOfRiver on (x, fromY)
      rivers[fromY * W + fromX].isNOfRiver = true;
      rivers[fromY * W + fromX].riverNSDirection = null; // set by caller based on context
      break;
    }
    // ... similar for SOUTH, EAST, WEST
  }
}
```

**Important**: The exact edge-to-tile mapping is the trickiest part of this implementation. The mapping depends on whether y=0 is north or south. In our codebase, **y=0 is the top of the map (north pole)**. The existing `mapGenerator.js` uses `isNOfRiver` to mean the river on the **north** edge of the tile and `isWOfRiver` for the **west** edge.

Here is the precise mapping:

```
Moving NORTH (y decreases):
  → horizontal edge between (x, y) and (x, y-1)
  → set isNOfRiver on (x, y) [river is on this tile's north edge]
  → riverNSDirection: determined by turn (FLOW.EAST or FLOW.WEST)

Moving SOUTH (y increases):
  → horizontal edge between (x, y) and (x, y+1)
  → set isNOfRiver on (x, y+1) [river is on the south tile's north edge]
  → riverNSDirection: determined by turn

Moving EAST (x increases):
  → vertical edge between (x, y) and (x+1, y)
  → set isWOfRiver on (x+1, y) [river is on the east tile's west edge]
  → riverWEDirection: determined by turn

Moving WEST (x decreases):
  → vertical edge between (x, y) and (x-1, y)
  → set isWOfRiver on (x, y) [river is on this tile's west edge]
  → riverWEDirection: determined by turn
```

### 5.7 `_getBestRiverDirection(x, y, lastDir, plotTypes, altitudes, rivers)` — Next Step

Find the best direction to continue the river from (x,y), avoiding going backward and preferring downhill/water:

```javascript
_getBestRiverDirection(x, y, lastDir, plotTypes, altitudes, rivers) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const oppositeDir = (lastDir + 2) % 4;  // don't go back

  let bestDir = null;
  let lowestAlt = Infinity;
  let foundWater = false;

  for (const dir of [CARDINAL.NORTH, CARDINAL.EAST, CARDINAL.SOUTH, CARDINAL.WEST]) {
    if (dir === oppositeDir) continue;  // no reversing

    const [dx, dy] = CARDINAL_OFFSETS[dir];
    let nx = x + dx;
    let ny = y + dy;

    nx = this._wrapX(nx);
    if (ny < 0 || ny >= H) continue;
    if (!this.wrapX && (nx < 0 || nx >= W)) continue;

    const nIdx = ny * W + nx;
    const nPlot = plotTypes[nIdx];
    const nAlt = altitudes[nIdx];
    const isWater = (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST);

    // Check if this edge already has a river (avoid crossing)
    if (this._edgeHasRiver(x, y, dir, rivers)) continue;

    if (isWater && !foundWater) {
      bestDir = dir;
      lowestAlt = nAlt;
      foundWater = true;
    } else if (isWater && foundWater && nAlt < lowestAlt) {
      bestDir = dir;
      lowestAlt = nAlt;
    } else if (!foundWater && nAlt < lowestAlt) {
      bestDir = dir;
      lowestAlt = nAlt;
    }
  }

  return bestDir;
}
```

### 5.8 `_edgeHasRiver(x, y, direction, rivers)` — Check for Existing River on Edge

```javascript
_edgeHasRiver(x, y, direction, rivers) {
  const W = this.iNumPlotsX;

  switch (direction) {
    case CARDINAL.NORTH:
      return rivers[y * W + x].isNOfRiver;
    case CARDINAL.SOUTH: {
      const sy = y + 1;
      if (sy >= this.iNumPlotsY) return false;
      return rivers[sy * W + x].isNOfRiver;
    }
    case CARDINAL.WEST:
      return rivers[y * W + x].isWOfRiver;
    case CARDINAL.EAST: {
      const ex = this._wrapX(x + 1);
      if (!this.wrapX && ex >= this.iNumPlotsX) return false;
      return rivers[y * W + ex].isWOfRiver;
    }
  }
  return false;
}
```

### 5.9 `_wrapX(x)` and `_tileHasRiver(rivers, x, y)` — Helpers

```javascript
_wrapX(x) {
  if (!this.wrapX) return x;
  return ((x % this.iNumPlotsX) + this.iNumPlotsX) % this.iNumPlotsX;
}

/**
 * Check if a tile has any river on any of its 4 edges.
 */
_tileHasRiver(rivers, x, y) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const idx = y * W + x;

  if (rivers[idx].isNOfRiver || rivers[idx].isWOfRiver) return true;

  // South neighbor's north edge
  if (y + 1 < H && rivers[(y + 1) * W + x].isNOfRiver) return true;

  // East neighbor's west edge
  const ex = this._wrapX(x + 1);
  if (this.wrapX || ex < W) {
    if (rivers[y * W + ex].isWOfRiver) return true;
  }

  return false;
}
```

---

## 6. `addLakes(plotTypes, terrain)` — Lake Detection

Converts enclosed single-tile ocean into lakes. Mutates `plotTypes` in-place (changes plot type or marks as lake). Returns a 1D boolean array indicating which tiles are lakes.

```javascript
addLakes(plotTypes, terrain) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  const lakes = new Array(W * H).fill(false);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (plotTypes[idx] !== PLOT.OCEAN) continue;

      // Check if ALL 8 neighbors are non-water
      let allLand = true;
      for (let dy = -1; dy <= 1 && allLand; dy++) {
        for (let dx = -1; dx <= 1 && allLand; dx++) {
          if (dx === 0 && dy === 0) continue;

          let nx = x + dx;
          let ny = y + dy;

          if (this.wrapX) {
            nx = ((nx % W) + W) % W;
          } else if (nx < 0 || nx >= W) {
            continue;  // off-map edge counts as "land" (not water)
          }

          if (this.wrapY) {
            ny = ((ny % H) + H) % H;
          } else if (ny < 0 || ny >= H) {
            continue;
          }

          const nPlot = plotTypes[ny * W + nx];
          if (nPlot === PLOT.OCEAN || nPlot === PLOT.COAST) {
            allLand = false;
          }
        }
      }

      if (allLand) {
        lakes[idx] = true;
        // In Civ4, lake tiles stay as PLOT.OCEAN but get a "lake" area type.
        // We mark them with a terrain change or keep a separate lakes array.
        // For now: mark in lakes array. Terrain stays OCEAN.
        // The lakes array is used by FeatureGenerator (floodplains) and
        // StartingPlots (fresh water check).
      }
    }
  }

  return lakes;
}
```

**Design note**: In Civ4, lakes are just ocean tiles in a "lake area" (a connected region of water surrounded by land). Since we don't have Civ4's area system, a boolean `lakes` array is the simplest approach. Consumers check `lakes[idx]` to determine fresh water access.

---

## 7. Utility: `toRivers2D(rivers)`

```javascript
toRivers2D(rivers) {
  const W = this.iNumPlotsX;
  const H = this.iNumPlotsY;
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => rivers[y * W + x])
  );
}
```

---

## 8. Exports

```javascript
export { CARDINAL, CARDINAL_OFFSETS, FLOW };
export { PLOT } from './FractalWorld.js';
export { TERRAIN } from './TerrainGenerator.js';
export { FEATURE } from './FeatureGenerator.js';
```

---

## 9. Per-Script Overrides (Future Milestones)

| Script | Override |
|--------|---------|
| **Inland Sea** | Override `getRiverStartCardinalDirection()`: rivers flow toward map center. Override `getRiverAltitude()`: `altitude = (abs(x - W/2) + abs(y - H/2)) * 20` |
| **Oasis** | Custom 4-quadrant rivers: one per quadrant, 60% north / 20% W / 20% E |
| **Mirror** | River direction corrections during mirroring: reflection reverses E/W, inversion reverses both |

---

## 10. Differences from Existing `mapGenerator.js`

| Aspect | Old `generateRivers()` | New `RiverGenerator` |
|--------|----------------------|---------------------|
| Altitude source | Fractal-based elevation | Plot type + terrain + feature modifiers (Civ4 formula) |
| River count | `sqrt(area) * 0.3` fixed count | Every eligible high tile attempts a river (Civ4 approach) |
| Source selection | Random from top-10 high tiles | Sorted by altitude, highest first |
| Tracing | Corner-based stepping | Edge-based cardinal direction stepping |
| Edge mapping | Indirect via corner adjacency | Direct cardinal-to-edge mapping (Civ4 model) |
| Flow direction | Computed from corner movement | Computed from cardinal turn direction |
| Loop detection | Visited set on corners | Visited set on (x,y,direction) triples |
| Data format | 2D arrays `[y][x]` | 1D arrays `[y * W + x]` with `toRivers2D()` |
| Lakes | Not implemented | `addLakes()` marks enclosed single-tile ocean |

---

## 11. Testing / Verification Criteria

1. **Rivers flow downhill**: rivers start at peaks/hills, end at water
2. **No rivers start in water**: only land tiles can be river sources
3. **No river crossings**: edges are checked before placement
4. **Rivers reach the ocean**: most rivers should terminate at water tiles
5. **Edge consistency**: every `isNOfRiver` has a valid `riverNSDirection`, every `isWOfRiver` has a valid `riverWEDirection`
6. **Lakes detected**: enclosed single-tile water bodies marked as lakes
7. **Lake fresh water**: tiles adjacent to lakes should count as having fresh water
8. **Backward compat**: `_tileHasRiver()` check works for FeatureGenerator's floodplains
9. **`npm run lint`**: clean, **`npm run build`**: clean
