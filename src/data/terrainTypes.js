export const terrainTypes = [
  // BASE TERRAINS
  {
    id: 'grassland',
    name: 'Grassland',
    category: 'Base Terrain',
    icon: '🌱',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#7CCD7C"/>
      <g transform="translate(100, 100)">
        <ellipse cx="-40" cy="-40" rx="25" ry="15" fill="#90EE90" opacity="0.8"/>
        <ellipse cx="30" cy="-30" rx="30" ry="18" fill="#98FB98" opacity="0.8"/>
        <ellipse cx="-25" cy="20" rx="28" ry="16" fill="#8FBC8F" opacity="0.8"/>
        <ellipse cx="35" cy="25" rx="32" ry="20" fill="#90EE90" opacity="0.8"/>
        <path d="M -50,-20 Q -50,-35 -48,-40" stroke="#228B22" stroke-width="2" fill="none"/>
        <path d="M 20,-40 Q 22,-50 25,-55" stroke="#228B22" stroke-width="2" fill="none"/>
        <path d="M -35,30 Q -33,20 -30,15" stroke="#228B22" stroke-width="2" fill="none"/>
        <path d="M 45,10 Q 48,0 50,-5" stroke="#228B22" stroke-width="2" fill="none"/>
      </g>
    </svg>`,
    baseYields: {
      food: 2
    },
    movementCost: 1,
    description: 'Grassland is the most fertile base terrain, providing 2 food per turn. Ideal for cities focused on rapid population growth. Can support Forests and has no movement penalty.',
    defenseBonus: 0,
    canHaveForest: true,
    canHaveJungle: false
  },
  {
    id: 'plains',
    name: 'Plains',
    category: 'Base Terrain',
    icon: '🌾',
    color: '#DEB887',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#DEB887"/>
      <g transform="translate(100, 100)">
        <path d="M -60,-50 Q -55,-40 -50,-50 Q -45,-35 -40,-50" stroke="#DAA520" stroke-width="2" fill="none"/>
        <path d="M -30,-40 Q -25,-30 -20,-40 Q -15,-25 -10,-40" stroke="#B8860B" stroke-width="2" fill="none"/>
        <path d="M 10,-55 Q 15,-45 20,-55 Q 25,-40 30,-55" stroke="#DAA520" stroke-width="2" fill="none"/>
        <path d="M 40,-35 Q 45,-25 50,-35 Q 55,-20 60,-35" stroke="#B8860B" stroke-width="2" fill="none"/>
        <path d="M -55,10 Q -50,20 -45,10 Q -40,25 -35,10" stroke="#DAA520" stroke-width="2" fill="none"/>
        <path d="M -20,20 Q -15,30 -10,20 Q -5,35 0,20" stroke="#B8860B" stroke-width="2" fill="none"/>
        <path d="M 20,5 Q 25,15 30,5 Q 35,20 40,5" stroke="#DAA520" stroke-width="2" fill="none"/>
        <path d="M 45,25 Q 50,35 55,25 Q 60,40 65,25" stroke="#B8860B" stroke-width="2" fill="none"/>
      </g>
    </svg>`,
    baseYields: {
      food: 1,
      production: 1
    },
    movementCost: 1,
    description: 'Plains provide balanced yields with 1 food and 1 production. Good for cities that need both growth and production. Can support Forests.',
    defenseBonus: 0,
    canHaveForest: true,
    canHaveJungle: false
  },
  {
    id: 'desert',
    name: 'Desert',
    category: 'Base Terrain',
    icon: '🏜️',
    color: '#F4A460',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#EDC9AF"/>
      <g transform="translate(100, 100)">
        <path d="M -80,40 Q -60,20 -40,35 Q -20,15 0,30 Q 20,10 40,25 Q 60,5 80,20" fill="#DEB887" stroke="#D2B48C" stroke-width="2"/>
        <path d="M -70,55 Q -50,40 -30,50 Q -10,35 10,45 Q 30,30 50,40 Q 70,25 90,35" fill="#F5DEB3" stroke="#DEB887" stroke-width="2"/>
        <ellipse cx="-40" cy="-20" rx="15" ry="8" fill="#D2B48C" opacity="0.5"/>
        <ellipse cx="30" cy="-30" rx="12" ry="6" fill="#D2B48C" opacity="0.5"/>
        <ellipse cx="-10" cy="10" rx="10" ry="5" fill="#C19A6B" opacity="0.5"/>
      </g>
    </svg>`,
    baseYields: {},
    movementCost: 1,
    description: 'Desert provides no base yields, making it the weakest terrain type. However, it can contain valuable resources like Oil and Incense. Floodplains along rivers make deserts more habitable.',
    defenseBonus: 0,
    canHaveForest: false,
    canHaveJungle: false
  },
  {
    id: 'tundra',
    name: 'Tundra',
    category: 'Base Terrain',
    icon: '❄️',
    color: '#B0C4DE',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#D3D3D3"/>
      <g transform="translate(100, 100)">
        <circle cx="-50" cy="-40" r="5" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="40" cy="-50" r="6" fill="#F0F8FF" opacity="0.8"/>
        <circle cx="-30" cy="20" r="4" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="50" cy="30" r="5" fill="#F0F8FF" opacity="0.8"/>
        <ellipse cx="0" cy="-20" rx="35" ry="15" fill="#E6E6FA" opacity="0.5"/>
        <ellipse cx="-40" cy="10" rx="25" ry="12" fill="#F0F8FF" opacity="0.5"/>
        <ellipse cx="35" cy="5" rx="30" ry="14" fill="#E6E6FA" opacity="0.5"/>
        <path d="M -60,50 Q -40,45 -20,50 Q 0,45 20,50 Q 40,45 60,50" fill="none" stroke="#B0C4DE" stroke-width="2"/>
      </g>
    </svg>`,
    baseYields: {
      food: 1
    },
    movementCost: 1,
    description: 'Tundra provides only 1 food. A cold, sparse terrain that can support Forests. Generally avoided for settlement unless resources are present.',
    defenseBonus: 0,
    canHaveForest: true,
    canHaveJungle: false
  },
  {
    id: 'snow',
    name: 'Snow',
    category: 'Base Terrain',
    icon: '⛄',
    color: '#FFFFFF',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#FFFAFA"/>
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="8" fill="#FFFFFF" stroke="#E0E0E0" stroke-width="1"/>
        <line x1="0" y1="-12" x2="0" y2="12" stroke="#E0E0E0" stroke-width="2"/>
        <line x1="-12" y1="0" x2="12" y2="0" stroke="#E0E0E0" stroke-width="2"/>
        <line x1="-8" y1="-8" x2="8" y2="8" stroke="#E0E0E0" stroke-width="2"/>
        <line x1="8" y1="-8" x2="-8" y2="8" stroke="#E0E0E0" stroke-width="2"/>
        <circle cx="-45" cy="-45" r="6" fill="#F0F8FF" stroke="#D3D3D3" stroke-width="1"/>
        <circle cx="50" cy="-40" r="7" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="1"/>
        <circle cx="-40" cy="45" r="5" fill="#F0F8FF" stroke="#D3D3D3" stroke-width="1"/>
        <circle cx="45" cy="50" r="6" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="1"/>
      </g>
    </svg>`,
    baseYields: {},
    movementCost: 1,
    description: 'Snow is completely barren, providing no yields. The harshest terrain in Civilization IV. Impassable and unsuitable for settlement.',
    defenseBonus: 0,
    canHaveForest: false,
    canHaveJungle: false
  },

  // TERRAIN FEATURES
  {
    id: 'forest',
    name: 'Forest',
    category: 'Feature',
    icon: '🌲',
    color: '#228B22',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#2F4F2F"/>
      <g transform="translate(100, 100)">
        <rect x="-6" y="20" width="12" height="40" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <polygon points="0,-50 -30,-20 -20,-20 -35,5 -25,5 -40,30 40,30 25,5 35,5 20,-20 30,-20" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <polygon points="0,-45 -25,-18 -18,-18 -30,3 -23,3 -35,25 35,25 23,3 30,3 18,-18 25,-18" fill="#2E8B57" stroke="#006400" stroke-width="1.5"/>
        <circle cx="-15" cy="-10" r="5" fill="#3CB371" opacity="0.6"/>
        <circle cx="12" cy="5" r="6" fill="#3CB371" opacity="0.6"/>
      </g>
    </svg>`,
    baseYields: {
      production: 1
    },
    movementCost: 2,
    description: 'Forests add +1 Production and +25% defense. They reduce movement (2 cost). Can be chopped for instant production. Forests provide Health and can spread naturally.',
    defenseBonus: 25,
    canBeClearedForProduction: true,
    productionFromClearing: 20
  },
  {
    id: 'jungle',
    name: 'Jungle',
    category: 'Feature',
    icon: '🌴',
    color: '#006400',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#1a3d1a"/>
      <g transform="translate(100, 100)">
        <rect x="-8" y="15" width="16" height="45" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <ellipse cx="-35" cy="-25" rx="20" ry="35" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <ellipse cx="30" cy="-20" rx="22" ry="38" fill="#2E8B57" stroke="#006400" stroke-width="2"/>
        <ellipse cx="-15" cy="-10" rx="25" ry="30" fill="#3CB371" stroke="#006400" stroke-width="2"/>
        <ellipse cx="15" cy="-5" rx="24" ry="32" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <ellipse cx="0" cy="5" rx="28" ry="25" fill="#2E8B57" stroke="#006400" stroke-width="2"/>
        <path d="M -40,-40 Q -35,-50 -30,-45" stroke="#006400" stroke-width="3" fill="none"/>
        <path d="M 35,-35 Q 40,-45 45,-40" stroke="#006400" stroke-width="3" fill="none"/>
      </g>
    </svg>`,
    baseYields: {},
    movementCost: 2,
    description: 'Jungles provide no base yields but +25% defense. Cause -1 Health. Slow movement (2 cost). Must be cleared before improvements can be built. Found on Grassland and Plains near equator.',
    defenseBonus: 25,
    healthPenalty: -1,
    canBeClearedForProduction: true,
    productionFromClearing: 10
  },
  {
    id: 'floodplains',
    name: 'Floodplains',
    category: 'Feature',
    icon: '🏞️',
    color: '#8FBC8F',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#6B8E23"/>
      <g transform="translate(100, 100)">
        <path d="M -80,30 Q -60,25 -40,30 Q -20,35 0,30 Q 20,25 40,30 Q 60,35 80,30" fill="none" stroke="#4682B4" stroke-width="3" opacity="0.7"/>
        <path d="M -80,45 Q -60,40 -40,45 Q -20,50 0,45 Q 20,40 40,45 Q 60,50 80,45" fill="none" stroke="#4682B4" stroke-width="2" opacity="0.6"/>
        <ellipse cx="-40" cy="-10" rx="25" ry="15" fill="#9ACD32" opacity="0.7"/>
        <ellipse cx="35" cy="-15" rx="28" ry="12" fill="#8FBC8F" opacity="0.7"/>
        <ellipse cx="-10" cy="10" rx="22" ry="14" fill="#90EE90" opacity="0.7"/>
        <rect x="-60" y="50" width="120" height="20" fill="#DEB887" opacity="0.5"/>
      </g>
    </svg>`,
    baseYields: {
      food: 3
    },
    movementCost: 1,
    description: 'Floodplains provide excellent food (+3) making them ideal for growth. Found along rivers in Desert terrain. Can be farmed for even more food. Vulnerable to random events (floods).',
    defenseBonus: 0,
    foundOnTerrain: ['Desert']
  },
  {
    id: 'oasis',
    name: 'Oasis',
    category: 'Feature',
    icon: '🏝️',
    color: '#20B2AA',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#F4A460"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="10" rx="55" ry="40" fill="#20B2AA" stroke="#008B8B" stroke-width="3"/>
        <ellipse cx="0" cy="8" rx="48" ry="35" fill="#40E0D0" stroke="#008B8B" stroke-width="2"/>
        <rect x="-8" y="-10" width="16" height="35" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <ellipse cx="-25" cy="-30" rx="18" ry="25" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <ellipse cx="20" cy="-35" rx="20" ry="28" fill="#2E8B57" stroke="#006400" stroke-width="2"/>
        <ellipse cx="-5" cy="-45" rx="15" ry="22" fill="#3CB371" stroke="#006400" stroke-width="2"/>
        <ellipse cx="10" cy="-42" rx="16" ry="24" fill="#228B22" stroke="#006400" stroke-width="2"/>
      </g>
    </svg>`,
    baseYields: {
      food: 3
    },
    movementCost: 1,
    description: 'An Oasis provides +3 Food in the desert. A rare and valuable feature that makes desert settlement viable. Cannot be improved or removed.',
    defenseBonus: 0,
    foundOnTerrain: ['Desert']
  },

  // ELEVATION
  {
    id: 'hills',
    name: 'Hills',
    category: 'Elevation',
    icon: '⛰️',
    color: '#8B7355',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#A0826D"/>
      <g transform="translate(100, 100)">
        <path d="M -80,60 L -50,10 L -20,40 L 10,5 L 40,35 L 70,15 L 80,60 Z" fill="#8B7355" stroke="#654321" stroke-width="3"/>
        <path d="M -75,60 L -48,15 L -18,42 L 12,10 L 42,37 L 72,18 L 78,60 Z" fill="#A0826D" stroke="#654321" stroke-width="2"/>
        <polygon points="-50,10 -40,25 -60,25" fill="#654321" opacity="0.4"/>
        <polygon points="10,5 20,20 0,20" fill="#654321" opacity="0.4"/>
        <polygon points="40,35 50,48 30,48" fill="#654321" opacity="0.4"/>
      </g>
    </svg>`,
    baseYields: {
      production: 1
    },
    movementCost: 2,
    description: 'Hills provide +1 Production and +50% defense bonus. Movement cost is 2. Excellent for defensive positions and production cities. Can be mined for additional production. Can support Forests.',
    defenseBonus: 50,
    canHaveForest: true,
    canBeMined: true
  },
  {
    id: 'peaks',
    name: 'Peaks',
    category: 'Elevation',
    icon: '🗻',
    color: '#696969',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#505050"/>
      <g transform="translate(100, 100)">
        <polygon points="0,-70 -50,60 50,60" fill="#696969" stroke="#2d2d2d" stroke-width="3"/>
        <polygon points="0,-65 -45,55 45,55" fill="#808080" stroke="#2d2d2d" stroke-width="2"/>
        <polygon points="0,-65 -20,0 20,0" fill="#A9A9A9" stroke="#505050" stroke-width="2"/>
        <polygon points="-10,-35 0,-50 10,-35" fill="#FFFFFF" opacity="0.8"/>
        <polygon points="-15,-20 -5,-30 5,-20" fill="#F0F8FF" opacity="0.7"/>
        <path d="M -45,55 L -35,30 L -25,50" fill="#404040" opacity="0.5"/>
        <path d="M 25,50 L 35,30 L 45,55" fill="#404040" opacity="0.5"/>
      </g>
    </svg>`,
    baseYields: {},
    movementCost: Infinity,
    description: 'Peaks (Mountains) are impassable terrain that blocks movement and vision. They cannot be improved or settled. Provide natural barriers and strategic chokepoints. Only flying units can cross.',
    defenseBonus: 0,
    impassable: true
  },

  // WATER
  {
    id: 'coast',
    name: 'Coast',
    category: 'Water',
    icon: '🌊',
    color: '#4682B4',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#4682B4"/>
      <g transform="translate(100, 100)">
        <path d="M -80,-20 Q -60,-25 -40,-20 Q -20,-15 0,-20 Q 20,-25 40,-20 Q 60,-15 80,-20" fill="none" stroke="#87CEEB" stroke-width="3" opacity="0.6"/>
        <path d="M -80,0 Q -60,5 -40,0 Q -20,5 0,0 Q 20,5 40,0 Q 60,5 80,0" fill="none" stroke="#B0E0E6" stroke-width="3" opacity="0.5"/>
        <path d="M -80,20 Q -60,15 -40,20 Q -20,25 0,20 Q 20,15 40,20 Q 60,25 80,20" fill="none" stroke="#87CEEB" stroke-width="3" opacity="0.6"/>
        <path d="M -80,40 Q -60,45 -40,40 Q -20,35 0,40 Q 20,45 40,40 Q 60,35 80,40" fill="none" stroke="#B0E0E6" stroke-width="3" opacity="0.5"/>
        <circle cx="-30" cy="-35" r="8" fill="#FFFFFF" opacity="0.4"/>
        <circle cx="35" cy="-25" r="6" fill="#F0F8FF" opacity="0.4"/>
        <circle cx="-15" cy="10" r="7" fill="#FFFFFF" opacity="0.4"/>
      </g>
    </svg>`,
    baseYields: {
      food: 1,
      commerce: 1
    },
    movementCost: 1,
    description: 'Coast provides 1 Food and 1 Commerce. Can contain Fish, Clam, and Crab resources. Allows trade routes between cities. Can be improved with Fishing Boats. Workboats can work coastal resources.',
    defenseBonus: 0,
    waterTerrain: true,
    allowsNavalMovement: true
  },
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'Water',
    icon: '🌊',
    color: '#191970',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#191970"/>
      <g transform="translate(100, 100)">
        <path d="M -80,-30 Q -60,-40 -40,-30 Q -20,-20 0,-30 Q 20,-40 40,-30 Q 60,-20 80,-30" fill="none" stroke="#4169E1" stroke-width="4" opacity="0.5"/>
        <path d="M -80,-10 Q -60,0 -40,-10 Q -20,0 0,-10 Q 20,0 40,-10 Q 60,0 80,-10" fill="none" stroke="#4682B4" stroke-width="4" opacity="0.5"/>
        <path d="M -80,10 Q -60,0 -40,10 Q -20,20 0,10 Q 20,0 40,10 Q 60,20 80,10" fill="none" stroke="#4169E1" stroke-width="4" opacity="0.5"/>
        <path d="M -80,30 Q -60,40 -40,30 Q -20,20 0,30 Q 20,40 40,30 Q 60,20 80,30" fill="none" stroke="#4682B4" stroke-width="4" opacity="0.5"/>
        <circle cx="-40" cy="-45" r="10" fill="#1E90FF" opacity="0.3"/>
        <circle cx="30" cy="-50" r="8" fill="#1E90FF" opacity="0.3"/>
        <circle cx="-20" cy="50" r="9" fill="#1E90FF" opacity="0.3"/>
      </g>
    </svg>`,
    baseYields: {
      food: 1,
      commerce: 1
    },
    movementCost: 1,
    description: 'Ocean tiles provide 1 Food and 1 Commerce. Deeper water that can contain Fish and Whales. Requires Astronomy for early ships to enter. Major source of intercontinental trade routes.',
    defenseBonus: 0,
    waterTerrain: true,
    allowsNavalMovement: true,
    requiresAstronomy: true
  }
];

export const terrainCategories = {
  baseTerrain: terrainTypes.filter(t => t.category === 'Base Terrain'),
  features: terrainTypes.filter(t => t.category === 'Feature'),
  elevation: terrainTypes.filter(t => t.category === 'Elevation'),
  water: terrainTypes.filter(t => t.category === 'Water')
};
