export const resources = [
  // STRATEGIC RESOURCES
  {
    id: 'iron',
    name: 'Iron',
    category: 'Strategic',
    icon: '⚔️',
    color: '#808080',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#808080" stroke="#505050" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <rect x="-40" y="-50" width="80" height="100" rx="10" fill="#A9A9A9" stroke="#2d2d2d" stroke-width="3"/>
        <rect x="-35" y="-45" width="70" height="90" rx="8" fill="#C0C0C0" stroke="#2d2d2d" stroke-width="2"/>
        <ellipse cx="0" cy="-10" rx="25" ry="15" fill="#696969" opacity="0.6"/>
        <ellipse cx="0" cy="10" rx="20" ry="12" fill="#696969" opacity="0.6"/>
        <rect x="-5" y="-60" width="10" height="20" fill="#8B4513" stroke="#654321" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Iron Working',
    connectTech: 'Iron Working',
    description: 'Iron is a crucial strategic resource that enables the production of many powerful military units including Swordsmen, Macemen, and later industrial-era units. It also provides +1 Production when worked.',
    enabledUnits: ['Swordsman', 'Maceman', 'Pikeman', 'Musketman', 'Grenadier', 'Rifleman', 'Infantry'],
    enabledBuildings: []
  },
  {
    id: 'copper',
    name: 'Copper',
    category: 'Strategic',
    icon: '🔨',
    color: '#B87333',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#B87333" stroke="#8B4513" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="55" fill="#CD853F" stroke="#8B4513" stroke-width="3"/>
        <circle cx="0" cy="0" r="45" fill="#D2691E" stroke="#8B4513" stroke-width="2"/>
        <circle cx="-15" cy="-15" r="18" fill="#B87333" stroke="#654321" stroke-width="2"/>
        <circle cx="15" cy="10" r="22" fill="#CD853F" stroke="#654321" stroke-width="2"/>
        <circle cx="0" cy="15" r="15" fill="#D2691E" stroke="#654321" stroke-width="2"/>
        <path d="M -20,-30 Q -15,-35 -10,-30" fill="none" stroke="#FFA500" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Mining',
    connectTech: 'Mining',
    description: 'Copper is an early strategic resource that allows the construction of Axemen and Spearmen, giving civilizations an early military advantage. Provides +1 Production.',
    enabledUnits: ['Axeman', 'Spearman'],
    enabledBuildings: []
  },
  {
    id: 'horse',
    name: 'Horses',
    category: 'Strategic',
    icon: '🐴',
    color: '#8B4513',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#8B4513" stroke="#654321" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="10" cy="10" rx="35" ry="45" fill="#A0522D" stroke="#2d2d2d" stroke-width="2"/>
        <ellipse cx="-5" cy="-20" rx="28" ry="32" fill="#8B4513" stroke="#2d2d2d" stroke-width="2"/>
        <path d="M -25,-35 L -30,-50 L -20,-48 L -18,-40 Z" fill="#A0522D" stroke="#2d2d2d" stroke-width="2"/>
        <path d="M 5,-35 L 0,-50 L 10,-48 L 12,-40 Z" fill="#A0522D" stroke="#2d2d2d" stroke-width="2"/>
        <circle cx="-8" cy="-25" r="4" fill="#2d2d2d"/>
        <path d="M -15,-45 Q -10,-50 -5,-45" fill="none" stroke="#654321" stroke-width="3"/>
        <rect x="-5" y="40" width="8" height="25" fill="#8B4513" stroke="#2d2d2d" stroke-width="1.5"/>
        <rect x="15" y="40" width="8" height="25" fill="#8B4513" stroke="#2d2d2d" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Animal Husbandry',
    connectTech: 'Animal Husbandry',
    description: 'Horses enable the production of fast-moving cavalry units including Chariots, Horse Archers, Knights, and Cavalry. Essential for mobile warfare strategies.',
    enabledUnits: ['Chariot', 'Horse Archer', 'Knight', 'Cavalry', 'Cossack', 'Conquistador'],
    enabledBuildings: ['Stable']
  },
  {
    id: 'oil',
    name: 'Oil',
    category: 'Strategic',
    icon: '🛢️',
    color: '#2F4F4F',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#2F4F4F" stroke="#1a1a1a" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="30" rx="35" ry="15" fill="#1a1a1a" stroke="#000000" stroke-width="2"/>
        <rect x="-35" y="-30" width="70" height="60" fill="#2F4F4F" stroke="#1a1a1a" stroke-width="3"/>
        <ellipse cx="0" cy="-30" rx="35" ry="15" fill="#3d5c5c" stroke="#1a1a1a" stroke-width="2"/>
        <rect x="-25" y="-20" width="50" height="8" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <rect x="-25" y="0" width="50" height="8" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <circle cx="0" cy="-50" r="8" fill="#FF6347" stroke="#C41E3A" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Combustion',
    connectTech: 'Combustion',
    description: 'Oil is a vital late-game strategic resource required for modern military units including Tanks, Fighters, and Battleships. Also enables Factories to add production.',
    enabledUnits: ['Tank', 'Fighter', 'Bomber', 'Battleship', 'Carrier', 'Destroyer', 'Submarine'],
    enabledBuildings: []
  },
  {
    id: 'uranium',
    name: 'Uranium',
    category: 'Strategic',
    icon: '☢️',
    color: '#00FF00',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#00FF00" stroke="#00AA00" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="60" fill="#32CD32" stroke="#228B22" stroke-width="3"/>
        <circle cx="0" cy="0" r="50" fill="#7FFF00" stroke="#228B22" stroke-width="2"/>
        <circle cx="0" cy="0" r="15" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <path d="M 0,-15 L 13,8 L -13,8 Z" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <circle cx="0" cy="-30" r="12" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <circle cx="26" cy="15" r="12" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <circle cx="-26" cy="15" r="12" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Fission',
    connectTech: 'Fission',
    description: 'Uranium is the most powerful strategic resource, enabling nuclear weapons (ICBMs, Tactical Nukes) and modern naval vessels. Can provide huge tactical advantage in endgame.',
    enabledUnits: ['ICBM', 'Tactical Nuke', 'Modern Armor'],
    enabledBuildings: []
  },
  {
    id: 'coal',
    name: 'Coal',
    category: 'Strategic',
    icon: '⬛',
    color: '#1a1a1a',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#1a1a1a" stroke="#000000" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <polygon points="0,-50 40,-20 30,30 -30,30 -40,-20" fill="#2d2d2d" stroke="#000000" stroke-width="3"/>
        <polygon points="0,-45 35,-18 25,25 -25,25 -35,-18" fill="#404040" stroke="#1a1a1a" stroke-width="2"/>
        <polygon points="-15,-10 5,-25 20,0 5,20 -20,15" fill="#1a1a1a" stroke="#000000" stroke-width="1.5"/>
        <polygon points="10,5 25,-5 30,10 15,18" fill="#2d2d2d" stroke="#000000" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Steam Power',
    connectTech: 'Steam Power',
    description: 'Coal powers the Industrial Revolution, enabling Factories and Ironworks to increase production. Also required for Railroad construction.',
    enabledUnits: [],
    enabledBuildings: ['Factory', 'Ironworks']
  },
  {
    id: 'aluminum',
    name: 'Aluminum',
    category: 'Strategic',
    icon: '🔧',
    color: '#C0C0C0',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#C0C0C0" stroke="#A9A9A9" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <rect x="-35" y="-45" width="70" height="90" rx="8" fill="#E8E8E8" stroke="#696969" stroke-width="3"/>
        <rect x="-30" y="-40" width="60" height="80" rx="6" fill="#F5F5F5" stroke="#A9A9A9" stroke-width="2"/>
        <ellipse cx="0" cy="-10" rx="22" ry="15" fill="#DCDCDC" opacity="0.7"/>
        <ellipse cx="0" cy="15" rx="18" ry="12" fill="#DCDCDC" opacity="0.7"/>
        <text x="0" y="10" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#696969" text-anchor="middle">Al</text>
      </g>
    </svg>`,
    yields: {
      production: 1
    },
    revealTech: 'Electricity',
    connectTech: 'Electricity',
    description: 'Aluminum is a modern strategic resource required for advanced military units like Jet Fighters, Helicopters, and Modern Armor.',
    enabledUnits: ['Jet Fighter', 'Stealth Bomber', 'Helicopter Gunship'],
    enabledBuildings: []
  },

  // LUXURY RESOURCES
  {
    id: 'gold_resource',
    name: 'Gold',
    category: 'Luxury',
    icon: '🥇',
    color: '#FFD700',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <polygon points="-30,-20 -10,-35 10,-35 30,-20 35,0 25,25 -25,25 -35,0" fill="#FFA500" stroke="#B8860B" stroke-width="3"/>
        <polygon points="-25,-15 -8,-28 8,-28 25,-15 28,0 20,20 -20,20 -28,0" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <ellipse cx="-10" cy="-5" rx="8" ry="12" fill="#FFEA00" opacity="0.6"/>
        <ellipse cx="10" cy="5" rx="10" ry="14" fill="#FFEA00" opacity="0.6"/>
      </g>
    </svg>`,
    yields: {
      commerce: 2
    },
    revealTech: 'Mining',
    connectTech: 'Mining',
    description: 'Gold provides +1 Happiness and +2 Commerce. A highly valuable luxury resource that can be traded to other civilizations.',
    happinessBonus: 1
  },
  {
    id: 'silver',
    name: 'Silver',
    category: 'Luxury',
    icon: '🥈',
    color: '#C0C0C0',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#C0C0C0" stroke="#A9A9A9" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <polygon points="-30,-20 -10,-35 10,-35 30,-20 35,0 25,25 -25,25 -35,0" fill="#B0B0B0" stroke="#808080" stroke-width="3"/>
        <polygon points="-25,-15 -8,-28 8,-28 25,-15 28,0 20,20 -20,20 -28,0" fill="#D3D3D3" stroke="#A9A9A9" stroke-width="2"/>
        <ellipse cx="-10" cy="-5" rx="8" ry="12" fill="#F5F5F5" opacity="0.7"/>
        <ellipse cx="10" cy="5" rx="10" ry="14" fill="#F5F5F5" opacity="0.7"/>
      </g>
    </svg>`,
    yields: {
      commerce: 2
    },
    revealTech: 'Mining',
    connectTech: 'Mining',
    description: 'Silver provides +1 Happiness and +2 Commerce. A valuable luxury resource often found in hills.',
    happinessBonus: 1
  },
  {
    id: 'gems',
    name: 'Gems',
    category: 'Luxury',
    icon: '💎',
    color: '#9370DB',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#9370DB" stroke="#663399" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <polygon points="0,-40 -25,-15 -15,30 15,30 25,-15" fill="#DA70D6" stroke="#8B008B" stroke-width="3"/>
        <polygon points="0,-35 -20,-12 -12,25 12,25 20,-12" fill="#FF69B4" stroke="#C71585" stroke-width="2"/>
        <polygon points="0,-35 0,25" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
        <polygon points="-20,-12 15,0 12,25" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4"/>
        <polygon points="20,-12 -15,0 -12,25" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4"/>
      </g>
    </svg>`,
    yields: {
      commerce: 3
    },
    revealTech: 'Mining',
    connectTech: 'Mining',
    description: 'Gems provide +1 Happiness and +3 Commerce. One of the most valuable luxury resources in the game.',
    happinessBonus: 1
  },
  {
    id: 'silk',
    name: 'Silk',
    category: 'Luxury',
    icon: '🧵',
    color: '#DDA0DD',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#DDA0DD" stroke="#DA70D6" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -40,-20 Q -30,0 -40,20 Q -30,40 -10,35 Q 0,30 10,35 Q 30,40 40,20 Q 30,0 40,-20 Q 30,-40 10,-35 Q 0,-30 -10,-35 Q -30,-40 -40,-20" fill="#EE82EE" stroke="#BA55D3" stroke-width="2.5"/>
        <path d="M -25,-10 Q -20,0 -25,10 Q -20,20 -5,18 Q 0,15 5,18 Q 20,20 25,10 Q 20,0 25,-10 Q 20,-20 5,-18 Q 0,-15 -5,-18 Q -20,-20 -25,-10" fill="#FFB6C1" stroke="#DB7093" stroke-width="2"/>
        <ellipse cx="0" cy="0" rx="8" ry="12" fill="#FFFFFF" opacity="0.4"/>
      </g>
    </svg>`,
    yields: {
      commerce: 3
    },
    revealTech: 'Calendar',
    connectTech: 'Calendar',
    description: 'Silk provides +1 Happiness and +3 Commerce. A luxury resource from plantation improvements.',
    happinessBonus: 1
  },
  {
    id: 'spices',
    name: 'Spices',
    category: 'Luxury',
    icon: '🌶️',
    color: '#FF6347',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FF6347" stroke="#DC143C" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -5,-40 Q -8,-20 -12,0 Q -15,20 -10,40 Q -5,45 0,40 Q 3,20 5,0 Q 8,-20 5,-40 Z" fill="#DC143C" stroke="#8B0000" stroke-width="2"/>
        <path d="M -5,-40 Q -2,-38 0,-40 Q 3,-38 5,-40" fill="none" stroke="#228B22" stroke-width="3"/>
        <ellipse cx="-7" cy="10" rx="3" ry="5" fill="#FFD700" opacity="0.6"/>
        <ellipse cx="2" cy="-5" rx="2" ry="4" fill="#FFD700" opacity="0.6"/>
        <ellipse cx="-4" cy="-15" rx="2" ry="3" fill="#FFD700" opacity="0.6"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    revealTech: 'Calendar',
    connectTech: 'Calendar',
    description: 'Spices provide +1 Happiness and +1 Commerce. A valuable trade commodity that brings happiness to your people.',
    happinessBonus: 1
  },
  {
    id: 'wine',
    name: 'Wine',
    category: 'Luxury',
    icon: '🍷',
    color: '#800020',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#800020" stroke="#5C0011" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="30" rx="15" ry="8" fill="#654321" stroke="#2d2d2d" stroke-width="2"/>
        <rect x="-4" y="-10" width="8" height="40" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <path d="M -25,-40 Q -25,-10 0,20 Q 25,-10 25,-40 Z" fill="#A0522D" stroke="#654321" stroke-width="2.5"/>
        <ellipse cx="0" cy="-40" rx="25" ry="8" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <ellipse cx="0" cy="-25" rx="20" ry="25" fill="#722F37" opacity="0.8"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    revealTech: 'Monarchy',
    connectTech: 'Monarchy',
    description: 'Wine provides +1 Happiness and +1 Commerce. Requires Monarchy to reveal and a Winery to connect.',
    happinessBonus: 1
  },
  {
    id: 'ivory',
    name: 'Ivory',
    category: 'Luxury',
    icon: '🦷',
    color: '#FFFFF0',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFFFF0" stroke="#F5F5DC" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -8,-50 Q -12,-20 -15,10 Q -12,40 -5,45 Q 0,48 5,45 Q 12,40 15,10 Q 12,-20 8,-50 Z" fill="#FAF0E6" stroke="#D2B48C" stroke-width="2.5"/>
        <ellipse cx="-10" cy="0" rx="4" ry="15" fill="#F5DEB3" opacity="0.5"/>
        <ellipse cx="10" cy="10" rx="4" ry="12" fill="#F5DEB3" opacity="0.5"/>
        <path d="M -8,-50 Q 0,-55 8,-50" fill="#F5F5DC" stroke="#D2B48C" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    revealTech: 'Hunting',
    connectTech: 'Hunting',
    description: 'Ivory provides +1 Happiness and +1 Commerce. Found near Elephants, requires a Camp to access.',
    happinessBonus: 1
  },
  {
    id: 'furs',
    name: 'Furs',
    category: 'Luxury',
    icon: '🦊',
    color: '#8B4513',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#8B4513" stroke="#654321" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="0" rx="50" ry="40" fill="#A0522D" stroke="#654321" stroke-width="2.5"/>
        <path d="M -30,-25 Q -35,-35 -40,-30 Q -38,-20 -30,-18 Z" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <path d="M 30,-25 Q 35,-35 40,-30 Q 38,-20 30,-18 Z" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <ellipse cx="-15" cy="-10" rx="5" ry="6" fill="#2d2d2d"/>
        <ellipse cx="15" cy="-10" rx="5" ry="6" fill="#2d2d2d"/>
        <polygon points="0,5 -8,12 8,12" fill="#654321" stroke="#2d2d2d" stroke-width="1.5"/>
        <path d="M -25,15 Q -15,25 0,22 Q 15,25 25,15" fill="none" stroke="#654321" stroke-width="3"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    revealTech: 'Hunting',
    connectTech: 'Hunting',
    description: 'Furs provide +1 Happiness and +1 Commerce. Typically found in tundra and forested areas.',
    happinessBonus: 1
  },
  {
    id: 'dyes',
    name: 'Dyes',
    category: 'Luxury',
    icon: '🎨',
    color: '#9932CC',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#9932CC" stroke="#8B008B" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <circle cx="-25" cy="-20" r="20" fill="#FF1493" stroke="#C71585" stroke-width="2"/>
        <circle cx="25" cy="-20" r="20" fill="#00BFFF" stroke="#1E90FF" stroke-width="2"/>
        <circle cx="-25" cy="20" r="20" fill="#FFD700" stroke="#FFA500" stroke-width="2"/>
        <circle cx="25" cy="20" r="20" fill="#00FF00" stroke="#00AA00" stroke-width="2"/>
        <circle cx="0" cy="0" r="18" fill="#FF6347" stroke="#DC143C" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    revealTech: 'Calendar',
    connectTech: 'Calendar',
    description: 'Dyes provide +1 Happiness and +1 Commerce. Created from plantation improvements.',
    happinessBonus: 1
  },
  {
    id: 'incense',
    name: 'Incense',
    category: 'Luxury',
    icon: '🔥',
    color: '#FFD700',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <rect x="-12" y="15" width="24" height="35" rx="2" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <path d="M -15,-30 Q -10,-40 -5,-30 Q -8,-20 -10,-10" fill="none" stroke="#B8860B" stroke-width="2" opacity="0.7"/>
        <path d="M 0,-35 Q 5,-45 10,-35 Q 7,-25 5,-15" fill="none" stroke="#FFA500" stroke-width="2" opacity="0.7"/>
        <path d="M 15,-30 Q 20,-40 25,-30 Q 22,-20 20,-10" fill="none" stroke="#FF8C00" stroke-width="2" opacity="0.7"/>
        <ellipse cx="0" cy="15" rx="15" ry="6" fill="#CD853F" stroke="#8B4513" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      commerce: 1
    },
    revealTech: 'Calendar',
    connectTech: 'Calendar',
    description: 'Incense provides +1 Happiness and +1 Commerce. A valuable aromatic resource.',
    happinessBonus: 1
  },

  // BONUS RESOURCES (Food/Production)
  {
    id: 'wheat',
    name: 'Wheat',
    category: 'Bonus',
    icon: '🌾',
    color: '#F4A460',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#F4A460" stroke="#DAA520" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -5,-50 Q -8,-30 -10,10 L -8,40 Q -8,48 0,48 Q 8,48 8,40 L 10,10 Q 8,-30 5,-50" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <ellipse cx="-15" cy="-55" rx="5" ry="10" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="-12" cy="-45" rx="4" ry="9" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="-9" cy="-35" rx="4" ry="8" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="15" cy="-55" rx="5" ry="10" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="12" cy="-45" rx="4" ry="9" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="9" cy="-35" rx="4" ry="8" fill="#FFD700" stroke="#DAA520" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Agriculture',
    description: 'Wheat provides +1 Food. Improved with Farms for even more food output. Essential for rapid city growth.',
    healthBonus: 1
  },
  {
    id: 'corn',
    name: 'Corn',
    category: 'Bonus',
    icon: '🌽',
    color: '#F0E68C',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#F0E68C" stroke="#DAA520" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="0" rx="25" ry="45" fill="#FFD700" stroke="#DAA520" stroke-width="2.5"/>
        <rect x="-22" y="-5" width="44" height="8" fill="#FFED4E" stroke="#FFA500" stroke-width="1"/>
        <rect x="-22" y="5" width="44" height="8" fill="#FFED4E" stroke="#FFA500" stroke-width="1"/>
        <rect x="-22" y="-15" width="44" height="8" fill="#FFED4E" stroke="#FFA500" stroke-width="1"/>
        <rect x="-22" y="15" width="44" height="8" fill="#FFED4E" stroke="#FFA500" stroke-width="1"/>
        <path d="M -5,-50 Q -15,-55 -20,-45 L -10,-40" fill="#228B22" stroke="#006400" stroke-width="2"/>
        <path d="M 5,-50 Q 15,-55 20,-45 L 10,-40" fill="#228B22" stroke="#006400" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Agriculture',
    description: 'Corn provides +1 Food. One of the most productive food resources when improved.',
    healthBonus: 1
  },
  {
    id: 'rice',
    name: 'Rice',
    category: 'Bonus',
    icon: '🍚',
    color: '#FFFACD',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFFACD" stroke="#F5DEB3" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="5" rx="40" ry="50" fill="#90EE90" stroke="#228B22" stroke-width="2"/>
        <ellipse cx="-15" cy="-20" rx="8" ry="30" fill="#FFE4B5" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="-5" cy="-22" rx="8" ry="32" fill="#FFEFD5" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="5" cy="-22" rx="8" ry="32" fill="#FFE4B5" stroke="#DAA520" stroke-width="1.5"/>
        <ellipse cx="15" cy="-20" rx="8" ry="30" fill="#FFEFD5" stroke="#DAA520" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Agriculture',
    description: 'Rice provides +1 Food. Typically found on flood plains, excellent for early growth.',
    healthBonus: 1
  },
  {
    id: 'cow',
    name: 'Cow',
    category: 'Bonus',
    icon: '🐄',
    color: '#DEB887',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#DEB887" stroke="#D2691E" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="5" cy="10" rx="40" ry="35" fill="#F5DEB3" stroke="#8B4513" stroke-width="2.5"/>
        <ellipse cx="-10" cy="-15" rx="30" ry="28" fill="#DEB887" stroke="#8B4513" stroke-width="2.5"/>
        <path d="M -30,-25 Q -35,-35 -40,-28 L -35,-18" fill="#F5DEB3" stroke="#8B4513" stroke-width="2"/>
        <path d="M 5,-25 Q 10,-35 15,-28 L 10,-18" fill="#F5DEB3" stroke="#8B4513" stroke-width="2"/>
        <circle cx="-15" cy="-20" r="4" fill="#2d2d2d"/>
        <ellipse cx="-10" cy="-10" r="3" fill="#FFB6C1"/>
        <rect x="-5" y="35" width="6" height="20" fill="#8B4513" stroke="#654321" stroke-width="1.5"/>
        <rect x="10" y="35" width="6" height="20" fill="#8B4513" stroke="#654321" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Animal Husbandry',
    description: 'Cow provides +1 Food. Improved with Pastures to provide additional food and production.',
    healthBonus: 1
  },
  {
    id: 'pig',
    name: 'Pig',
    category: 'Bonus',
    icon: '🐷',
    color: '#FFC0CB',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFC0CB" stroke="#FFB6C1" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="8" cy="15" rx="42" ry="32" fill="#FFB6C1" stroke="#FF69B4" stroke-width="2.5"/>
        <circle cx="-12" cy="-8" r="28" fill="#FFC0CB" stroke="#FF69B4" stroke-width="2.5"/>
        <circle cx="-18" cy="-12" r="4" fill="#2d2d2d"/>
        <circle cx="-8" cy="-2" r="12" fill="#FFB6C1" stroke="#FF69B4" stroke-width="2"/>
        <ellipse cx="-8" cy="-2" rx="4" ry="6" fill="#DB7093"/>
        <path d="M -35,-15 Q -40,-20 -42,-12 L -38,-8" fill="#FFB6C1" stroke="#FF69B4" stroke-width="2"/>
        <path d="M 0,-18 Q 5,-24 8,-18 L 5,-12" fill="#FFB6C1" stroke="#FF69B4" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Animal Husbandry',
    description: 'Pig provides +1 Food. Requires Animal Husbandry to improve with Pastures.',
    healthBonus: 1
  },
  {
    id: 'sheep',
    name: 'Sheep',
    category: 'Bonus',
    icon: '🐑',
    color: '#F5F5F5',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#F5F5F5" stroke="#E8E8E8" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="5" cy="8" rx="38" ry="32" fill="#FFFFF0" stroke="#D3D3D3" stroke-width="2.5"/>
        <circle cx="-10" cy="-12" r="22" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="2.5"/>
        <circle cx="-15" cy="-15" r="4" fill="#2d2d2d"/>
        <path d="M -25,-18 Q -22,-25 -18,-20" fill="none" stroke="#696969" stroke-width="2"/>
        <path d="M -5,-25 Q -2,-32 2,-25" fill="none" stroke="#696969" stroke-width="2"/>
        <rect x="-2" y="32" width="5" height="18" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="1.5"/>
        <rect x="10" y="32" width="5" height="18" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="1.5"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Animal Husbandry',
    description: 'Sheep provides +1 Food. Often found on hills, can provide both food and production.',
    healthBonus: 1
  },
  {
    id: 'fish',
    name: 'Fish',
    category: 'Bonus',
    icon: '🐟',
    color: '#4682B4',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#4682B4" stroke="#4169E1" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="8" cy="0" rx="45" ry="25" fill="#87CEEB" stroke="#1E90FF" stroke-width="2.5"/>
        <circle cx="-20" cy="-5" r="3" fill="#2d2d2d"/>
        <polygon points="50,0 70,-15 70,15" fill="#87CEEB" stroke="#1E90FF" stroke-width="2"/>
        <path d="M 10,-20 L 20,-10 M 10,20 L 20,10 M 25,-15 L 32,-8 M 25,15 L 32,8" fill="none" stroke="#4169E1" stroke-width="2"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Fishing',
    description: 'Fish provides +1 Food. Water resource improved with Fishing Boats for coastal cities.',
    healthBonus: 1
  },
  {
    id: 'clam',
    name: 'Clam',
    category: 'Bonus',
    icon: '🦪',
    color: '#F0E68C',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#F0E68C" stroke="#DAA520" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -35,20 Q -40,-10 -20,-30 Q 0,-35 20,-30 Q 40,-10 35,20 Z" fill="#D2B48C" stroke="#8B7355" stroke-width="2.5"/>
        <path d="M -30,18 Q -35,-8 -18,-25 Q 0,-28 18,-25 Q 35,-8 30,18 Z" fill="#F5DEB3" stroke="#D2B48C" stroke-width="2"/>
        <ellipse cx="0" cy="-5" rx="15" ry="18" fill="#FFEFD5" opacity="0.8"/>
        <circle cx="0" cy="-8" r="6" fill="#E6E6FA" stroke="#DDA0DD" stroke-width="1.5"/>
        <path d="M -30,15 L 0,-25 M -20,15 L 0,-25 M -10,18 L 0,-25" fill="none" stroke="#C4A777" stroke-width="1" opacity="0.6"/>
        <path d="M 30,15 L 0,-25 M 20,15 L 0,-25 M 10,18 L 0,-25" fill="none" stroke="#C4A777" stroke-width="1" opacity="0.6"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Fishing',
    description: 'Clam provides +1 Food. Ocean resource requiring Fishing Boats to improve.',
    healthBonus: 1
  },
  {
    id: 'crab',
    name: 'Crab',
    category: 'Bonus',
    icon: '🦀',
    color: '#FF6347',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FF6347" stroke="#DC143C" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="5" rx="35" ry="28" fill="#FF7F50" stroke="#CD5C5C" stroke-width="2.5"/>
        <circle cx="-12" cy="-8" r="8" fill="#2d2d2d"/>
        <circle cx="12" cy="-8" r="8" fill="#2d2d2d"/>
        <ellipse cx="-30" cy="0" rx="12" ry="18" fill="#FF6347" stroke="#CD5C5C" stroke-width="2"/>
        <ellipse cx="30" cy="0" rx="12" ry="18" fill="#FF6347" stroke="#CD5C5C" stroke-width="2"/>
        <rect x="-40" y="15" width="8" height="3" fill="#CD5C5C" stroke="#8B0000" stroke-width="1"/>
        <rect x="-35" y="22" width="8" height="3" fill="#CD5C5C" stroke="#8B0000" stroke-width="1"/>
        <rect x="32" y="15" width="8" height="3" fill="#CD5C5C" stroke="#8B0000" stroke-width="1"/>
        <rect x="27" y="22" width="8" height="3" fill="#CD5C5C" stroke="#8B0000" stroke-width="1"/>
      </g>
    </svg>`,
    yields: {
      food: 1,
      commerce: 1
    },
    revealTech: null,
    connectTech: 'Fishing',
    description: 'Crab provides +1 Food and +1 Commerce. One of the better water resources.',
    healthBonus: 1
  },
  {
    id: 'deer',
    name: 'Deer',
    category: 'Bonus',
    icon: '🦌',
    color: '#8B4513',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#8B4513" stroke="#654321" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="5" cy="10" rx="32" ry="38" fill="#A0522D" stroke="#654321" stroke-width="2.5"/>
        <ellipse cx="-8" cy="-15" rx="25" ry="22" fill="#8B4513" stroke="#654321" stroke-width="2.5"/>
        <path d="M -25,-28 L -30,-45 L -22,-42 L -20,-30 M -22,-42 L -28,-50 M -22,-42 L -18,-48" fill="none" stroke="#654321" stroke-width="2.5"/>
        <path d="M 5,-28 L 0,-45 L 8,-42 L 10,-30 M 8,-42 L 2,-50 M 8,-42 L 12,-48" fill="none" stroke="#654321" stroke-width="2.5"/>
        <path d="M -25,-20 Q -30,-25 -28,-18" fill="#A0522D" stroke="#654321" stroke-width="2"/>
        <path d="M 8,-20 Q 13,-25 11,-18" fill="#A0522D" stroke="#654321" stroke-width="2"/>
        <circle cx="-12" cy="-18" r="4" fill="#2d2d2d"/>
        <ellipse cx="-8" cy="-10" r="3" fill="#8B4513"/>
      </g>
    </svg>`,
    yields: {
      food: 1
    },
    revealTech: null,
    connectTech: 'Hunting',
    description: 'Deer provides +1 Food. Forest resource improved with Camps.',
    healthBonus: 1
  }
];

export const resourceCategories = {
  strategic: resources.filter(r => r.category === 'Strategic'),
  luxury: resources.filter(r => r.category === 'Luxury'),
  bonus: resources.filter(r => r.category === 'Bonus')
};
