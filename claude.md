# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fundamental Rule: Civ4 BTS Authenticity Above All

**Fidelity to the original Civ4 Beyond the Sword implementation is the highest priority in this project.** This rule overrides all other considerations:

1. **If our code matches the original Civ4 BTS C++/Python behavior, it is correct** — even if the behavior seems wrong, suboptimal, or unintuitive.
2. **If a test contradicts authentic Civ4 behavior, the test is wrong** — fix the test, not the code.
3. **Never "improve" upon Civ4's algorithms** unless explicitly asked. If Civ4 allows rivers on peaks, so do we. If Civ4 has a quirky formula, we replicate the quirk.
4. **Always verify against original sources** before proposing changes: the Civ4 BTS SDK C++ files (`CvMapGenerator.cpp`, etc.), Python scripts (`CvMapGeneratorUtil.py`, PublicMaps), and XML data files are the source of truth.
5. **When in doubt, check the original code** at `D:\Games\Civilization IV Complete\Civ4\Beyond the Sword\` before assuming something is a bug.

## Project Overview

Civ4web is a web-based clone of Civilization IV: Beyond the Sword. The goal is to recreate the exact Civ4 BTS game mechanics and formulas using modern web technologies.

**Tech Stack**: React 18 + Vite, Redux Toolkit, React Router, Babylon.js 8 (3D map rendering)

## Development Commands

```bash
# Start development server at http://localhost:5173/
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Architecture

### Three-Column Civilopedia Pattern

The Civilopedia uses a progressive disclosure pattern with three distinct columns:

1. **Left Sidebar (Category Selector)**: Always visible, contains category buttons
2. **Middle Sidebar (Item List)**: Conditionally rendered when `selectedCategory !== null`, slides in with CSS animation
3. **Right Content**: Shows item details or placeholder text

**Key State**:
- `selectedCategory`: Controls middle sidebar visibility (null = hidden)
- `selectedItem`: Controls which item details are displayed
- `searchTerm`: Filters items in middle sidebar

When adding new categories to Civilopedia:
1. Add data file to `src/data/` with standard object structure
2. Import in `Civilopedia.jsx` and add to `categories` array
3. Create `render{Category}Details()` function following existing patterns
4. Add case to `renderItemDetails()` switch statement

### Data Object Structure

All data objects follow this standard pattern:

```javascript
{
  id: 'unique_id',           // Required: unique identifier
  name: 'Display Name',      // Required: display text
  icon: '🎯',                // Required: emoji fallback
  color: '#hex',             // Required: theme color
  svgIcon: '<svg>...</svg>', // Required for visual entities
  description: 'text',       // Required: detailed explanation
  category: 'Type',          // Optional: subcategory
  // ... category-specific properties
}
```

**SVG Icons**: All yields, resources, terrain types, and improvements use inline SVG markup in the `svgIcon` field. Icons are rendered using `dangerouslySetInnerHTML` in a container with class `yield-image-container`.

### Cross-Linking System

