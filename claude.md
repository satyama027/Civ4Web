# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Civ4web is a web-based clone of Civilization IV: Beyond the Sword. The goal is to recreate the exact Civ4 BTS game mechanics and formulas using modern web technologies.

**Tech Stack**: React 18 + Vite, Redux Toolkit, React Router, Canvas 2D (map rendering)

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
- `Game.css`: Map canvas, sidebar controls, tile info display

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
- `src/game/mapGenerator.js`: Complete map generation algorithms
- Each data file includes Civ4-accurate mechanics in descriptions

### Square Grid vs Hexagonal

This project uses **square tiles** (not hexagonal) to match original Civ4 layout.

### Map Generation (`src/game/mapGenerator.js`)

Complete Civ4 BTS-accurate map generation system based on PerfectWorld2.py algorithms:

**Algorithm Pipeline:**
1. **Heightmap Generation**: Midpoint displacement (diamond-square) for fractal terrain
2. **Plate Tectonics**: Simulates tectonic plates, raises terrain at boundaries for mountain ranges
3. **Plot Types**: Uses altitude *differences* (not absolute) for hills/peaks - looks more natural
4. **Climate Simulation**: Temperature based on latitude + altitude; rainfall with prevailing winds
5. **Terrain Assignment**: Whittaker biome model (temperature × rainfall → terrain type)
6. **River Generation**: Traces drainage paths from highlands to sea
7. **Feature Placement**: Forests, jungles, oases, floodplains based on climate
8. **Resource Placement**: Follows Civ4 XML rules with spacing constraints
9. **Starting Locations**: Scores tiles for food, production, fresh water, coastal access

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
| `TERRAIN`, `FEATURE`, `ELEVATION` | Constant enums matching terrainTypes.js |

**Map Data Structure:**
```javascript
{
  width, height, seed, settings,
  heightmap: number[][],      // 0-1 normalized elevation
  plots: number[][],          // OCEAN/COAST/LAND/HILLS/PEAK
  terrain: string[][],        // Terrain type IDs
  features: string[][],       // Feature IDs (null if none)
  resources: string[][],      // Resource IDs (null if none)
  rivers: Object[][],         // { hasRiver, flowDirection, riverSize }
  temperature: number[][],    // 0-1 (0=cold, 1=hot)
  rainfall: number[][],       // 0-1 (0=dry, 1=wet)
  startingLocations: [{x, y}],
  getTile(x, y): Object,      // Helper with world-wrap
  getElevation(x, y): string  // FLAT/HILLS/PEAKS
}
```

### Game Screen (`src/pages/Game.jsx`)

The game screen renders the generated map using Canvas 2D with two view modes:

**Isometric View** (default, zoom ≥ 40%):
- Diamond-shaped tiles (128×64 pixels at 100% zoom)
- 3D terrain with gradients and side faces for depth
- Hills show raised bumps, peaks display mountains with snow caps
- Trees rendered for forests/jungles with layered foliage
- Back-to-front rendering order for proper tile overlap

**Top-Down View** (zoom < 40%):
- Simple square tiles for quick overview
- Automatic switch when zooming out past threshold

**Controls:**
- Trackpad/mouse drag: Pan the map
- Zoom slider: Control zoom level (15% - 200%)
- Sidebar checkboxes: Toggle grid, resources, rivers

**Key Constants:**
```javascript
const ISO_TILE_WIDTH = 128;
const ISO_TILE_HEIGHT = 64;
const ISO_VIEW_THRESHOLD = 0.4; // Switch to top-down below 40% zoom
```

**Coordinate Conversion:**
```javascript
// World to screen (isometric)
const screenX = (tileX - tileY) * (tileWidth / 2) + offset.x;
const screenY = (tileX + tileY) * (tileHeight / 2) + offset.y;

// Screen to world (isometric)
const tileX = ((x / (tileWidth/2)) + (y / (tileHeight/2))) / 2;
const tileY = ((y / (tileHeight/2)) - (x / (tileWidth/2))) / 2;
```

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
- ✅ Game Map Rendering (Canvas 2D, isometric + top-down views)

Next priorities:
1. City founding and management
2. Unit movement and combat
3. Technology tree UI and research mechanics

## Project Constraints

- **Single player only**: No multiplayer functionality planned
- **Exact mechanics**: All game formulas must match Civ4 BTS precisely
- **No time estimates**: Focus on quality implementation over speed
- **Simple solutions**: Avoid over-engineering; implement features as requested
