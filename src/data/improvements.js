export const improvements = [
  // BASIC IMPROVEMENTS
  {
    id: 'farm',
    name: 'Farm',
    category: 'Food',
    icon: '🚜',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#8FBC8F" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Three wheat stalks -->
        <rect x="-45" y="-50" width="25" height="100" fill="#D2691E" stroke="#8B4513" stroke-width="4"/>
        <rect x="-10" y="-50" width="25" height="100" fill="#CD853F" stroke="#8B4513" stroke-width="4"/>
        <rect x="25" y="-50" width="25" height="100" fill="#D2691E" stroke="#8B4513" stroke-width="4"/>
        <!-- Wheat grains - bold and simplified -->
        <ellipse cx="-32" cy="-35" rx="14" ry="20" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="2" cy="-30" rx="14" ry="20" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="37" cy="-35" rx="14" ry="20" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="-32" cy="10" rx="14" ry="20" fill="#FFA500" stroke="#FF8C00" stroke-width="3"/>
        <ellipse cx="2" cy="15" rx="14" ry="20" fill="#FFA500" stroke="#FF8C00" stroke-width="3"/>
        <ellipse cx="37" cy="10" rx="14" ry="20" fill="#FFA500" stroke="#FF8C00" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#654321" stroke="#4d3319" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Mine entrance - bold structure -->
        <rect x="-50" y="20" width="100" height="50" fill="#8B4513" stroke="#654321" stroke-width="5"/>
        <polygon points="-50,20 0,-35 50,20" fill="#A0522D" stroke="#654321" stroke-width="5"/>
        <!-- Dark entrance tunnel -->
        <rect x="-15" y="10" width="30" height="60" fill="#1a1a1a" stroke="#000000" stroke-width="4"/>
        <!-- Ore cart rails -->
        <rect x="-30" y="5" width="60" height="8" fill="#696969" stroke="#505050" stroke-width="3"/>
        <!-- Ore chunks - gold and silver -->
        <circle cx="-25" cy="50" r="10" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
        <circle cx="28" cy="48" r="9" fill="#C0C0C0" stroke="#A9A9A9" stroke-width="3"/>
        <circle cx="5" cy="55" r="8" fill="#CD7F32" stroke="#8B4513" stroke-width="3"/>
        <!-- Rock debris -->
        <polygon points="-45,-5 -35,0 -38,8" fill="#808080" stroke="#505050" stroke-width="3"/>
        <polygon points="40,-3 48,5 35,10" fill="#696969" stroke="#505050" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#90EE90" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Small cottage house -->
        <rect x="-40" y="5" width="80" height="50" fill="#8B4513" stroke="#654321" stroke-width="5"/>
        <polygon points="-48,5 0,-40 48,5" fill="#CD853F" stroke="#8B4513" stroke-width="5"/>
        <!-- Door -->
        <rect x="-12" y="25" width="24" height="30" fill="#654321" stroke="#4d3319" stroke-width="4"/>
        <!-- Windows -->
        <rect x="-32" y="15" width="16" height="16" fill="#87CEEB" stroke="#4682B4" stroke-width="3"/>
        <rect x="16" y="15" width="16" height="16" fill="#87CEEB" stroke="#4682B4" stroke-width="3"/>
        <!-- Window frames -->
        <line x1="-24" y1="15" x2="-24" y2="31" stroke="#654321" stroke-width="3"/>
        <line x1="-32" y1="23" x2="-16" y2="23" stroke="#654321" stroke-width="3"/>
        <line x1="24" y1="15" x2="24" y2="31" stroke="#654321" stroke-width="3"/>
        <line x1="16" y1="23" x2="32" y2="23" stroke="#654321" stroke-width="3"/>
        <!-- Chimney -->
        <rect x="20" y="-30" width="12" height="35" fill="#A0522D" stroke="#8B4513" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#505050" stroke="#2d2d2d" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Workshop building - industrial style -->
        <rect x="-55" y="10" width="110" height="55" fill="#696969" stroke="#505050" stroke-width="5"/>
        <polygon points="-60,10 -35,-35 35,-35 60,10" fill="#808080" stroke="#505050" stroke-width="5"/>
        <!-- Large factory doors -->
        <rect x="-42" y="20" width="35" height="40" fill="#A9A9A9" stroke="#696969" stroke-width="4"/>
        <rect x="7" y="20" width="35" height="40" fill="#A9A9A9" stroke="#696969" stroke-width="4"/>
        <!-- Gear/cog wheel -->
        <circle cx="-15" cy="35" r="15" fill="#C0C0C0" stroke="#808080" stroke-width="4"/>
        <circle cx="-15" cy="35" r="8" fill="#2d2d2d" stroke="#000000" stroke-width="3"/>
        <!-- Chimney with smoke -->
        <rect x="-42" y="-20" width="15" height="25" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <path d="M -34,-35 L -30,-48 Q -25,-55 -20,-48 L -18,-40" fill="none" stroke="#808080" stroke-width="4" opacity="0.7"/>
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
      <circle cx="100" cy="100" r="95" fill="#D2B48C" stroke="#A0826D" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Windmill tower - bold and sturdy -->
        <rect x="-12" y="-10" width="24" height="75" fill="#A0522D" stroke="#8B4513" stroke-width="5"/>
        <rect x="-18" y="63" width="36" height="25" fill="#654321" stroke="#4d3319" stroke-width="4"/>
        <!-- Central hub -->
        <circle cx="0" cy="-10" r="18" fill="#696969" stroke="#505050" stroke-width="5"/>
        <!-- Four windmill blades - bold triangular shapes -->
        <path d="M 0,-10 L -8,-75 L 8,-75 Z" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="5"/>
        <path d="M 0,-10 L 50,5 L 45,20 Z" fill="#E8E8E8" stroke="#C0C0C0" stroke-width="5"/>
        <path d="M 0,-10 L 8,55 L -8,55 Z" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="5"/>
        <path d="M 0,-10 L -50,5 L -45,20 Z" fill="#E8E8E8" stroke="#C0C0C0" stroke-width="5"/>
        <!-- Center pin -->
        <circle cx="0" cy="-10" r="8" fill="#2d2d2d" stroke="#000000" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#87CEEB" stroke="#4682B4" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Water waves at bottom -->
        <path d="M -70,40 Q -50,30 -30,40 Q -10,50 10,40 Q 30,30 50,40 Q 70,50 90,40" fill="none" stroke="#4169E1" stroke-width="5"/>
        <path d="M -70,55 Q -50,45 -30,55 Q -10,65 10,55 Q 30,45 50,55 Q 70,65 90,55" fill="none" stroke="#1E90FF" stroke-width="5"/>
        <!-- Mill building -->
        <rect x="-35" y="-25" width="70" height="70" fill="#8B4513" stroke="#654321" stroke-width="5"/>
        <!-- Water wheel - large and bold -->
        <circle cx="0" cy="10" r="28" fill="#696969" stroke="#505050" stroke-width="5"/>
        <!-- Wheel spokes -->
        <line x1="-28" y1="10" x2="28" y2="10" stroke="#A0522D" stroke-width="5"/>
        <line x1="0" y1="-18" x2="0" y2="38" stroke="#A0522D" stroke-width="5"/>
        <line x1="-20" y1="-10" x2="20" y2="30" stroke="#A0522D" stroke-width="5"/>
        <line x1="-20" y1="30" x2="20" y2="-10" stroke="#A0522D" stroke-width="5"/>
        <!-- Center hub -->
        <circle cx="0" cy="10" r="10" fill="#2d2d2d" stroke="#000000" stroke-width="4"/>
        <!-- Building foundation -->
        <polygon points="-60,43 -45,60 45,60 60,43" fill="#654321" stroke="#4d3319" stroke-width="4"/>
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
      <circle cx="100" cy="100" r="95" fill="#90EE90" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Wooden fence - bold posts and rails -->
        <rect x="-70" y="-45" width="140" height="5" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-70" y="-15" width="140" height="5" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-70" y="15" width="140" height="5" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-70" y="45" width="140" height="5" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Fence posts -->
        <rect x="-70" y="-45" width="6" height="95" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <rect x="-35" y="-45" width="6" height="95" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <rect x="-3" y="-45" width="6" height="95" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <rect x="32" y="-45" width="6" height="95" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <rect x="64" y="-45" width="6" height="95" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <!-- Animals - simplified and bold -->
        <ellipse cx="-25" cy="-5" rx="16" ry="14" fill="#F5DEB3" stroke="#D2B48C" stroke-width="4"/>
        <ellipse cx="30" cy="5" rx="14" ry="12" fill="#FFDAB9" stroke="#DEB887" stroke-width="4"/>
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
      <circle cx="100" cy="100" r="95" fill="#8FBC8F" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Palm tree trunk -->
        <rect x="-12" y="20" width="24" height="45" fill="#8B4513" stroke="#654321" stroke-width="5"/>
        <!-- Palm fronds - large and bold -->
        <ellipse cx="-35" cy="-15" rx="20" ry="40" fill="#228B22" stroke="#006400" stroke-width="5"/>
        <ellipse cx="30" cy="-20" rx="24" ry="42" fill="#2E8B57" stroke="#006400" stroke-width="5"/>
        <ellipse cx="-15" cy="-40" rx="18" ry="35" fill="#3CB371" stroke="#006400" stroke-width="5"/>
        <ellipse cx="15" cy="-35" rx="20" ry="38" fill="#228B22" stroke="#006400" stroke-width="5"/>
        <!-- Plantation rows in background -->
        <rect x="-50" y="55" width="20" height="12" fill="#D2691E" stroke="#A0522D" stroke-width="3"/>
        <rect x="-25" y="55" width="20" height="12" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="5" y="55" width="20" height="12" fill="#D2691E" stroke="#A0522D" stroke-width="3"/>
        <rect x="30" y="55" width="20" height="12" fill="#8B4513" stroke="#654321" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#228B22" stroke="#006400" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Tent - bold triangular shape -->
        <polygon points="0,-50 -50,40 50,40" fill="#D2691E" stroke="#8B4513" stroke-width="5"/>
        <polygon points="0,-42 -42,35 42,35" fill="#CD853F" stroke="#8B4513" stroke-width="4"/>
        <!-- Center pole -->
        <rect x="-5" y="38" width="10" height="20" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <!-- Campfire - bold and visible -->
        <circle cx="-20" cy="20" r="10" fill="#DC143C" stroke="#8B0000" stroke-width="3"/>
        <circle cx="20" cy="22" r="8" fill="#FF4500" stroke="#DC143C" stroke-width="3"/>
        <!-- Fire flames - bold lines -->
        <line x1="-20" y1="10" x2="-20" y2="30" stroke="#FFD700" stroke-width="4"/>
        <line x1="-30" y1="20" x2="-10" y2="20" stroke="#FFA500" stroke-width="4"/>
        <line x1="20" y1="14" x2="20" y2="30" stroke="#FFD700" stroke-width="4"/>
        <line x1="12" y1="22" x2="28" y2="22" stroke="#FFA500" stroke-width="4"/>
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
      <circle cx="100" cy="100" r="95" fill="#4682B4" stroke="#1E90FF" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Water waves -->
        <path d="M -70,35 Q -45,25 -20,35 Q 5,45 30,35 Q 55,25 80,35" fill="none" stroke="#87CEEB" stroke-width="5"/>
        <path d="M -70,50 Q -45,40 -20,50 Q 5,60 30,50 Q 55,40 80,50" fill="none" stroke="#B0E0E6" stroke-width="5"/>
        <!-- Boat hull - bold ellipse -->
        <ellipse cx="0" cy="30" rx="55" ry="20" fill="#8B4513" stroke="#654321" stroke-width="5"/>
        <!-- Boat ends curved up -->
        <path d="M -50,30 Q -48,15 -42,25" fill="#CD853F" stroke="#8B4513" stroke-width="5"/>
        <path d="M 50,30 Q 48,15 42,25" fill="#CD853F" stroke="#8B4513" stroke-width="5"/>
        <!-- Mast -->
        <rect x="-6" y="-45" width="12" height="75" fill="#654321" stroke="#4d3319" stroke-width="4"/>
        <!-- Sail -->
        <polygon points="0,-45 45,-28 45,10" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="5"/>
        <!-- Fishing nets in water -->
        <circle cx="-28" cy="20" r="8" fill="#87CEEB" stroke="#4169E1" stroke-width="3"/>
        <circle cx="25" cy="18" r="7" fill="#4682B4" stroke="#1E90FF" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#191970" stroke="#000080" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Ocean waves -->
        <path d="M -75,55 Q -50,45 -25,55 Q 0,65 25,55 Q 50,45 75,55" fill="none" stroke="#4169E1" stroke-width="6"/>
        <!-- Platform base - large and industrial -->
        <rect x="-45" y="-15" width="90" height="50" fill="#696969" stroke="#505050" stroke-width="5"/>
        <rect x="-38" y="-8" width="76" height="36" fill="#808080" stroke="#505050" stroke-width="4"/>
        <!-- Platform towers -->
        <rect x="-8" y="-70" width="16" height="55" fill="#A9A9A9" stroke="#696969" stroke-width="5"/>
        <rect x="-32" y="-70" width="12" height="55" fill="#808080" stroke="#696969" stroke-width="4"/>
        <rect x="20" y="-70" width="12" height="55" fill="#808080" stroke="#696969" stroke-width="4"/>
        <!-- Warning light on top -->
        <circle cx="0" cy="-78" r="12" fill="#FF6347" stroke="#C41E3A" stroke-width="4"/>
        <!-- Support legs in water -->
        <rect x="-50" y="33" width="15" height="45" fill="#696969" stroke="#505050" stroke-width="4"/>
        <rect x="-15" y="33" width="15" height="45" fill="#696969" stroke="#505050" stroke-width="4"/>
        <rect x="20" y="33" width="15" height="45" fill="#696969" stroke="#505050" stroke-width="4"/>
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
      <circle cx="100" cy="100" r="95" fill="#8FBC8F" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Road - vertical path with bold borders -->
        <rect x="-35" y="-85" width="70" height="170" fill="#696969" stroke="#505050" stroke-width="5"/>
        <rect x="-28" y="-78" width="56" height="156" fill="#808080"/>
        <!-- Center line dashes - bold yellow -->
        <rect x="-5" y="-70" width="10" height="20" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <rect x="-5" y="-40" width="10" height="20" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <rect x="-5" y="-10" width="10" height="20" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <rect x="-5" y="20" width="10" height="20" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <rect x="-5" y="50" width="10" height="20" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#8FBC8F" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Gravel bed -->
        <rect x="-40" y="-85" width="80" height="170" fill="#654321" stroke="#4d3319" stroke-width="4"/>
        <!-- Steel rails - bold and parallel -->
        <rect x="-28" y="-80" width="14" height="160" fill="#696969" stroke="#505050" stroke-width="4"/>
        <rect x="14" y="-80" width="14" height="160" fill="#696969" stroke="#505050" stroke-width="4"/>
        <!-- Railroad ties - wooden cross beams -->
        <rect x="-35" y="-70" width="70" height="8" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-35" y="-40" width="70" height="8" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-35" y="-10" width="70" height="8" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-35" y="20" width="70" height="8" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="-35" y="50" width="70" height="8" fill="#8B4513" stroke="#654321" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#8FBC8F" stroke="#6B8E6B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Main fort walls - thick and sturdy -->
        <rect x="-55" y="-20" width="110" height="70" fill="#808080" stroke="#505050" stroke-width="5"/>
        <rect x="-48" y="-12" width="96" height="56" fill="#A9A9A9" stroke="#696969" stroke-width="4"/>
        <!-- Battlements/crenellations on top -->
        <rect x="-60" y="-42" width="18" height="28" fill="#808080" stroke="#505050" stroke-width="5"/>
        <rect x="-28" y="-42" width="18" height="28" fill="#808080" stroke="#505050" stroke-width="5"/>
        <rect x="4" y="-42" width="18" height="28" fill="#808080" stroke="#505050" stroke-width="5"/>
        <rect x="36" y="-42" width="18" height="28" fill="#808080" stroke="#505050" stroke-width="5"/>
        <!-- Gate entrance -->
        <rect x="-15" y="5" width="30" height="35" fill="#654321" stroke="#4d3319" stroke-width="5"/>
        <!-- Arrow slits -->
        <rect x="-35" y="-5" width="16" height="18" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
        <rect x="19" y="-5" width="16" height="18" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
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