The `navigateToItem(categoryId, itemName)` function enables cross-navigation between related entities (e.g., clicking a civilization's unique unit navigates to that unit). It:
1. Sets the target category as selected
2. Finds the item by name (or uniqueUnit/uniqueBuilding properties)
3. Sets that item as selected

When adding cross-links, use clickable spans with `className="clickable"` and `onClick={() => navigateToItem(...)}`.

### State Management

Redux Toolkit store is configured but **not yet used**. Current implementation uses React `useState` only. When implementing game logic:
- Use Redux for: game state, city data, unit positions, technology progress, diplomacy
- Keep UI state (sidebar selection, search) in component state

## Styling

### Design Theme: Ancient Empire / Illuminated Manuscript

The UI uses a cohesive "Ancient Empire" aesthetic inspired by illuminated manuscripts and classical antiquity.

**Fonts** (Google Fonts):
- `Cinzel`: Display font for titles and headings
- `Crimson Text`: Body text and descriptions
- `EB Garamond`: Elegant accents

**Theme Colors** (CSS variables in `index.css`):
- `--bg-primary`: #0a0e1a (deep indigo)
- `--bg-secondary`: #111827
- `--gold-primary`: #c9a227 (burnished gold)
- `--gold-bright`: #f4d03f
- `--gold-dark`: #8b6914
- `--copper`: #b87333
- `--text-primary`: #e8dcc4
- `--text-secondary`: #a89984

**CSS Architecture**: Each page has its own CSS file:
- `MainMenu.css`: Particle effects, corner ornaments, animated title
- `NewGame.css`: Two-column layout, styled selects, leader info panels
- `Civilopedia.css`: Three-column progressive disclosure
- `Game.css`: Babylon.js canvas (100% width/height), sidebar controls, tile info display

Scrollbars are styled consistently across all scrollable containers.

## Game Options Configuration

The `src/data/gameOptions.js` file contains all game setup configurations with Civ4 BTS-accurate values:

### Exports

| Export | Description |
|--------|-------------|
| `difficultyLevels` | 9 levels (Settler→Deity) with player/AI modifiers, starting units, happiness/health |
| `mapTypes` | 10 types (Pangaea, Continents, etc.) with land percentages |
| `mapSizes` | 6 sizes (Duel→Huge) with grid dimensions, tile counts, max players |
| `gameSpeeds` | 4 speeds (Quick→Marathon) with production/research/culture modifiers |
| `startingEras` | 6 eras with free techs and starting gold |
| `climateTypes` | 5 climates with terrain distribution percentages |
| `seaLevels` | 3 levels with water percentages |
| `barbarianSettings` | 3 settings with spawn/strength modifiers |
| `victoryConditions` | 6 victory types |
| `defaultGameSettings` | Default values for new game |

### Helper Functions

```javascript
import { getDifficultyConfig, getMapSizeConfig } from '../data/gameOptions';

const difficulty = getDifficultyConfig('prince');
console.log(difficulty.freeHappiness); // 4
```

### New Game Screen (`NewGame.jsx`)

Two-column layout:
- **Left**: Game Settings (difficulty, map type/size, speed, AI opponents, advanced options)
- **Right**: Leader Selection (dropdown with "Random" option, civilization details, leader traits)

Leader selection allows any leader to lead any civilization. Leaders are sorted alphabetically. Random leader is resolved at game start.

## Game Mechanics Implementation

**Critical**: All formulas must match Civ4 BTS exactly. Reference the existing data files for exact mechanics:
- `src/data/gameOptions.js`: Difficulty modifiers, game speed multipliers, map dimensions
- `src/data/yields.js`: Contains all yield formulas
- `src/game/mapGenerator.js`: Re-export wrapper for modular map generation system
- Each data file includes Civ4-accurate mechanics in descriptions

### Square Grid vs Hexagonal

This project uses **square tiles** (not hexagonal) to match original Civ4 layout.

### Map Generation (`src/game/mapgen/`)

Modular Civ4 BTS-accurate map generation system. Entry point dispatches to 10 per-map-type scripts, each implementing the full Civ4 pipeline using shared engine classes.

**Architecture:**
- `src/game/mapGenerator.js` — Thin re-export wrapper (backward compatibility)
- `src/game/mapgen/index.js` — Entry point: `generateMap()`, heightmap, output adapter
- `src/game/mapgen/scripts/*.js` — 10 map scripts (one per map type)
- `src/game/mapgen/*.js` — Engine classes

**Imports** (unchanged from old API):
```javascript
import { generateMap, getMapStats, TERRAIN } from '../game/mapGenerator';
```

**Map Scripts:**
| Script | File | Key Features |
|--------|------|-------------|
| Continents | `continents.js` | FractalWorld with center rift, shift |
| Fractal | `fractal.js` | Generic FractalWorld, random grain |
| Archipelago | `archipelago.js` | MultilayeredFractal island regions |
| Pangaea | `pangaea.js` | 5 subtypes (standard, snaky, shoreline, etc.) |
| Terra | `terra.js` | 12+ MultilayeredFractal regions, Old/New World |
| Inland Sea | `inlandSea.js` | HintedWorld ring, no X-wrap, custom rivers |
| Lakes | `lakes.js` | Inverted fractal, water clamped 7-14% |
| Oasis | `oasis.js` | All-land base, 4-band terrain, Nile rivers |
| Ice Age | `iceAge.js` | Wide/short grid, aggressive ice, custom terrain |
| Mirror | `mirror.js` | Half-map + multi-stage mirroring pipeline |

**Engine Classes:**
| Class | File | Purpose |
|-------|------|---------|
| `CyFractal` | `CyFractal.js` | Diamond-square fractal (grain, flags, hints) |
| `FractalWorld` | `FractalWorld.js` | 3-fractal plot type generation |
| `HintedWorld` | `HintedWorld.js` | Block-hint continent placement |
| `MultilayeredFractal` | `MultilayeredFractal.js` | Multi-region generation |
| `TerrainGenerator` | `TerrainGenerator.js` | Latitude-band terrain assignment |
| `FeatureGenerator` | `FeatureGenerator.js` | Forest/jungle/ice placement |
| `RiverGenerator` | `RiverGenerator.js` | Edge-based rivers & lakes |
| `BonusGenerator` | `BonusGenerator.js` | Civ4 XML-style resource placement |
| `StartingPlots` | `StartingPlots.js` | 8-pass starting location scoring |

**Usage:**
```javascript
import { generateMap, getMapStats, mapToAscii } from '../game/mapGenerator';

const map = generateMap({
  mapType: 'continents',    // pangaea, continents, archipelago, terra, fractal, etc.
  mapSize: 'standard',      // duel, tiny, small, standard, large, huge
  climate: 'temperate',     // tropical, temperate, rocky, arid, cold
  seaLevel: 'medium',       // low, medium, high
  numPlayers: 7,
  seed: 12345               // Optional: for reproducible maps
});

// Access tile data
const tile = map.getTile(x, y);
console.log(tile.terrain, tile.feature, tile.resource, tile.hasRiver);

// Debug output
console.log(mapToAscii(map));
console.log(getMapStats(map));
```

**Exports:**
| Export | Description |
|--------|-------------|
| `generateMap(settings)` | Main generation function, returns complete map data |
| `generatePangaea/Continents/etc.` | Convenience functions for specific map types |
| `mapToAscii(mapData)` | Debug visualization |
| `getMapStats(mapData)` | Statistics (land %, terrain counts, resources) |
| `TERRAIN`, `FEATURE`, `ELEVATION` | Constant enums |

**Map Data Structure:**
```javascript
{
  width, height, seed, settings,
  heightmap: number[][],      // 0-1 normalized elevation (visual only)
  plots: number[][],          // OCEAN/COAST/LAND/HILLS/PEAK
  terrain: string[][],        // Terrain type IDs
  features: string[][],       // Feature IDs (null if none)
  resources: string[][],      // Resource IDs (null if none)
  rivers: Object[][],         // { isNOfRiver, isWOfRiver, riverNSDirection, riverWEDirection }
  startingLocations: [{x, y}],
  getTile(x, y): Object,      // Helper with world-wrap, computed booleans, river field mapping
  getElevation(x, y): string  // 'flat'/'hills'/'peaks'
}
```

### Game Screen (`src/pages/Game.jsx`)

The game screen renders the generated map using **Babylon.js 8** with a 3D heightmap terrain mesh.

**Rendering Architecture** (`src/game/babylon/`):

| Module | Purpose |
|--------|---------|
| `BabylonScene.js` | Engine, scene, ArcRotateCamera (Civ4-style FOV/pitch), lighting |
| `TerrainBuilder.js` | Single continuous `VertexData` mesh from heightmap with vertex colors |
| `TerrainMaterials.js` | Custom GLSL `ShaderMaterial` with DDS detail textures per terrain type, terrain ID texture lookup, smoothstep blending at tile borders. Falls back to `StandardMaterial` with vertex colors while textures load |
| `TilePicker.js` | Position-based raycasting (`pickedPoint.xz` → tile coords), gold highlight quad |
| `FeatureRenderer.js` | Thin-instanced cones for forests/jungles (single draw call), river `LineSystem` |

**Terrain Mesh**: Single mesh with `(W+1)×(H+1)` vertices. Each tile = 2 triangles. Elevation averaged from adjacent tiles (peaks: 2.0-3.5, hills: 0.8-1.6, ocean: -0.4, flat land: 0-0.3). Vertex colors averaged from adjacent terrain types for smooth blending. **Triangle winding: `tl, tr, bl` / `tr, br, bl`** (clockwise when viewed from above — Babylon.js default front face).

**Shader Pipeline**: Terrain ID texture (W×H `RawTexture`, RGBA, NEAREST sampling) maps each tile to a terrain index (0-6). Fragment shader samples the correct DDS detail texture, extracts luminance, and multiplies with terrain base tint color. Blending at tile edges uses `smoothstep` in a 0.3 blend zone.

**DDS Textures**: Detail textures in `public/textures/terrain/*.dds` (served as static files). 7 terrain types: ocean, coast, grass, plains, desert, tundra, ice (used for snow). Missing: `hilldetail.dds` (falls back to peak), snow textures (uses ice). Original Civ4 textures from `src/assets/TerrainV2/`.

**Camera**: `ArcRotateCamera` with `alpha=-PI/2` (map width runs left-right), `beta=PI/9` (~20° from vertical), FOV=42°. Radius computed to fit both map dimensions. Limits: beta 0.01 to 62° from vertical.

**Controls:**
- Left-click + drag: Rotate camera
- Right-click + drag: Pan
- Scroll: Zoom
- Sidebar checkboxes: Toggle grid overlay, rivers

**Material Swap Strategy**: `createTerrainMaterial()` returns a `StandardMaterial` (vertex colors) immediately. A `ShaderMaterial` loads DDS textures in parallel. Once all 7 textures load, the mesh material is swapped to the shader. This avoids a blank screen during texture loading.

**Tile Picking**: Raycasts against the terrain mesh, converts `pickedPoint.xz` to tile coordinates via `Math.floor(x + 0.5)`. A semi-transparent gold ground plane follows the hovered tile.

**Vite Config**: `assetsInclude: ['**/*.dds']` in `vite.config.js` for DDS asset handling.

## Adding New Civilopedia Categories

Example workflow for adding "Civics" category:

1. Create `src/data/civics.js`:
```javascript
export const civics = [
  {
    id: 'hereditary_rule',
    name: 'Hereditary Rule',
    icon: '👑',
    color: '#9370DB',
    svgIcon: '<svg>...</svg>',
    category: 'Government',
    description: '...',
    effects: [...],
    // ...
  }
];
```

2. Update `Civilopedia.jsx`:
```javascript
import { civics } from '../data/civics';

const categories = [
  // ... existing categories
  { id: 'civics', name: 'Civics', data: civics }
];

const renderCivicDetails = (civic) => (
  <div className="item-details">
    {/* Follow existing render patterns */}
  </div>
);

// Add to renderItemDetails switch:
case 'civics':
  return renderCivicDetails(item);
```

## Data Sources

When adding/verifying game data, use these sources:
- **Civilization Wiki (Fandom)**: Primary reference for mechanics
- **CivFanatics**: Community guides and strategies
- **GitHub XML files**: Original Civ4 BTS game data for exact values

## Code Patterns

**Component Structure**: Use functional components with hooks. Keep render functions for detail views as separate const functions (not nested inside component).

**Imports**: Data files export named exports (e.g., `export const yields = [...]`). Some exports include utility objects (e.g., `yieldCategories`, `resourceCategories`).

**Navigation**: Use `react-router-dom`'s `useNavigate()` hook for page transitions. Main routes defined in `App.jsx`.

## Implementation Priorities

Completed:
- ✅ Main Menu UI (particle effects, animated title, corner ornaments)
- ✅ New Game Setup Screen (full options, leader selection, random support)
- ✅ Game Options Configuration (all Civ4 BTS-accurate values)
- ✅ Civilopedia (9 categories with SVG icons)
- ✅ Three-column interface with animations
- ✅ Cross-linking system
- ✅ Search functionality
- ✅ Ancient Empire / Illuminated Manuscript design theme
- ✅ Map Generation Algorithm (heightmap, tectonics, climate, rivers, resources)
- ✅ Game Map Rendering (Babylon.js 3D heightmap mesh with DDS textures)
- ✅ Terrain texture shader (GLSL ShaderMaterial with per-tile detail textures and blending)
- ✅ Feature rendering (thin-instanced trees, river lines)
- ✅ Tile picking and hover highlight

Next priorities:
1. City founding and management
2. Unit movement and combat
3. Technology tree UI and research mechanics

## Project Constraints

- **Single player only**: No multiplayer functionality planned
- **Exact mechanics**: All game formulas must match Civ4 BTS precisely
- **No time estimates**: Focus on quality implementation over speed
- **Simple solutions**: Avoid over-engineering; implement features as requested
