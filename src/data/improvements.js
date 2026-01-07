export const improvements = [
  // BASIC IMPROVEMENTS
  {
    id: 'farm',
    name: 'Farm',
    category: 'Food',
    icon: '🚜',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-60" y="-50" width="35" height="100" fill="#D2691E" opacity="0.6"/>
        <rect x="-20" y="-50" width="35" height="100" fill="#A0522D" opacity="0.6"/>
        <rect x="20" y="-50" width="35" height="100" fill="#D2691E" opacity="0.6"/>
        <path d="M -70,-55 L -70,55 M -25,-55 L -25,55 M 15,-55 L 15,55 M 60,-55 L 60,55" stroke="#8B4513" stroke-width="3"/>
        <ellipse cx="-42" cy="-30" rx="12" ry="8" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="-2" cy="-25" rx="10" ry="7" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="38" cy="-28" rx="11" ry="8" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="-42" cy="15" rx="12" ry="8" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="-2" cy="20" rx="10" ry="7" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="38" cy="18" rx="11" ry="8" fill="#FFD700" opacity="0.7"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    requiredTech: 'Agriculture',
    buildTime: 5,
    description: 'Farms provide +1 Food. With Civil Service tech, farms adjacent to fresh water provide +1 additional food. Biology adds another +1 food. The primary improvement for growing cities.',
    validTerrain: ['Grassland', 'Plains', 'Desert (with Floodplains)'],
    bonusYieldsWithTech: {
      'Civil Service': { food: 1, condition: 'Adjacent to fresh water' },
      'Biology': { food: 1 }
    }
  },
  {
    id: 'mine',
    name: 'Mine',
    category: 'Production',
    icon: '⛏️',
    color: '#808080',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#A0826D"/>
      <g transform="translate(100, 100)">
        <rect x="-40" y="20" width="80" height="40" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <polygon points="-40,20 0,-20 40,20" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <rect x="-8" y="0" width="16" height="60" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <rect x="-25" y="10" width="50" height="10" fill="#A9A9A9" stroke="#696969" stroke-width="2"/>
        <circle cx="-20" cy="40" r="6" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <circle cx="18" cy="35" r="5" fill="#C0C0C0" stroke="#A9A9A9" stroke-width="1.5"/>
        <polygon points="-35,-10 -25,-5 -28,0" fill="#808080" stroke="#505050" stroke-width="1"/>
        <polygon points="30,-8 35,0 25,2" fill="#808080" stroke="#505050" stroke-width="1"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    requiredTech: 'Mining',
    buildTime: 5,
    description: 'Mines provide +1 Production. On hills, they provide additional production. Chemistry adds +1 production to mines. Essential for production-focused cities and accessing strategic resources.',
    validTerrain: ['Hills', 'Desert', 'Tundra', 'Plains (with resources)'],
    bonusYieldsWithTech: {
      'Chemistry': { production: 1 }
    }
  },
  {
    id: 'cottage',
    name: 'Cottage',
    category: 'Commerce',
    icon: '🏠',
    color: '#DEB887',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-30" y="0" width="60" height="40" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <polygon points="-35,0 0,-30 35,0" fill="#CD853F" stroke="#8B4513" stroke-width="2"/>
        <rect x="-8" y="15" width="16" height="25" fill="#654321" stroke="#4d3319" stroke-width="1.5"/>
        <rect x="-20" y="10" width="10" height="10" fill="#87CEEB" stroke="#4682B4" stroke-width="1.5"/>
        <rect x="10" y="10" width="10" height="10" fill="#87CEEB" stroke="#4682B4" stroke-width="1.5"/>
        <path d="M -5,15 L -5,22 M 5,15 L 5,22" stroke="#4d3319" stroke-width="1"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    requiredTech: 'Pottery',
    buildTime: 5,
    description: 'Cottages provide +1 Commerce and grow over time: Cottage (1 commerce) → Hamlet (2) → Village (3) → Town (4). Takes 50 turns to fully mature. Democracy speeds up growth. Best for science-focused empires.',
    validTerrain: ['Grassland', 'Plains', 'Desert (with Floodplains)'],
    upgrades: [
      { name: 'Hamlet', turns: 10, commerce: 2 },
      { name: 'Village', turns: 25, commerce: 3 },
      { name: 'Town', turns: 50, commerce: 4 }
    ]
  },
  {
    id: 'workshop',
    name: 'Workshop',
    category: 'Production',
    icon: '🏭',
    color: '#696969',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-45" y="5" width="90" height="45" fill="#696969" stroke="#505050" stroke-width="2"/>
        <polygon points="-50,5 -30,-25 30,-25 50,5" fill="#808080" stroke="#505050" stroke-width="2"/>
        <rect x="-35" y="15" width="25" height="30" fill="#A9A9A9" stroke="#696969" stroke-width="1.5"/>
        <rect x="10" y="15" width="25" height="30" fill="#A9A9A9" stroke="#696969" stroke-width="1.5"/>
        <circle cx="-8" cy="25" r="10" fill="#C0C0C0" stroke="#808080" stroke-width="2"/>
        <circle cx="-8" cy="25" r="6" fill="#2d2d2d"/>
        <rect x="-35" y="-15" width="10" height="15" fill="#654321" stroke="#4d3319" stroke-width="1"/>
        <path d="M -30,-25 L -25,-35 Q -20,-40 -15,-35 L -12,-30" fill="none" stroke="#696969" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    requiredTech: 'Metal Casting',
    buildTime: 7,
    description: 'Workshops provide +1 Production. Chemistry adds +1 production, and with State Property civic, workshops get +1 food. Good alternative to cottages for production-oriented strategies.',
    validTerrain: ['Grassland', 'Plains', 'Desert (with Floodplains)', 'Tundra'],
    bonusYieldsWithTech: {
      'Chemistry': { production: 1 }
    }
  },
  {
    id: 'windmill',
    name: 'Windmill',
    category: 'Production',
    icon: '🌬️',
    color: '#87CEEB',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#D2B48C"/>
      <g transform="translate(100, 100)">
        <rect x="-8" y="-20" width="16" height="70" fill="#A0522D" stroke="#8B4513" stroke-width="2"/>
        <rect x="-12" y="48" width="24" height="20" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <circle cx="0" cy="-20" r="12" fill="#696969" stroke="#505050" stroke-width="2"/>
        <path d="M 0,-20 L -5,-60 L 5,-60 Z" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="2"/>
        <path d="M 0,-20 L 35,-10 L 30,0 Z" fill="#E8E8E8" stroke="#D3D3D3" stroke-width="2"/>
        <path d="M 0,-20 L 5,20 L -5,20 Z" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="2"/>
        <path d="M 0,-20 L -35,-10 L -30,0 Z" fill="#E8E8E8" stroke="#D3D3D3" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1,
      commerce: 1
    },
    requiredTech: 'Machinery',
    buildTime: 8,
    description: 'Windmills provide +1 Production and +1 Commerce. Can only be built on hills. Replacements adds +1 production. Good for balancing production and commerce on hills.',
    validTerrain: ['Hills'],
    bonusYieldsWithTech: {
      'Replaceable Parts': { production: 1 }
    }
  },
  {
    id: 'watermill',
    name: 'Watermill',
    category: 'Production',
    icon: '💧',
    color: '#4682B4',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#90EE90"/>
      <g transform="translate(100, 100)">
        <path d="M -60,30 Q -40,25 -20,30 Q 0,35 20,30 Q 40,25 60,30" fill="none" stroke="#4682B4" stroke-width="4" opacity="0.7"/>
        <rect x="-25" y="-30" width="50" height="60" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <circle cx="0" cy="0" r="20" fill="#696969" stroke="#505050" stroke-width="2"/>
        <rect x="-3" y="-30" width="6" height="60" fill="#A0522D"/>
        <rect x="-30" y="-3" width="60" height="6" fill="#A0522D"/>
        <rect x="-22" y="-22" width="44" height="44" transform="rotate(45 0 0)" fill="none" stroke="#654321" stroke-width="2"/>
        <polygon points="-50,30 -40,50 40,50 50,30" fill="#654321" stroke="#4d3319" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1,
      food: 1
    },
    requiredTech: 'Machinery',
    buildTime: 8,
    description: 'Watermills provide +1 Food and +1 Production. Can only be built on tiles adjacent to fresh water (river). Replaceable Parts adds +1 production. Great for riverside cities.',
    validTerrain: ['Grassland', 'Plains', 'Tundra'],
    requiresFreshWater: true,
    bonusYieldsWithTech: {
      'Replaceable Parts': { production: 1 }
    }
  },

  // RESOURCE IMPROVEMENTS
  {
    id: 'pasture',
    name: 'Pasture',
    category: 'Resource',
    icon: '🐄',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#90EE90"/>
      <g transform="translate(100, 100)">
        <rect x="-60" y="-40" width="120" height="2" fill="#8B4513"/>
        <rect x="-60" y="-15" width="120" height="2" fill="#8B4513"/>
        <rect x="-60" y="10" width="120" height="2" fill="#8B4513"/>
        <rect x="-60" y="35" width="120" height="2" fill="#8B4513"/>
        <rect x="-60" y="-40" width="2" height="77" fill="#654321"/>
        <rect x="-30" y="-40" width="2" height="77" fill="#654321"/>
        <rect x="0" y="-40" width="2" height="77" fill="#654321"/>
        <rect x="30" y="-40" width="2" height="77" fill="#654321"/>
        <rect x="58" y="-40" width="2" height="77" fill="#654321"/>
        <ellipse cx="-20" cy="-5" rx="12" ry="10" fill="#F5DEB3" stroke="#D2B48C" stroke-width="1.5"/>
        <ellipse cx="25" cy="0" rx="10" ry="8" fill="#FFB6C1" stroke="#FF69B4" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    requiredTech: 'Animal Husbandry',
    buildTime: 6,
    description: 'Pastures improve animal resources (Cow, Pig, Sheep, Horse). Provides the yields of the resource plus can add +1 food. Required to access Horses for cavalry units.',
    validTerrain: ['Grassland', 'Plains', 'Tundra', 'Desert (with resource)'],
    improvesResources: ['Cow', 'Pig', 'Sheep', 'Horse']
  },
  {
    id: 'plantation',
    name: 'Plantation',
    category: 'Resource',
    icon: '🌴',
    color: '#228B22',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-8" y="20" width="16" height="35" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <ellipse cx="-25" cy="-20" rx="15" ry="30" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <ellipse cx="20" cy="-25" rx="18" ry="32" fill="#2E8B57" stroke="#006400" stroke-width="2"/>
        <ellipse cx="-10" cy="-35" rx="12" ry="25" fill="#3CB371" stroke="#006400" stroke-width="2"/>
        <ellipse cx="10" cy="-30" rx="14" ry="28" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <rect x="-40" y="50" width="15" height="10" fill="#D2691E" opacity="0.6"/>
        <rect x="-20" y="50" width="15" height="10" fill="#A0522D" opacity="0.6"/>
        <rect x="5" y="50" width="15" height="10" fill="#D2691E" opacity="0.6"/>
        <rect x="25" y="50" width="15" height="10" fill="#A0522D" opacity="0.6"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    requiredTech: 'Calendar',
    buildTime: 6,
    description: 'Plantations improve luxury resources like Silk, Spices, Sugar, Dyes, and Incense. Provides the resource yields plus potential commerce bonuses. Critical for happiness.',
    validTerrain: ['Grassland', 'Plains', 'Desert (with resource)', 'Jungle'],
    improvesResources: ['Silk', 'Spices', 'Sugar', 'Dyes', 'Incense', 'Banana']
  },
  {
    id: 'camp',
    name: 'Camp',
    category: 'Resource',
    icon: '⛺',
    color: '#8B4513',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#228B22"/>
      <g transform="translate(100, 100)">
        <polygon points="0,-40 -35,30 35,30" fill="#D2691E" stroke="#8B4513" stroke-width="2"/>
        <polygon points="0,-35 -30,27 30,27" fill="#CD853F" stroke="#8B4513" stroke-width="1.5"/>
        <rect x="-3" y="28" width="6" height="15" fill="#654321" stroke="#4d3319" stroke-width="1"/>
        <circle cx="-15" cy="15" r="6" fill="#DC143C" opacity="0.7"/>
        <line x1="-15" y1="9" x2="-15" y2="21" stroke="#FFD700" stroke-width="2"/>
        <line x1="-21" y1="15" x2="-9" y2="15" stroke="#FFD700" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    requiredTech: 'Hunting',
    buildTime: 5,
    description: 'Camps improve bonus resources like Deer, Ivory, and Furs. Provides the resource yields. Useful for forest-based resources and happiness from Ivory and Furs.',
    validTerrain: ['Forest', 'Tundra', 'Grassland', 'Plains'],
    improvesResources: ['Deer', 'Ivory', 'Furs']
  },
  {
    id: 'fishing_boats',
    name: 'Fishing Boats',
    category: 'Resource',
    icon: '⛵',
    color: '#4169E1',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#4682B4"/>
      <g transform="translate(100, 100)">
        <path d="M -50,30 Q -30,25 -10,30 Q 10,35 30,30 Q 50,25 70,30" fill="none" stroke="#87CEEB" stroke-width="3" opacity="0.6"/>
        <ellipse cx="0" cy="25" rx="45" ry="15" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <path d="M -40,25 Q -35,10 -30,25" fill="#CD853F" stroke="#8B4513" stroke-width="2"/>
        <path d="M 30,25 Q 35,10 40,25" fill="#CD853F" stroke="#8B4513" stroke-width="2"/>
        <rect x="-3" y="-35" width="6" height="60" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <polygon points="0,-35 30,-25 30,5" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="2"/>
        <circle cx="-20" cy="15" r="5" fill="#87CEEB" opacity="0.5"/>
        <circle cx="15" cy="12" r="4" fill="#4682B4" opacity="0.5"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    requiredTech: 'Fishing',
    buildTime: 4,
    description: 'Fishing Boats improve water resources like Fish, Clam, and Crab. Provides food for coastal cities. Built by Work Boats (consumed on use).',
    validTerrain: ['Coast', 'Ocean'],
    improvesResources: ['Fish', 'Clam', 'Crab', 'Whale'],
    requiresWorkBoat: true
  },
  {
    id: 'offshore_platform',
    name: 'Offshore Platform',
    category: 'Resource',
    icon: '🛢️',
    color: '#2F4F4F',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#191970"/>
      <g transform="translate(100, 100)">
        <path d="M -60,50 Q -40,45 -20,50 Q 0,55 20,50 Q 40,45 60,50" fill="none" stroke="#4169E1" stroke-width="4" opacity="0.5"/>
        <rect x="-35" y="-20" width="70" height="40" fill="#696969" stroke="#505050" stroke-width="3"/>
        <rect x="-30" y="-15" width="60" height="30" fill="#808080" stroke="#505050" stroke-width="2"/>
        <rect x="-5" y="-60" width="10" height="40" fill="#A9A9A9" stroke="#696969" stroke-width="2"/>
        <rect x="-25" y="-60" width="8" height="40" fill="#808080" stroke="#696969" stroke-width="2"/>
        <rect x="17" y="-60" width="8" height="40" fill="#808080" stroke="#696969" stroke-width="2"/>
        <circle cx="0" cy="-65" r="8" fill="#FF6347" stroke="#C41E3A" stroke-width="2"/>
        <rect x="-40" y="18" width="12" height="35" fill="#696969" stroke="#505050" stroke-width="2"/>
        <rect x="-10" y="18" width="12" height="35" fill="#696969" stroke="#505050" stroke-width="2"/>
        <rect x="18" y="18" width="12" height="35" fill="#696969" stroke="#505050" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    requiredTech: 'Plastics',
    buildTime: 8,
    description: 'Offshore Platforms improve Oil resources in water tiles. Provides production for late-game coastal cities. Critical for accessing ocean Oil.',
    validTerrain: ['Coast', 'Ocean'],
    improvesResources: ['Oil'],
    requiresWorkBoat: true
  },

  // INFRASTRUCTURE
  {
    id: 'road',
    name: 'Road',
    category: 'Infrastructure',
    icon: '🛣️',
    color: '#696969',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-25" y="-80" width="50" height="160" fill="#696969" stroke="#505050" stroke-width="2"/>
        <rect x="-22" y="-75" width="44" height="150" fill="#808080"/>
        <rect x="-3" y="-70" width="6" height="15" fill="#FFD700"/>
        <rect x="-3" y="-45" width="6" height="15" fill="#FFD700"/>
        <rect x="-3" y="-20" width="6" height="15" fill="#FFD700"/>
        <rect x="-3" y="5" width="6" height="15" fill="#FFD700"/>
        <rect x="-3" y="30" width="6" height="15" fill="#FFD700"/>
        <rect x="-3" y="55" width="6" height="15" fill="#FFD700"/>
      </g>
    </svg>`,
    yields: {},
    requiredTech: 'The Wheel',
    buildTime: 2,
    description: 'Roads reduce movement cost to 1/3 and enable trade routes between cities. Essential infrastructure for connecting your empire. Can be pillaged by enemies. Rivers require Construction tech for road building.',
    validTerrain: ['All land tiles'],
    movementBonus: true
  },
  {
    id: 'railroad',
    name: 'Railroad',
    category: 'Infrastructure',
    icon: '🚂',
    color: '#2d2d2d',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-30" y="-80" width="60" height="160" fill="#654321" opacity="0.4"/>
        <rect x="-20" y="-75" width="10" height="150" fill="#696969" stroke="#505050" stroke-width="1"/>
        <rect x="10" y="-75" width="10" height="150" fill="#696969" stroke="#505050" stroke-width="1"/>
        <rect x="-25" y="-65" width="50" height="4" fill="#8B4513"/>
        <rect x="-25" y="-40" width="50" height="4" fill="#8B4513"/>
        <rect x="-25" y="-15" width="50" height="4" fill="#8B4513"/>
        <rect x="-25" y="10" width="50" height="4" fill="#8B4513"/>
        <rect x="-25" y="35" width="50" height="4" fill="#8B4513"/>
        <rect x="-25" y="60" width="50" height="4" fill="#8B4513"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    requiredTech: 'Railroad',
    buildTime: 4,
    description: 'Railroads provide unlimited movement for units and add +1 production to tiles with mines. Dramatically speeds up unit movement across your empire. Requires Coal to build.',
    validTerrain: ['All land tiles'],
    movementBonus: true,
    bonusProduction: '+1 to mines'
  },
  {
    id: 'fort',
    name: 'Fort',
    category: 'Infrastructure',
    icon: '🏰',
    color: '#808080',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#8FBC8F"/>
      <g transform="translate(100, 100)">
        <rect x="-45" y="-25" width="90" height="60" fill="#808080" stroke="#505050" stroke-width="3"/>
        <rect x="-40" y="-20" width="80" height="50" fill="#A9A9A9" stroke="#696969" stroke-width="2"/>
        <rect x="-50" y="-35" width="12" height="20" fill="#808080" stroke="#505050" stroke-width="2"/>
        <rect x="-20" y="-35" width="12" height="20" fill="#808080" stroke="#505050" stroke-width="2"/>
        <rect x="8" y="-35" width="12" height="20" fill="#808080" stroke="#505050" stroke-width="2"/>
        <rect x="38" y="-35" width="12" height="20" fill="#808080" stroke="#505050" stroke-width="2"/>
        <rect x="-10" y="0" width="20" height="25" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <rect x="-25" y="-10" width="12" height="12" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="1"/>
        <rect x="13" y="-10" width="12" height="12" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="1"/>
      </g>
    </svg>`,
    yields: {},
    requiredTech: 'Engineering',
    buildTime: 8,
    description: 'Forts provide +50% defense bonus and allow units to heal faster. Can be built in neutral or enemy territory to establish a defensive position. Provides cultural control of the tile.',
    validTerrain: ['All land tiles except peaks'],
    defenseBonus: 50
  }
];

export const improvementCategories = {
  food: improvements.filter(i => i.category === 'Food'),
  production: improvements.filter(i => i.category === 'Production'),
  commerce: improvements.filter(i => i.category === 'Commerce'),
  resource: improvements.filter(i => i.category === 'Resource'),
  infrastructure: improvements.filter(i => i.category === 'Infrastructure')
};
