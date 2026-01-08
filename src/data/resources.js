export const resources = [
  // STRATEGIC RESOURCES
  {
    id: 'iron',
    name: 'Iron',
    category: 'Strategic',
    icon: '⚔️',
    color: '#808080',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#696969" stroke="#505050" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Iron ingot - bold and metallic -->
        <rect x="-45" y="-35" width="90" height="70" rx="8" fill="#A9A9A9" stroke="#424242" stroke-width="5"/>
        <rect x="-40" y="-30" width="80" height="60" rx="6" fill="#C0C0C0" stroke="#505050" stroke-width="3"/>
        <!-- Metallic shine -->
        <rect x="-35" y="-25" width="30" height="15" rx="3" fill="#E8E8E8" opacity="0.7"/>
        <!-- Shadows for depth -->
        <rect x="-40" y="15" width="80" height="15" rx="6" fill="#808080" opacity="0.5"/>
        <!-- Iron symbol/mark -->
        <rect x="-8" y="-10" width="16" height="30" fill="#696969" stroke="#424242" stroke-width="2"/>
        <rect x="-20" y="0" width="40" height="10" fill="#696969" stroke="#424242" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#A0522D" stroke="#8B4513" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Copper ore chunks -->
        <polygon points="-35,-40 -10,-50 15,-35 10,-10 -25,-5 -45,-20"
                 fill="#CD853F" stroke="#8B4513" stroke-width="4"/>
        <polygon points="-30,-37 -8,-45 12,-32 8,-12 -22,-8 -40,-22"
                 fill="#D2691E" stroke="#A0522D" stroke-width="2"/>
        <!-- Second copper chunk -->
        <polygon points="5,0 35,-5 50,20 40,45 10,50 -5,25"
                 fill="#B87333" stroke="#8B4513" stroke-width="4"/>
        <polygon points="10,3 33,-2 45,18 38,40 13,45 0,23"
                 fill="#CD853F" stroke="#A0522D" stroke-width="2"/>
        <!-- Copper vein highlights -->
        <ellipse cx="-15" cy="-25" rx="8" ry="12" fill="#E9967A" opacity="0.6"/>
        <ellipse cx="25" cy="20" rx="10" ry="14" fill="#E9967A" opacity="0.6"/>
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
      <circle cx="100" cy="100" r="95" fill="#654321" stroke="#4d3319" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Horse head - bold and iconic -->
        <!-- Neck and body -->
        <ellipse cx="5" cy="15" rx="38" ry="50" fill="#A0522D" stroke="#654321" stroke-width="4"/>
        <!-- Head -->
        <ellipse cx="-8" cy="-25" rx="30" ry="35" fill="#8B4513" stroke="#654321" stroke-width="4"/>
        <!-- Ears -->
        <ellipse cx="-25" cy="-45" rx="10" ry="18" fill="#A0522D" stroke="#654321" stroke-width="3"/>
        <ellipse cx="8" cy="-48" rx="10" ry="18" fill="#A0522D" stroke="#654321" stroke-width="3"/>
        <!-- Mane -->
        <path d="M -15,-55 Q -10,-60 -5,-55 L -8,-45" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <path d="M 0,-58 Q 5,-62 10,-57 L 7,-48" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <!-- Eye -->
        <circle cx="-12" cy="-28" r="6" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <!-- Nostril -->
        <ellipse cx="-20" cy="-10" rx="4" ry="6" fill="#654321"/>
        <!-- Legs -->
        <rect x="-10" y="55" width="10" height="25" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="10" y="55" width="10" height="25" fill="#8B4513" stroke="#654321" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#1a1a1a" stroke="#000000" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Oil barrel - industrial -->
        <!-- Barrel bottom -->
        <ellipse cx="0" cy="40" rx="38" ry="15" fill="#0d0d0d" stroke="#000000" stroke-width="4"/>
        <!-- Barrel body -->
        <rect x="-38" y="-35" width="76" height="75" fill="#2F4F4F" stroke="#1a1a1a" stroke-width="4"/>
        <rect x="-36" y="-33" width="72" height="71" fill="#3d5c5c" stroke="#2F4F4F" stroke-width="2"/>
        <!-- Barrel top -->
        <ellipse cx="0" cy="-35" rx="38" ry="15" fill="#4a6b6b" stroke="#1a1a1a" stroke-width="4"/>
        <!-- Horizontal bands -->
        <rect x="-38" y="-20" width="76" height="8" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <rect x="-38" cy="10" width="76" height="8" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <!-- Warning symbol -->
        <circle cx="0" cy="-55" r="12" fill="#FF6347" stroke="#C41E3A" stroke-width="3"/>
        <!-- Shine/highlight -->
        <ellipse cx="-15" cy="-15" rx="10" ry="20" fill="#FFFFFF" opacity="0.2"/>
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
      <circle cx="100" cy="100" r="95" fill="#00AA00" stroke="#008800" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Radioactive symbol - bold and clear -->
        <!-- Center circle -->
        <circle cx="0" cy="0" r="70" fill="#32CD32" stroke="#228B22" stroke-width="5"/>
        <circle cx="0" cy="0" r="63" fill="#7FFF00" stroke="#32CD32" stroke-width="3"/>
        <!-- Radiation symbol -->
        <circle cx="0" cy="0" r="18" fill="#2d2d2d" stroke="#000000" stroke-width="4"/>
        <!-- Radiation blades -->
        <circle cx="0" cy="-40" r="15" fill="#2d2d2d" stroke="#000000" stroke-width="4"/>
        <circle cx="35" cy="20" r="15" fill="#2d2d2d" stroke="#000000" stroke-width="4"/>
        <circle cx="-35" cy="20" r="15" fill="#2d2d2d" stroke="#000000" stroke-width="4"/>
        <!-- Connecting triangular shapes -->
        <path d="M 0,-18 L 15,-25 L -15,-25 Z" fill="#2d2d2d" stroke="#000000" stroke-width="3"/>
        <path d="M 15,10 L 27,22 L 12,30 Z" fill="#2d2d2d" stroke="#000000" stroke-width="3"/>
        <path d="M -15,10 L -12,30 L -27,22 Z" fill="#2d2d2d" stroke="#000000" stroke-width="3"/>
        <!-- Glow effect -->
        <circle cx="0" cy="0" r="55" fill="#9AFF9A" opacity="0.3"/>
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
      <circle cx="100" cy="100" r="95" fill="#0d0d0d" stroke="#000000" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Coal chunks - angular and dark -->
        <!-- Large coal chunk -->
        <polygon points="-5,-55 40,-35 45,10 20,45 -30,40 -45,-5 -25,-40"
                 fill="#2d2d2d" stroke="#000000" stroke-width="5"/>
        <polygon points="-2,-50 35,-32 40,8 18,40 -27,35 -40,-3 -22,-37"
                 fill="#3d3d3d" stroke="#1a1a1a" stroke-width="3"/>
        <!-- Angular facets -->
        <polygon points="-20,-20 10,-30 25,5 0,25 -25,15"
                 fill="#1a1a1a" stroke="#000000" stroke-width="3"/>
        <polygon points="15,0 30,-10 35,15 20,25"
                 fill="#262626" stroke="#000000" stroke-width="2"/>
        <!-- Small coal piece -->
        <polygon points="-35,-25 -20,-35 -10,-20 -20,-10 -35,-15"
                 fill="#404040" stroke="#1a1a1a" stroke-width="3"/>
        <!-- Subtle shine on edges -->
        <path d="M -5,-55 L 10,-50 L 15,-45" fill="none" stroke="#505050" stroke-width="2"/>
        <path d="M 40,-35 L 43,-20 L 45,0" fill="none" stroke="#505050" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#A9A9A9" stroke="#808080" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Aluminum ingot - shiny and metallic -->
        <rect x="-42" y="-50" width="84" height="100" rx="10" fill="#E8E8E8" stroke="#696969" stroke-width="5"/>
        <rect x="-38" y="-45" width="76" height="90" rx="8" fill="#F5F5F5" stroke="#A9A9A9" stroke-width="3"/>
        <!-- Metallic highlights -->
        <rect x="-30" y="-40" width="25" height="35" rx="4" fill="#FFFFFF" opacity="0.6"/>
        <ellipse cx="20" cy="0" rx="15" ry="30" fill="#DCDCDC" opacity="0.5"/>
        <!-- Aluminum symbol (Al) -->
        <text x="0" y="15" font-family="Arial, sans-serif" font-size="42" font-weight="bold"
              fill="#696969" text-anchor="middle" stroke="#505050" stroke-width="1">Al</text>
        <!-- Shine effects -->
        <rect x="25" y="-35" width="8" height="60" rx="2" fill="#FFFFFF" opacity="0.4"/>
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
      <circle cx="100" cy="100" r="95" fill="#F9A825" stroke="#F57F17" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Gold nuggets -->
        <polygon points="-35,-30 -15,-45 5,-40 15,-20 5,-5 -20,0 -40,-15"
                 fill="#FFA500" stroke="#B8860B" stroke-width="4"/>
        <polygon points="-32,-27 -13,-40 3,-36 13,-18 3,-7 -18,-2 -37,-13"
                 fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
        <!-- Second gold nugget -->
        <polygon points="0,5 25,0 45,20 40,45 15,50 -10,40 -5,15"
                 fill="#FFA500" stroke="#B8860B" stroke-width="4"/>
        <polygon points="3,8 23,3 40,20 37,42 17,46 -7,38 -3,17"
                 fill="#FFEA00" stroke="#DAA520" stroke-width="3"/>
        <!-- Golden highlights -->
        <ellipse cx="-15" cy="-20" rx="10" ry="12" fill="#FFF9C4" opacity="0.7"/>
        <ellipse cx="20" cy="25" rx="12" ry="14" fill="#FFF9C4" opacity="0.7"/>
        <!-- Small gold chunk -->
        <polygon points="-45,-5 -35,-12 -25,-5 -30,5 -40,8"
                 fill="#FFD700" stroke="#F9A825" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#A9A9A9" stroke="#808080" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Silver ore chunks -->
        <polygon points="-30,-35 -10,-48 15,-42 25,-20 15,-5 -15,0 -35,-20"
                 fill="#B0B0B0" stroke="#808080" stroke-width="4"/>
        <polygon points="-27,-32 -8,-43 13,-38 22,-18 13,-7 -13,-2 -32,-18"
                 fill="#D3D3D3" stroke="#A9A9A9" stroke-width="3"/>
        <!-- Second silver chunk -->
        <polygon points="5,8 30,5 48,25 42,48 18,52 -5,42 0,18"
                 fill="#B0B0B0" stroke="#808080" stroke-width="4"/>
        <polygon points="8,10 28,8 43,25 39,45 20,48 -2,40 2,20"
                 fill="#E8E8E8" stroke="#A9A9A9" stroke-width="3"/>
        <!-- Metallic shine -->
        <ellipse cx="-10" cy="-22" rx="10" ry="14" fill="#F5F5F5" opacity="0.8"/>
        <ellipse cx="22" cy="28" rx="12" ry="15" fill="#FFFFFF" opacity="0.7"/>
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
      <circle cx="100" cy="100" r="95" fill="#663399" stroke="#4A148C" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Large diamond/gem -->
        <polygon points="0,-50 -30,-20 -20,35 20,35 30,-20"
                 fill="#DA70D6" stroke="#8B008B" stroke-width="5"/>
        <polygon points="0,-45 -25,-18 -17,30 17,30 25,-18"
                 fill="#FF69B4" stroke="#C71585" stroke-width="3"/>
        <!-- Diamond facets -->
        <line x1="0" y1="-45" x2="0" y2="30" stroke="#F0E68C" stroke-width="3" opacity="0.6"/>
        <line x1="-25" y1="-18" x2="17" y2="30" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
        <line x1="25" y1="-18" x2="-17" y2="30" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
        <line x1="-25" y1="-18" x2="25" y2="-18" stroke="#E6E6FA" stroke-width="2" opacity="0.6"/>
        <!-- Sparkle effects -->
        <circle cx="-15" cy="-10" r="5" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="12" cy="5" r="4" fill="#F0E68C" opacity="0.8"/>
        <circle cx="0" cy="-30" r="3" fill="#FFFFFF" opacity="0.9"/>
        <!-- Small gems in corners -->
        <polygon points="-55,-30 -45,-35 -40,-25 -48,-20"
                 fill="#BA55D3" stroke="#8B008B" stroke-width="2"/>
        <polygon points="50,-25 55,-32 60,-22 52,-20"
                 fill="#DDA0DD" stroke="#8B008B" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#BA55D3" stroke="#9932CC" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Silk fabric flowing -->
        <path d="M -50,-30 Q -35,-45 -15,-35 Q 0,-50 20,-30 Q 35,-45 55,-25
                 Q 40,-10 30,10 Q 45,25 35,45 Q 20,35 0,45 Q -15,30 -30,45
                 Q -45,30 -55,10 Q -40,-5 -50,-30"
              fill="#EE82EE" stroke="#BA55D3" stroke-width="4"/>
        <path d="M -45,-27 Q -32,-40 -13,-32 Q 0,-45 18,-27 Q 32,-40 48,-22
                 Q 35,-8 28,8 Q 40,22 32,40 Q 18,32 0,40 Q -13,28 -27,40
                 Q -40,25 -48,8 Q -35,-3 -45,-27"
              fill="#FFB6C1" stroke="#DB7093" stroke-width="3"/>
        <!-- Silk waves/folds -->
        <path d="M -35,0 Q -20,-10 0,0 Q 20,-10 35,0"
              fill="none" stroke="#F0E68C" stroke-width="3" opacity="0.5"/>
        <path d="M -30,15 Q -15,8 5,15 Q 25,8 40,15"
              fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>
        <!-- Sheen highlights -->
        <ellipse cx="-20" cy="-15" rx="12" ry="18" fill="#FFFFFF" opacity="0.3"/>
        <ellipse cx="15" cy="10" rx="10" ry="15" fill="#FFFFFF" opacity="0.3"/>
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
      <circle cx="100" cy="100" r="95" fill="#DC143C" stroke="#8B0000" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Chili pepper - bold design -->
        <path d="M -8,-50 Q -12,-25 -16,0 Q -20,25 -15,50 Q -8,58 0,55 Q 8,52 10,45 Q 14,20 16,0 Q 18,-25 14,-45 Q 10,-52 5,-50"
              fill="#DC143C" stroke="#8B0000" stroke-width="4"/>
        <path d="M -7,-48 Q -10,-28 -13,0 Q -16,22 -12,48 Q -6,54 0,52 Q 6,50 8,43 Q 11,18 13,0 Q 15,-25 12,-43 Q 9,-48 6,-47"
              fill="#FF6347" stroke="#C41E3A" stroke-width="2"/>
        <!-- Stem -->
        <path d="M -5,-50 Q -8,-55 -3,-58 Q 2,-60 6,-56 Q 8,-53 5,-50"
              fill="#228B22" stroke="#006400" stroke-width="3"/>
        <!-- Second pepper -->
        <path d="M 20,-35 Q 18,-15 20,5 Q 22,25 28,42 Q 32,48 38,46 Q 43,44 44,38 Q 46,18 44,0 Q 42,-20 38,-32"
              fill="#CD5C5C" stroke="#8B0000" stroke-width="4"/>
        <path d="M 22,-33 Q 20,-16 22,4 Q 24,22 29,38 Q 33,43 37,42 Q 41,40 42,35 Q 44,16 42,0 Q 40,-18 37,-30"
              fill="#FF4500" stroke="#C41E3A" stroke-width="2"/>
        <!-- Spice seeds/spots -->
        <ellipse cx="-10" cy="10" rx="3" ry="5" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="-5" cy="-10" rx="2" ry="4" fill="#FFD700" opacity="0.7"/>
        <ellipse cx="2" cy="20" rx="3" ry="4" fill="#FFD700" opacity="0.7"/>
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
      <circle cx="100" cy="100" r="95" fill="#5C0011" stroke="#3d0008" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Wine glass - elegant design -->
        <!-- Base -->
        <ellipse cx="0" cy="55" rx="22" ry="10" fill="#654321" stroke="#4d3319" stroke-width="3"/>
        <!-- Stem -->
        <rect x="-6" y="5" width="12" height="50" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Bowl -->
        <path d="M -32,-45 Q -32,-15 -8,5 Q 0,8 8,5 Q 32,-15 32,-45 Z"
              fill="#A0522D" stroke="#654321" stroke-width="4"/>
        <path d="M -30,-43 Q -30,-17 -7,3 Q 0,6 7,3 Q 30,-17 30,-43 Z"
              fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <!-- Rim -->
        <ellipse cx="0" cy="-45" rx="32" ry="10" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Wine liquid -->
        <ellipse cx="0" cy="-20" rx="24" ry="28" fill="#722F37" opacity="0.9"/>
        <ellipse cx="0" cy="-18" rx="22" ry="25" fill="#8B0A1A" opacity="0.8"/>
        <!-- Liquid surface -->
        <ellipse cx="0" cy="-32" rx="26" ry="8" fill="#9B1B30" stroke="#722F37" stroke-width="2"/>
        <!-- Glass shine -->
        <ellipse cx="-15" cy="-25" rx="8" ry="15" fill="#FFFFFF" opacity="0.3"/>
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
      <circle cx="100" cy="100" r="95" fill="#F5F5DC" stroke="#DEB887" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Elephant tusk - curved ivory -->
        <path d="M -12,-60 Q -18,-30 -22,0 Q -24,30 -20,55 Q -15,65 -8,68 Q 0,70 8,68 Q 15,65 20,55 Q 24,30 22,0 Q 18,-30 12,-60"
              fill="#FAF0E6" stroke="#D2B48C" stroke-width="4"/>
        <path d="M -10,-58 Q -15,-32 -18,0 Q -20,28 -17,52 Q -13,62 -7,64 Q 0,66 7,64 Q 13,62 17,52 Q 20,28 18,0 Q 15,-32 10,-58"
              fill="#FFFFF0" stroke="#F5DEB3" stroke-width="3"/>
        <!-- Ivory texture/rings -->
        <ellipse cx="-14" cy="-15" rx="5" ry="12" fill="#F5DEB3" opacity="0.4"/>
        <ellipse cx="0" cy="10" rx="6" ry="14" fill="#F5DEB3" opacity="0.4"/>
        <ellipse cx="15" cy="30" rx="5" ry="10" fill="#F5DEB3" opacity="0.4"/>
        <!-- Horizontal grain lines -->
        <path d="M -18,-10 Q -15,-8 -12,-10" fill="none" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
        <path d="M -20,15 Q -17,17 -14,15" fill="none" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
        <path d="M 16,25 Q 18,27 20,25" fill="none" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
        <!-- Tip detail -->
        <path d="M -12,-60 Q -5,-65 0,-63 Q 5,-65 12,-60"
              fill="#FFF8DC" stroke="#D2B48C" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#654321" stroke="#4d3319" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Fur pelt - layered and textured -->
        <ellipse cx="0" cy="5" rx="55" ry="50" fill="#A0522D" stroke="#654321" stroke-width="4"/>
        <ellipse cx="0" cy="3" rx="50" ry="45" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Fox head shape -->
        <circle cx="-15" cy="-20" r="22" fill="#CD853F" stroke="#8B4513" stroke-width="3"/>
        <circle cx="15" cy="-20" r="22" fill="#CD853F" stroke="#8B4513" stroke-width="3"/>
        <!-- Ears -->
        <path d="M -30,-30 Q -35,-45 -40,-35 Q -38,-22 -30,-20"
              fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <path d="M 30,-30 Q 35,-45 40,-35 Q 38,-22 30,-20"
              fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Eyes -->
        <circle cx="-18" cy="-22" r="6" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <circle cx="18" cy="-22" r="6" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <!-- Nose -->
        <polygon points="0,-10 -8,-2 8,-2" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <!-- Fur texture pattern -->
        <path d="M -35,20 Q -30,25 -25,20 M -15,25 Q -10,30 -5,25 M 5,25 Q 10,30 15,25 M 25,20 Q 30,25 35,20"
              fill="none" stroke="#654321" stroke-width="2" opacity="0.6"/>
        <path d="M -40,35 Q -35,40 -30,35 M -20,40 Q -15,45 -10,40 M 0,40 Q 5,45 10,40 M 20,40 Q 25,45 30,40"
              fill="none" stroke="#654321" stroke-width="2" opacity="0.6"/>
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
      <circle cx="100" cy="100" r="95" fill="#8B008B" stroke="#4B0082" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Colorful dye pots/splotches -->
        <circle cx="-30" cy="-25" r="24" fill="#FF1493" stroke="#C71585" stroke-width="4"/>
        <circle cx="-28" cy="-25" r="20" fill="#FF69B4" stroke="#DB7093" stroke-width="2"/>
        <circle cx="30" cy="-25" r="24" fill="#00BFFF" stroke="#1E90FF" stroke-width="4"/>
        <circle cx="32" cy="-25" r="20" fill="#87CEEB" stroke="#4682B4" stroke-width="2"/>
        <circle cx="-30" cy="25" r="24" fill="#FFD700" stroke="#FFA500" stroke-width="4"/>
        <circle cx="-28" cy="25" r="20" fill="#FFEA00" stroke="#FFD700" stroke-width="2"/>
        <circle cx="30" cy="25" r="24" fill="#00FF00" stroke="#00AA00" stroke-width="4"/>
        <circle cx="32" cy="25" r="20" fill="#7FFF00" stroke="#32CD32" stroke-width="2"/>
        <!-- Center mixing pot -->
        <circle cx="0" cy="0" r="22" fill="#FF6347" stroke="#DC143C" stroke-width="4"/>
        <circle cx="0" cy="0" r="18" fill="#FF7F50" stroke="#FF6347" stroke-width="2"/>
        <!-- Color drips/swirls -->
        <path d="M -30,-1 Q -15,5 0,0" fill="none" stroke="#FF1493" stroke-width="3" opacity="0.7"/>
        <path d="M 30,-1 Q 15,5 0,0" fill="none" stroke="#00BFFF" stroke-width="3" opacity="0.7"/>
        <path d="M -1,30 Q 5,15 0,0" fill="none" stroke="#FFD700" stroke-width="3" opacity="0.7"/>
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
      <circle cx="100" cy="100" r="95" fill="#DAA520" stroke="#B8860B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Incense burner -->
        <!-- Base plate -->
        <ellipse cx="0" cy="50" rx="35" ry="12" fill="#CD853F" stroke="#8B4513" stroke-width="3"/>
        <!-- Burner body -->
        <rect x="-20" y="20" width="40" height="30" rx="3" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <ellipse cx="0" cy="20" rx="20" ry="8" fill="#A0522D" stroke="#654321" stroke-width="2"/>
        <!-- Incense sticks -->
        <rect x="-15" y="-25" width="4" height="45" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <rect x="-5" y="-30" width="4" height="50" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <rect x="5" y="-28" width="4" height="48" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <rect x="15" y="-22" width="4" height="42" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <!-- Smoke wisps -->
        <path d="M -13,-25 Q -18,-35 -15,-45 Q -12,-55 -8,-60"
              fill="none" stroke="#B8860B" stroke-width="3" opacity="0.6"/>
        <path d="M -3,-30 Q 0,-40 3,-50 Q 6,-60 10,-65"
              fill="none" stroke="#FFA500" stroke-width="3" opacity="0.6"/>
        <path d="M 7,-28 Q 12,-38 15,-48 Q 18,-58 22,-63"
              fill="none" stroke="#FF8C00" stroke-width="3" opacity="0.6"/>
        <path d="M 17,-22 Q 22,-32 25,-42 Q 28,-52 30,-57"
              fill="none" stroke="#DAA520" stroke-width="3" opacity="0.6"/>
        <!-- Glowing tips -->
        <circle cx="-13" cy="-25" r="3" fill="#FF6347" opacity="0.8"/>
        <circle cx="-3" cy="-30" r="3" fill="#FF4500" opacity="0.8"/>
        <circle cx="7" cy="-28" r="3" fill="#FF6347" opacity="0.8"/>
        <circle cx="17" cy="-22" r="3" fill="#FF4500" opacity="0.8"/>
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
      <circle cx="100" cy="100" r="95" fill="#DAA520" stroke="#B8860B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Wheat stalks - bold bundle -->
        <rect x="-8" y="-65" width="16" height="120" rx="4" fill="#8B6914" stroke="#654321" stroke-width="4"/>
        <!-- Left wheat head -->
        <ellipse cx="-20" cy="-55" rx="10" ry="18" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="-18" cy="-40" rx="9" ry="16" fill="#FFEB3B" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="-16" cy="-25" rx="8" ry="14" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <!-- Center wheat head -->
        <ellipse cx="0" cy="-60" rx="10" ry="19" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="0" cy="-43" rx="9" ry="17" fill="#FFEB3B" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="0" cy="-27" rx="8" ry="15" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <!-- Right wheat head -->
        <ellipse cx="20" cy="-55" rx="10" ry="18" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="18" cy="-40" rx="9" ry="16" fill="#FFEB3B" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="16" cy="-25" rx="8" ry="14" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <!-- Grain detail lines -->
        <line x1="-20" y1="-45" x2="-20" y2="-65" stroke="#F9A825" stroke-width="2"/>
        <line x1="0" y1="-50" x2="0" y2="-70" stroke="#F9A825" stroke-width="2"/>
        <line x1="20" y1="-45" x2="20" y2="-65" stroke="#F9A825" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#DAA520" stroke="#B8860B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Corn cob - bold design -->
        <ellipse cx="0" cy="0" rx="30" ry="55" fill="#FFD700" stroke="#DAA520" stroke-width="4"/>
        <ellipse cx="0" cy="0" rx="26" ry="50" fill="#FFED4E" stroke="#FFA500" stroke-width="3"/>
        <!-- Corn kernel rows -->
        <rect x="-24" y="-35" width="48" height="10" fill="#FDD835" stroke="#F9A825" stroke-width="2"/>
        <rect x="-24" y="-22" width="48" height="10" fill="#FFEB3B" stroke="#F9A825" stroke-width="2"/>
        <rect x="-24" y="-9" width="48" height="10" fill="#FDD835" stroke="#F9A825" stroke-width="2"/>
        <rect x="-24" y="4" width="48" height="10" fill="#FFEB3B" stroke="#F9A825" stroke-width="2"/>
        <rect x="-24" y="17" width="48" height="10" fill="#FDD835" stroke="#F9A825" stroke-width="2"/>
        <rect x="-24" y="30" width="48" height="10" fill="#FFEB3B" stroke="#F9A825" stroke-width="2"/>
        <!-- Corn husk leaves -->
        <path d="M -10,-55 Q -20,-62 -28,-52 L -18,-45"
              fill="#228B22" stroke="#006400" stroke-width="3"/>
        <path d="M 0,-58 Q -5,-68 -15,-62 L -8,-50"
              fill="#2E8B57" stroke="#006400" stroke-width="3"/>
        <path d="M 10,-55 Q 20,-62 28,-52 L 18,-45"
              fill="#228B22" stroke="#006400" stroke-width="3"/>
        <path d="M 0,-58 Q 5,-68 15,-62 L 8,-50"
              fill="#3CB371" stroke="#006400" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#F5DEB3" stroke="#DEB887" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Rice paddy plant -->
        <ellipse cx="0" cy="15" rx="45" ry="55" fill="#90EE90" stroke="#228B22" stroke-width="4"/>
        <ellipse cx="0" cy="12" rx="40" ry="50" fill="#9ACD32" stroke="#6B8E23" stroke-width="3"/>
        <!-- Rice grain clusters -->
        <ellipse cx="-22" cy="-25" rx="10" ry="30" fill="#FFE4B5" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="-20" cy="-24" rx="8" ry="28" fill="#FFEFD5" stroke="#F5DEB3" stroke-width="2"/>
        <ellipse cx="-8" cy="-30" rx="10" ry="32" fill="#FFE4B5" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="-6" cy="-29" rx="8" ry="30" fill="#FFF8DC" stroke="#F5DEB3" stroke-width="2"/>
        <ellipse cx="6" cy="-30" rx="10" ry="32" fill="#FFE4B5" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="8" cy="-29" rx="8" ry="30" fill="#FFEFD5" stroke="#F5DEB3" stroke-width="2"/>
        <ellipse cx="20" cy="-25" rx="10" ry="30" fill="#FFE4B5" stroke="#DAA520" stroke-width="3"/>
        <ellipse cx="22" cy="-24" rx="8" ry="28" fill="#FFF8DC" stroke="#F5DEB3" stroke-width="2"/>
        <!-- Rice grain detail lines -->
        <line x1="-22" y1="-40" x2="-22" y2="-10" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
        <line x1="-8" y1="-45" x2="-8" y2="-15" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
        <line x1="6" y1="-45" x2="6" y2="-15" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
        <line x1="20" y1="-40" x2="20" y2="-10" stroke="#DEB887" stroke-width="2" opacity="0.5"/>
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
      <circle cx="100" cy="100" r="95" fill="#D2B48C" stroke="#A0826D" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Cow - simplified bold design -->
        <!-- Body -->
        <ellipse cx="8" cy="15" rx="45" ry="38" fill="#F5DEB3" stroke="#8B4513" stroke-width="4"/>
        <ellipse cx="6" cy="13" rx="42" ry="35" fill="#DEB887" stroke="#A0826D" stroke-width="3"/>
        <!-- Head -->
        <ellipse cx="-15" cy="-18" rx="32" ry="30" fill="#DEB887" stroke="#8B4513" stroke-width="4"/>
        <ellipse cx="-16" cy="-19" rx="28" ry="27" fill="#F5DEB3" stroke="#A0826D" stroke-width="3"/>
        <!-- Horns -->
        <path d="M -35,-35 Q -42,-45 -48,-35 L -40,-25"
              fill="#F5DEB3" stroke="#8B4513" stroke-width="3"/>
        <path d="M 5,-35 Q 12,-45 18,-35 L 10,-25"
              fill="#F5DEB3" stroke="#8B4513" stroke-width="3"/>
        <!-- Ears -->
        <ellipse cx="-38" cy="-22" rx="8" ry="14" fill="#DEB887" stroke="#8B4513" stroke-width="2"/>
        <ellipse cx="8" cy="-28" rx="8" ry="14" fill="#DEB887" stroke="#8B4513" stroke-width="2"/>
        <!-- Eye -->
        <circle cx="-20" cy="-22" r="6" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <!-- Nose -->
        <ellipse cx="-18" cy="-5" rx="10" ry="8" fill="#FFB6C1" stroke="#FF69B4" stroke-width="2"/>
        <ellipse cx="-22" cy="-6" rx="3" ry="4" fill="#8B4513"/>
        <ellipse cx="-14" cy="-6" rx="3" ry="4" fill="#8B4513"/>
        <!-- Legs -->
        <rect x="-8" y="45" width="10" height="28" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="12" y="45" width="10" height="28" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Spots -->
        <ellipse cx="15" cy="5" rx="12" ry="10" fill="#8B4513" opacity="0.4"/>
        <ellipse cx="-5" cy="25" rx="10" ry="8" fill="#8B4513" opacity="0.4"/>
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
      <circle cx="100" cy="100" r="95" fill="#FFB6C1" stroke="#FF69B4" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Pig - cute and bold -->
        <!-- Body -->
        <ellipse cx="10" cy="18" rx="48" ry="35" fill="#FFB6C1" stroke="#FF69B4" stroke-width="4"/>
        <ellipse cx="8" cy="16" rx="44" ry="32" fill="#FFC0CB" stroke="#FFB6C1" stroke-width="3"/>
        <!-- Head -->
        <circle cx="-18" cy="-12" r="30" fill="#FFC0CB" stroke="#FF69B4" stroke-width="4"/>
        <circle cx="-19" cy="-13" r="27" fill="#FFB6C1" stroke="#FF69B4" stroke-width="3"/>
        <!-- Ears -->
        <path d="M -42,-22 Q -50,-30 -52,-18 L -45,-12"
              fill="#FFB6C1" stroke="#FF69B4" stroke-width="3"/>
        <path d="M -2,-28 Q 5,-38 10,-28 L 5,-18"
              fill="#FFB6C1" stroke="#FF69B4" stroke-width="3"/>
        <!-- Snout -->
        <ellipse cx="-20" cy="-3" rx="14" ry="12" fill="#FFB6C1" stroke="#FF69B4" stroke-width="3"/>
        <ellipse cx="-20" cy="-3" rx="12" ry="10" fill="#FFC0CB" stroke="#FFB6C1" stroke-width="2"/>
        <ellipse cx="-24" cy="-4" rx="4" ry="6" fill="#DB7093" stroke="#C71585" stroke-width="2"/>
        <ellipse cx="-16" cy="-4" rx="4" ry="6" fill="#DB7093" stroke="#C71585" stroke-width="2"/>
        <!-- Eye -->
        <circle cx="-24" cy="-18" r="5" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <!-- Legs -->
        <rect x="-10" y="45" width="8" height="25" fill="#FF69B4" stroke="#DB7093" stroke-width="3"/>
        <rect x="8" y="45" width="8" height="25" fill="#FF69B4" stroke="#DB7093" stroke-width="3"/>
        <rect x="25" y="45" width="8" height="25" fill="#FF69B4" stroke="#DB7093" stroke-width="3"/>
        <!-- Curly tail -->
        <path d="M 50,15 Q 58,10 60,18 Q 62,26 54,28"
              fill="none" stroke="#FF69B4" stroke-width="4" stroke-linecap="round"/>
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
      <circle cx="100" cy="100" r="95" fill="#E8E8E8" stroke="#D3D3D3" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Sheep - fluffy and bold -->
        <!-- Wool body -->
        <ellipse cx="8" cy="12" rx="42" ry="35" fill="#FFFFF0" stroke="#D3D3D3" stroke-width="4"/>
        <ellipse cx="6" cy="10" rx="38" ry="32" fill="#F5F5F5" stroke="#E8E8E8" stroke-width="3"/>
        <!-- Wool texture circles -->
        <circle cx="-10" cy="5" r="14" fill="#FFFFF0" stroke="#D3D3D3" stroke-width="2"/>
        <circle cx="15" cy="0" r="16" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="2"/>
        <circle cx="5" cy="20" r="15" fill="#FFFFF0" stroke="#D3D3D3" stroke-width="2"/>
        <!-- Head -->
        <ellipse cx="-18" cy="-15" rx="25" ry="24" fill="#F5F5F5" stroke="#D3D3D3" stroke-width="4"/>
        <ellipse cx="-19" cy="-16" rx="22" ry="21" fill="#FFFFF0" stroke="#E8E8E8" stroke-width="3"/>
        <!-- Face details -->
        <circle cx="-22" cy="-18" r="5" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <ellipse cx="-20" cy="-8" rx="6" ry="4" fill="#E8E8E8"/>
        <!-- Ears -->
        <path d="M -35,-20 Q -32,-30 -28,-22"
              fill="none" stroke="#696969" stroke-width="3" stroke-linecap="round"/>
        <path d="M -8,-28 Q -5,-38 -1,-28"
              fill="none" stroke="#696969" stroke-width="3" stroke-linecap="round"/>
        <!-- Legs -->
        <rect x="-8" y="40" width="8" height="25" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
        <rect x="10" y="40" width="8" height="25" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
        <rect x="25" y="40" width="8" height="25" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#4169E1" stroke="#1E3A8A" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Fish - streamlined design -->
        <!-- Body -->
        <ellipse cx="5" cy="0" rx="50" ry="28" fill="#87CEEB" stroke="#1E90FF" stroke-width="4"/>
        <ellipse cx="3" cy="0" rx="46" ry="25" fill="#B0E0E6" stroke="#4682B4" stroke-width="3"/>
        <!-- Tail fin -->
        <polygon points="55,0 75,-20 75,20"
                 fill="#87CEEB" stroke="#1E90FF" stroke-width="4"/>
        <polygon points="57,0 72,-16 72,16"
                 fill="#ADD8E6" stroke="#4682B4" stroke-width="2"/>
        <!-- Top fin -->
        <polygon points="0,-28 10,-45 20,-28"
                 fill="#87CEEB" stroke="#1E90FF" stroke-width="3"/>
        <!-- Bottom fin -->
        <polygon points="-5,28 5,45 15,28"
                 fill="#87CEEB" stroke="#1E90FF" stroke-width="3"/>
        <!-- Eye -->
        <circle cx="-28" cy="-8" r="6" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <circle cx="-27" cy="-9" r="2" fill="#FFFFFF"/>
        <!-- Scales pattern -->
        <path d="M 10,-12 Q 20,-8 10,-4 M 20,-12 Q 30,-8 20,-4 M 30,-12 Q 40,-8 30,-4"
              fill="none" stroke="#4169E1" stroke-width="2" opacity="0.5"/>
        <path d="M 10,4 Q 20,8 10,12 M 20,4 Q 30,8 20,12 M 30,4 Q 40,8 30,12"
              fill="none" stroke="#4169E1" stroke-width="2" opacity="0.5"/>
        <!-- Mouth -->
        <path d="M -50,0 Q -48,-5 -46,0"
              fill="none" stroke="#1E90FF" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#DAA520" stroke="#B8860B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Clam shell - closed -->
        <!-- Bottom shell -->
        <path d="M -40,25 Q -45,-5 -28,-32 Q 0,-40 28,-32 Q 45,-5 40,25 Z"
              fill="#D2B48C" stroke="#8B7355" stroke-width="4"/>
        <path d="M -37,23 Q -42,-3 -26,-29 Q 0,-36 26,-29 Q 42,-3 37,23 Z"
              fill="#F5DEB3" stroke="#D2B48C" stroke-width="3"/>
        <!-- Top shell (slightly open) -->
        <path d="M -40,25 Q -42,10 -30,-10 Q 0,-18 30,-10 Q 42,10 40,25 Z"
              fill="#D2B48C" stroke="#8B7355" stroke-width="4"/>
        <path d="M -37,24 Q -39,12 -28,-8 Q 0,-15 28,-8 Q 39,12 37,24 Z"
              fill="#FFEFD5" stroke="#DEB887" stroke-width="3"/>
        <!-- Pearl inside -->
        <circle cx="0" cy="0" r="12" fill="#E6E6FA" stroke="#DDA0DD" stroke-width="3"/>
        <circle cx="0" cy="0" r="10" fill="#F0E68C" stroke="#E6E6FA" stroke-width="2"/>
        <circle cx="-3" cy="-3" r="4" fill="#FFFFFF" opacity="0.8"/>
        <!-- Shell ridges -->
        <path d="M -35,15 L 0,-28 M -25,18 L 0,-28 M -15,20 L 0,-28 M -5,22 L 0,-28"
              fill="none" stroke="#C4A777" stroke-width="2" opacity="0.5"/>
        <path d="M 35,15 L 0,-28 M 25,18 L 0,-28 M 15,20 L 0,-28 M 5,22 L 0,-28"
              fill="none" stroke="#C4A777" stroke-width="2" opacity="0.5"/>
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
      <circle cx="100" cy="100" r="95" fill="#DC143C" stroke="#8B0000" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Crab - front view -->
        <!-- Body -->
        <ellipse cx="0" cy="8" rx="38" ry="32" fill="#FF7F50" stroke="#CD5C5C" stroke-width="4"/>
        <ellipse cx="0" cy="6" rx="35" ry="29" fill="#FF6347" stroke="#DC143C" stroke-width="3"/>
        <!-- Eyes on stalks -->
        <circle cx="-15" cy="-12" r="10" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
        <rect x="-17" y="-12" width="4" height="15" fill="#FF6347" stroke="#CD5C5C" stroke-width="2"/>
        <circle cx="15" cy="-12" r="10" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="3"/>
        <rect x="13" y="-12" width="4" height="15" fill="#FF6347" stroke="#CD5C5C" stroke-width="2"/>
        <!-- Left claw -->
        <ellipse cx="-38" cy="5" rx="15" ry="22" fill="#FF6347" stroke="#CD5C5C" stroke-width="4"/>
        <path d="M -48,5 L -55,0 L -55,10 Z"
              fill="#CD5C5C" stroke="#8B0000" stroke-width="3"/>
        <path d="M -48,5 L -55,-8 L -50,0 Z"
              fill="#DC143C" stroke="#8B0000" stroke-width="3"/>
        <!-- Right claw -->
        <ellipse cx="38" cy="5" rx="15" ry="22" fill="#FF6347" stroke="#CD5C5C" stroke-width="4"/>
        <path d="M 48,5 L 55,0 L 55,10 Z"
              fill="#CD5C5C" stroke="#8B0000" stroke-width="3"/>
        <path d="M 48,5 L 55,-8 L 50,0 Z"
              fill="#DC143C" stroke="#8B0000" stroke-width="3"/>
        <!-- Legs -->
        <rect x="-45" y="25" width="10" height="4" fill="#CD5C5C" stroke="#8B0000" stroke-width="2"/>
        <rect x="-40" y="32" width="10" height="4" fill="#CD5C5C" stroke="#8B0000" stroke-width="2"/>
        <rect x="-35" y="39" width="10" height="4" fill="#CD5C5C" stroke="#8B0000" stroke-width="2"/>
        <rect x="35" y="25" width="10" height="4" fill="#CD5C5C" stroke="#8B0000" stroke-width="2"/>
        <rect x="30" y="32" width="10" height="4" fill="#CD5C5C" stroke="#8B0000" stroke-width="2"/>
        <rect x="25" y="39" width="10" height="4" fill="#CD5C5C" stroke="#8B0000" stroke-width="2"/>
        <!-- Shell pattern -->
        <ellipse cx="0" cy="10" rx="18" ry="15" fill="#CD5C5C" opacity="0.4"/>
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
      <circle cx="100" cy="100" r="95" fill="#654321" stroke="#4d3319" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Deer - majestic design -->
        <!-- Body -->
        <ellipse cx="8" cy="15" rx="36" ry="42" fill="#A0522D" stroke="#654321" stroke-width="4"/>
        <ellipse cx="6" cy="13" rx="33" ry="39" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- Head -->
        <ellipse cx="-12" cy="-20" rx="28" ry="25" fill="#8B4513" stroke="#654321" stroke-width="4"/>
        <ellipse cx="-13" cy="-21" rx="25" ry="22" fill="#A0522D" stroke="#654321" stroke-width="3"/>
        <!-- Antlers - bold and distinctive -->
        <!-- Left antler -->
        <path d="M -30,-35 L -35,-50 L -32,-48 M -35,-50 L -40,-55 M -35,-50 L -32,-56"
              fill="none" stroke="#654321" stroke-width="4" stroke-linecap="round"/>
        <path d="M -25,-40 L -28,-52 L -25,-50 M -28,-52 L -32,-58 M -28,-52 L -25,-57"
              fill="none" stroke="#654321" stroke-width="4" stroke-linecap="round"/>
        <!-- Right antler -->
        <path d="M 5,-35 L 0,-50 L 3,-48 M 0,-50 L -5,-55 M 0,-50 L 3,-56"
              fill="none" stroke="#654321" stroke-width="4" stroke-linecap="round"/>
        <path d="M 10,-40 L 8,-52 L 11,-50 M 8,-52 L 4,-58 M 8,-52 L 11,-57"
              fill="none" stroke="#654321" stroke-width="4" stroke-linecap="round"/>
        <!-- Ears -->
        <path d="M -32,-28 Q -38,-35 -35,-25"
              fill="#A0522D" stroke="#654321" stroke-width="3"/>
        <path d="M 8,-32 Q 14,-38 11,-28"
              fill="#A0522D" stroke="#654321" stroke-width="3"/>
        <!-- Eye -->
        <circle cx="-16" cy="-23" r="5" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <!-- Nose -->
        <ellipse cx="-18" cy="-10" rx="4" ry="5" fill="#654321"/>
        <!-- Legs -->
        <rect x="-8" y="50" width="8" height="30" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <rect x="10" y="50" width="8" height="30" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <!-- White chest spot -->
        <ellipse cx="-8" cy="5" rx="10" ry="12" fill="#F5DEB3" opacity="0.6"/>
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
