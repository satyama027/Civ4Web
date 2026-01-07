# Civ4web - Civilization IV: Beyond the Sword Web Clone

## Project Overview
A web-based clone of Civilization IV: Beyond the Sword built with modern web technologies. The goal is to recreate the full game experience with exact Civ4 BTS mechanics and formulas.

## Technology Stack
- **Frontend Framework**: React 18 with Vite
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM
- **Rendering**: Pixi.js (for future game map rendering with WebGL)
- **Styling**: CSS (custom Civ4-themed styling)
- **Package Manager**: npm

## Project Structure

```
Civ4web/
├── src/
│   ├── data/              # Game data files
│   │   ├── yields.js      # 11 yield types with SVG icons
│   │   ├── resources.js   # 27 resources (Strategic, Luxury, Bonus)
│   │   ├── terrainTypes.js # 14 terrain types
│   │   ├── improvements.js # 15 tile improvements
│   │   ├── units.js       # 50+ standard + 34 unique units
│   │   ├── technologies.js # 90+ technologies
│   │   ├── buildings.js   # 50+ standard + 34 unique buildings
│   │   ├── civilizations.js # 34 civilizations
│   │   └── leaders.js     # 52 leaders with traits
│   ├── pages/
│   │   ├── MainMenu.jsx   # Main menu screen
│   │   └── Civilopedia.jsx # Encyclopedia with 9 categories
│   ├── styles/
│   │   ├── MainMenu.css
│   │   └── Civilopedia.css
│   ├── store/
│   │   └── store.js       # Redux store configuration
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── claude.md              # This file
```

## Current Features

### Main Menu
- "New Game" button (placeholder)
- "Civilopedia" button (fully functional)
- Civ4-themed UI with gold/brown aesthetic

### Civilopedia
A comprehensive encyclopedia with a three-column interface:

#### Interface Layout
1. **Left Sidebar (Categories)**
   - 9 main categories
   - Always visible
   - Active category highlighted

2. **Middle Sidebar (Items)**
   - Appears when category selected (slides in with animation)
   - Search functionality
   - Scrollable item list
   - Selected item highlighted

3. **Right Content Area (Details)**
   - Full item details with SVG icons
   - Cross-linking between related items
   - Exact Civ4 BTS mechanics and formulas

#### Categories
1. **Yields** (11 items)
   - Food, Production, Commerce, Science, Gold, Culture
   - Espionage, Health, Happiness, Great People Points, Experience
   - Custom SVG icons for each
   - Exact Civ4 formulas

2. **Resources** (27 items)
   - Strategic (7): Iron, Copper, Horses, Oil, Uranium, Coal, Aluminum
   - Luxury (10): Gold, Silver, Gems, Silk, Spices, Wine, Ivory, Furs, Dyes, Incense
   - Bonus (10): Wheat, Corn, Rice, Cow, Pig, Sheep, Fish, Clam, Crab, Deer
   - Each with yields, tech requirements, enabled units/buildings

3. **Terrain Types** (14 items)
   - Base Terrain (5): Grassland, Plains, Desert, Tundra, Snow
   - Features (4): Forest, Jungle, Floodplains, Oasis
   - Elevation (2): Hills, Peaks
   - Water (2): Coast, Ocean
   - Movement costs, defense bonuses, base yields

4. **Improvements** (15 items)
   - Food: Farm, Watermill
   - Production: Mine, Workshop, Windmill
   - Commerce: Cottage (→Hamlet→Village→Town)
   - Resources: Pasture, Plantation, Camp, Fishing Boats, Offshore Platform
   - Infrastructure: Road, Railroad, Fort
   - Build times, tech requirements, bonus yields

5. **Units** (84 items)
   - 50+ standard units (Warrior, Archer, Swordsman, Knight, Cavalry, etc.)
   - 34 unique units (Navy SEAL, Samurai, Praetorian, etc.)
   - Stats: cost, strength, movement, required tech

6. **Technologies** (90+ items)
   - All eras: Ancient → Future
   - Research costs, prerequisites, unlocks

7. **Buildings** (84 items)
   - 50+ standard buildings
   - 34 unique buildings (Mall, Madrassa, Rathaus, etc.)
   - Effects, costs, tech requirements

8. **Civilizations** (34 items)
   - All Civ4 BTS civilizations
   - Unique units, unique buildings
   - Starting techs, leaders

9. **Leaders** (52 items)
   - Leader traits (detailed descriptions)
   - Civilizations, favorite civics

### Key Features
- **SVG Icons**: All yields, resources, terrain types, and improvements have custom SVG icons
- **Cross-linking**: Click on related items to navigate (e.g., click a civilization's unique unit to view it)
- **Search**: Filter items within each category
- **Exact Mechanics**: All formulas and mechanics match Civ4 BTS exactly
- **Unique Badges**: Special styling for unique units/buildings
- **Responsive Design**: Scrollable sidebars and content areas

## Design Decisions

### Grid Type
- **Square grid** (not hexagonal)
- Matches original Civ4 layout

### Player Mode
- **Single player only**
- Full Civ4 BTS clone experience

### Rendering
- **Pixi.js with WebGL** for future game map rendering
- High performance for large maps

### Icons
- **Custom SVG icons** instead of stock images
- Scalable, themeable, no external dependencies
- Used for: Yields, Resources, Terrain Types, Improvements

### State Management
- **Redux Toolkit** for game state (future implementation)
- Currently set up but not yet used

## Data Sources
- **Civilization Wiki (Fandom)**: Primary source for game data
- **CivFanatics**: Community resources and guides
- **GitHub XML files**: Original Civ4 BTS game data

## Game Mechanics (Planned Implementation)

### Yields System
All yields with exact Civ4 BTS formulas:
- Food: Population growth (2 per citizen, surplus accumulates)
- Production: Building units/buildings/wonders
- Commerce: Split into Science/Gold/Culture/Espionage via sliders
- Science: Technology research with prerequisite bonuses
- Gold: Treasury, maintenance, upgrades
- Culture: Border expansion, cultural victory
- Espionage: Spy missions, city visibility
- Health: City growth penalty if negative
- Happiness: Citizen productivity, disorder prevention
- GPP: Great People generation
- Experience: Unit promotions

### Resource System
- Strategic resources enable specific units
- Luxury resources provide happiness
- Bonus resources provide yields and health
- Resource improvements via workers
- Trade with other civilizations

### Terrain & Improvements
- Base terrain yields
- Terrain features modify yields
- Improvements add yields over time
- Movement costs affect unit travel
- Defense bonuses for combat

## Implementation Priorities
1. ✅ Main Menu UI
2. ✅ Civilopedia with all categories
3. ✅ SVG icons for core entities
4. ✅ Cross-linking system
5. ✅ Three-column interface
6. ⬜ Game map rendering (Pixi.js)
7. ⬜ City mechanics
8. ⬜ Unit movement and combat
9. ⬜ Technology tree
10. ⬜ Diplomacy system
11. ⬜ Victory conditions

## Git Repository
- **URL**: https://github.com/satyama027/Civ4Web
- Initial commit with full Civilopedia implementation
- All game data committed

## Development

### Running the Project
```bash
npm run dev
```
Server runs at: http://localhost:5173/

### Building for Production
```bash
npm run build
```

### Adding New Data
1. Create/update files in `src/data/`
2. Include SVG icons for visual entities
3. Add to Civilopedia categories
4. Create render function if new category
5. Update CSS if needed

## Code Style

### Component Structure
- Functional components with hooks
- useState for local state
- Clear separation of concerns

### Data Structure
All data objects include:
- `id`: Unique identifier
- `name`: Display name
- `icon`: Emoji fallback
- `color`: Theme color
- `svgIcon`: Inline SVG markup
- `description`: Detailed explanation
- Category-specific properties

### CSS Conventions
- Civ4 color scheme (gold #d4af37, brown #8b7355)
- Gradients for depth
- Hover effects and transitions
- Scrollbar styling for consistency

## Future Enhancements

### Short Term
- Add remaining Civilopedia categories (Civics, Religions, Wonders, Promotions, Specialists, Corporations)
- Implement game map with Pixi.js
- Basic city founding and management
- Worker actions and improvements

### Medium Term
- Unit movement and stacking
- Combat system
- Technology research
- Building construction
- City growth and food management

### Long Term
- Full AI opponents
- Diplomacy and trade
- Victory conditions
- Save/load system
- Game settings and customization

## Known Issues
- None currently

## Notes
- All formulas are exact Civ4 BTS mechanics
- No time estimates - focus on implementation quality
- Avoid over-engineering - implement features as requested
- Keep solutions simple and maintainable

---

Last Updated: 2026-01-07
