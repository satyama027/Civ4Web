export const yields = [
  {
    id: 'food',
    name: 'Food',
    icon: '🌾',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#90EE90" stroke="#2d5016" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -5,-60 Q -8,-30 -10,0 L -8,50 Q -8,60 0,60 Q 8,60 8,50 L 10,0 Q 8,-30 5,-60" fill="#8B4513" stroke="#2d5016" stroke-width="2"/>
        <ellipse cx="-15" cy="-65" rx="6" ry="12" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="-12" cy="-55" rx="5" ry="11" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="-9" cy="-45" rx="5" ry="10" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="15" cy="-65" rx="6" ry="12" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="12" cy="-55" rx="5" ry="11" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="9" cy="-45" rx="5" ry="10" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="0" cy="-70" rx="6" ry="13" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
        <ellipse cx="0" cy="-58" rx="5" ry="11" fill="#FFD700" stroke="#2d5016" stroke-width="1.5"/>
      </g>
    </svg>`,
    description: 'Food determines population growth in your cities. Each citizen consumes 2 food per turn. Surplus food is stored and when the storage fills up, your city grows by one population point.',
    sources: [
      'Base terrain yields (Grassland provides 2 food)',
      'Bonus resources (Wheat, Corn, Cow, Pig, Fish, etc.)',
      'Improvements (Farms provide +1 food)',
      'Buildings (Granary stores food, Supermarket increases farm yields)'
    ],
    mechanics: [
      'Each citizen consumes 2 food per turn',
      'Surplus food accumulates in city storage',
      'City grows when storage reaches required amount',
      'Granary keeps 50% of food after growth',
      'Negative food causes starvation and population loss'
    ]
  },
  {
    id: 'production',
    name: 'Production',
    icon: '🔨',
    color: '#CD853F',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#CD853F" stroke="#8B4513" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <rect x="-8" y="20" width="16" height="45" rx="2" fill="#654321" stroke="#2d1f0d" stroke-width="2"/>
        <path d="M -35,-30 L -10,-5 L -10,15 L -45,15 Z" fill="#A0A0A0" stroke="#2d2d2d" stroke-width="2"/>
        <path d="M -10,-5 L 40,-5 L 40,15 L -10,15 Z" fill="#C0C0C0" stroke="#2d2d2d" stroke-width="2"/>
        <ellipse cx="15" cy="5" rx="25" ry="12" fill="#E8E8E8" stroke="#2d2d2d" stroke-width="1.5"/>
      </g>
    </svg>`,
    description: 'Production (hammers) is used to build units, buildings, and wonders. The more production your city generates, the faster it can complete construction projects.',
    sources: [
      'Base terrain yields (Plains and Hills provide production)',
      'Strategic resources (Iron, Copper, Stone, Marble)',
      'Improvements (Mines, Lumbermills, Workshops)',
      'Buildings (Forge +25%, Factory +25%, Power Plants)'
    ],
    mechanics: [
      'Accumulated each turn toward current production',
      'Overflow carries to next item when project completes',
      'Can be multiplied by buildings (+25%, +50%, etc.)',
      'Can be converted from population (slavery, drafting)',
      'Rushable with gold (Universal Suffrage civic)'
    ]
  },
  {
    id: 'commerce',
    name: 'Commerce',
    icon: '💰',
    color: '#FFD700',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
      <circle cx="100" cy="100" r="45" fill="#FFA500" stroke="#B8860B" stroke-width="3"/>
      <circle cx="100" cy="100" r="38" fill="#FFD700" stroke="#B8860B" stroke-width="2"/>
      <text x="100" y="115" font-family="serif" font-size="50" font-weight="bold" fill="#8B4513" text-anchor="middle">$</text>
    </svg>`,
    description: 'Commerce is the raw economic output that gets distributed into Science, Gold, Culture, and Espionage based on your slider settings. Rivers, coastlines, and trade routes are major commerce sources.',
    sources: [
      'Base terrain yields (Rivers +1 commerce on adjacent tiles)',
      'Luxury and bonus resources',
      'Improvements (Cottages grow into Towns for up to 7 commerce)',
      'Buildings (Markets, Banks, Libraries)',
      'Trade routes (domestic and foreign)'
    ],
    mechanics: [
      'Split by sliders into Science/Gold/Culture/Espionage',
      'River tiles get +1 commerce',
      'Financial trait gives +1 commerce on tiles with 2+ commerce',
      'Multiplied by buildings before being distributed',
      'Trade routes add directly to city commerce'
    ]
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    color: '#4169E1',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#4169E1" stroke="#1E3A8A" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <ellipse cx="0" cy="35" rx="25" ry="8" fill="#87CEEB" stroke="#1E3A8A" stroke-width="2"/>
        <path d="M -25,35 L -18,-10 L 18,-10 L 25,35 Z" fill="none" stroke="#1E3A8A" stroke-width="2.5" fill="#B0E0E6" opacity="0.7"/>
        <ellipse cx="0" cy="-10" rx="18" ry="6" fill="#87CEEB" stroke="#1E3A8A" stroke-width="2"/>
        <rect x="-3" y="-40" width="6" height="30" fill="#696969" stroke="#2d2d2d" stroke-width="1.5"/>
        <circle cx="0" cy="-40" r="8" fill="#FFFFFF" stroke="#2d2d2d" stroke-width="1.5"/>
      </g>
    </svg>`,
    description: 'Science (beakers) is generated from commerce and used to research technologies. Scientists specialists and certain buildings provide additional beakers.',
    sources: [
      'Percentage of commerce (set by science slider)',
      'Scientists specialists (+3 beakers each)',
      'Buildings (Library +25%, University +25%, Observatory +25%)',
      'Great Scientists can provide research bulbs'
    ],
    mechanics: [
      'Accumulates toward current technology research',
      'Base beakers = Commerce × Science% slider',
      'Modified by buildings (multiplicative)',
      'Prerequisite bonus: Discounts based on other civs\' research',
      'Research agreements can be made with other civs'
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    icon: '💵',
    color: '#FFD700',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
      <circle cx="85" cy="85" r="28" fill="#FFA500" stroke="#B8860B" stroke-width="2.5"/>
      <circle cx="115" cy="95" r="28" fill="#FFD700" stroke="#B8860B" stroke-width="2.5"/>
      <circle cx="100" cy="110" r="28" fill="#FFEA00" stroke="#B8860B" stroke-width="2.5"/>
      <text x="100" y="78" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#8B4513" text-anchor="middle">GOLD</text>
    </svg>`,
    description: 'Gold is your civilization\'s treasury. It comes from commerce and pays for unit/building maintenance, upgrades, and can rush production. Surplus gold accumulates in your treasury.',
    sources: [
      'Percentage of commerce (remainder after Science/Culture/Espionage)',
      'Merchants specialists (+3 gold each)',
      'Buildings (Market +25%, Bank +50%, Grocer +25%)',
      'Great Merchants can conduct trade missions',
      'Selling resources to other civilizations'
    ],
    mechanics: [
      'Income = Commerce × Gold% + Specialists + Trade deals',
      'Expenses = Unit maintenance + Building/civic upkeep + Inflation',
      'Net income added to treasury each turn',
      'Can rush production (with Universal Suffrage civic)',
      'Can upgrade units, make deals, pay tribute',
      'Deficit causes science/culture reduction'
    ]
  },
  {
    id: 'culture',
    name: 'Culture',
    icon: '🎭',
    color: '#9370DB',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#9370DB" stroke="#663399" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <path d="M -35,-25 Q -35,-5 -25,10 L -35,35 Q -40,40 -30,40 Q -20,40 -15,35 L -5,10 Q -5,-10 -20,-25 Z" fill="#FF69B4" stroke="#4B0082" stroke-width="2"/>
        <circle cx="-20" cy="-15" r="5" fill="#2d2d2d"/>
        <path d="M -25,5 Q -20,12 -15,5" fill="none" stroke="#8B0000" stroke-width="2"/>
        <path d="M 35,-25 Q 35,-5 25,10 L 35,35 Q 40,40 30,40 Q 20,40 15,35 L 5,10 Q 5,-10 20,-25 Z" fill="#87CEEB" stroke="#4B0082" stroke-width="2"/>
        <circle cx="20" cy="-15" r="5" fill="#2d2d2d"/>
        <path d="M 15,5 Q 20,0 25,5" fill="none" stroke="#8B0000" stroke-width="2"/>
      </g>
    </svg>`,
    description: 'Culture expands your city borders, enables cultural victories, and creates "cultural pressure" against rival cities. Wonders, buildings, and Great Artists generate culture.',
    sources: [
      'Percentage of commerce (set by culture slider)',
      'Artists specialists (+4 culture each)',
      'Buildings (Monument +1, Library +2, Theatre +3, etc.)',
      'Wonders (provide large culture bonuses)',
      'Great Artists can create Great Works (+4000 culture)'
    ],
    mechanics: [
      'Accumulates permanently in each city',
      'Expands city borders at certain thresholds (10, 100, 500, 5000 culture)',
      'Cultural victories require 3 cities with Legendary culture (50,000+)',
      'Creates cultural pressure on nearby rival cities',
      'Free religion increases culture from religious buildings'
    ]
  },
  {
    id: 'espionage',
    name: 'Espionage',
    icon: '🕵️',
    color: '#2F4F4F',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#2F4F4F" stroke="#1a1a1a" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <circle cx="25" cy="0" r="35" fill="none" stroke="#B8B8B8" stroke-width="4"/>
        <rect x="-30" y="-5" width="35" height="10" rx="2" fill="#696969" stroke="#2d2d2d" stroke-width="2" transform="rotate(-45 -12 0)"/>
        <circle cx="25" cy="0" r="22" fill="rgba(255, 255, 255, 0.2)"/>
        <path d="M 18,-15 Q 25,-20 32,-15" fill="none" stroke="#B8B8B8" stroke-width="2"/>
        <path d="M 18,15 Q 25,20 32,15" fill="none" stroke="#B8B8B8" stroke-width="2"/>
        <circle cx="-40" cy="-40" r="12" fill="#000000" stroke="#696969" stroke-width="2"/>
        <ellipse cx="-40" cy="-40" rx="6" ry="8" fill="#FFD700" stroke="#2d2d2d" stroke-width="1"/>
      </g>
    </svg>`,
    description: 'Espionage points (EP) are used for spy missions against rival civilizations. Accumulate EP against a target to unlock vision and enable sabotage missions. Introduced in Beyond the Sword.',
    sources: [
      'Percentage of commerce (set by espionage slider)',
      'Spy specialists (+3 EP each)',
      'Buildings (Courthouse +2, Jail +4, Security Bureau +8)',
      'Castles and Intelligence agencies',
      'Great Spies can conduct infiltration missions'
    ],
    mechanics: [
      'Allocated to specific rival civilizations',
      'Unlocks city visibility at certain thresholds',
      'Enables spy missions (steal tech, sabotage, poison, etc.)',
      'Defensive EP reduces enemy spy mission success',
      'Missions cost EP based on difficulty',
      'Scotland Yard wonder provides +100% EP'
    ]
  },
  {
    id: 'health',
    name: 'Health',
    icon: '❤️',
    color: '#FF6B6B',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FF6B6B" stroke="#C41E3A" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="50" fill="#FFFFFF" stroke="#C41E3A" stroke-width="3"/>
        <rect x="-10" y="-35" width="20" height="70" rx="2" fill="#C41E3A"/>
        <rect x="-35" y="-10" width="70" height="20" rx="2" fill="#C41E3A"/>
      </g>
    </svg>`,
    description: 'Health determines how large your city can grow. Unhealthy cities (red cross) grow slowly or not at all, and suffer production penalties. Health comes from resources and buildings.',
    sources: [
      'Fresh water (if city is on river or lake)',
      'Bonus food resources (Wheat, Corn, Rice, etc.)',
      'Buildings (Aqueduct +2, Hospital +3, Recycling Center +3)',
      'Civics (Environmentalism provides health)'
    ],
    mechanics: [
      'Healthy cities (Health > Unhealthiness): No penalty',
      'Unhealthy cities (Health < Unhealthiness): Lose food equal to difference',
      'Severe unhealthiness can cause starvation',
      'Base unhealthiness from population size',
      'Buildings cause unhealthiness (Forge +1, Coal Plant +2)',
      'Can limit city growth if too unhealthy'
    ]
  },
  {
    id: 'happiness',
    name: 'Happiness',
    icon: '😊',
    color: '#FFD93D',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFD93D" stroke="#FFA500" stroke-width="3"/>
      <circle cx="100" cy="100" r="70" fill="#FFEB3B" stroke="#F57C00" stroke-width="2"/>
      <circle cx="75" cy="85" r="10" fill="#2d2d2d"/>
      <circle cx="125" cy="85" r="10" fill="#2d2d2d"/>
      <path d="M 70,110 Q 100,135 130,110" fill="none" stroke="#2d2d2d" stroke-width="5" stroke-linecap="round"/>
      <path d="M 65,75 Q 75,70 85,75" fill="none" stroke="#2d2d2d" stroke-width="3" stroke-linecap="round"/>
      <path d="M 115,75 Q 125,70 135,75" fill="none" stroke="#2d2d2d" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    description: 'Happiness determines citizen contentment. Unhappy citizens (red faces) don\'t work and can cause disorder. Happy citizens can work tiles and be assigned as specialists.',
    sources: [
      'Luxury resources (Gold, Silver, Gems, Furs, etc.)',
      'Buildings (Colosseum +1, Theatre +1, Broadcast Tower +3)',
      'Civics (Hereditary Rule, Representation)',
      'Wonders (Hanging Gardens +1 in all cities)',
      'Leader traits (Charismatic gives +1)'
    ],
    mechanics: [
      'Each citizen requires 1 happiness',
      'Happy citizens can work tiles/be specialists',
      'Unhappy citizens don\'t work (waste)',
      'Extreme unhappiness causes disorder (no production)',
      'War weariness causes unhappiness',
      'Draft/whip anger causes temporary unhappiness',
      'We Love the King Day when happiness > population'
    ]
  },
  {
    id: 'great_people_points',
    name: 'Great People Points',
    icon: '🎓',
    color: '#9B59B6',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#9B59B6" stroke="#663399" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <polygon points="0,-45 -50,-20 -50,-10 0,15 50,-10 50,-20" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="2"/>
        <polygon points="0,-45 -50,-20 0,5 50,-20" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
        <rect x="-5" y="-45" width="10" height="50" fill="#8B4513" stroke="#654321" stroke-width="2"/>
        <rect x="-15" y="-50" width="30" height="8" rx="2" fill="#2d2d2d" stroke="#1a1a1a" stroke-width="1.5"/>
        <polygon points="0,-48 -10,-52 10,-52" fill="#FFD700"/>
        <circle cx="-35" cy="20" r="8" fill="#FFFFFF" stroke="#663399" stroke-width="2"/>
        <circle cx="-35" cy="20" r="4" fill="#FFD700"/>
      </g>
    </svg>`,
    description: 'Great People Points (GPP) accumulate to generate Great People - special units with powerful one-time abilities. Different specialists and buildings generate different types of GPP.',
    sources: [
      'Specialists (Scientists, Merchants, Engineers, Artists, Priests, Spies)',
      'Wonders (Parthenon +50% GPP, National Epic +100%)',
      'Buildings (certain buildings generate specific GPP types)',
      'Traits (Philosophical doubles GPP generation)'
    ],
    mechanics: [
      'Each city tracks GPP separately by type',
      'GPP required increases with each Great Person born',
      'Formula: (100 + 50 × previous_GP) × (1 + GP_from_this_city)',
      'Great People types: Scientist, Merchant, Engineer, Artist, Prophet, General, Spy',
      'Can settle in city for bonuses or use special ability',
      'Great Generals from combat, others from specialists'
    ]
  },
  {
    id: 'experience',
    name: 'Experience',
    icon: '⭐',
    color: '#FFA500',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FFA500" stroke="#FF8C00" stroke-width="3"/>
      <g transform="translate(100, 100)">
        <circle cx="0" cy="5" r="55" fill="#FFD700" stroke="#DAA520" stroke-width="3"/>
        <polygon points="0,-45 12,-15 45,-15 18,5 30,35 0,15 -30,35 -18,5 -45,-15 -12,-15" fill="#FFEA00" stroke="#FF8C00" stroke-width="2.5"/>
        <circle cx="0" cy="5" r="15" fill="#FF8C00" stroke="#FF6347" stroke-width="2"/>
        <text x="0" y="15" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">XP</text>
      </g>
    </svg>`,
    description: 'Experience points (XP) allow units to gain promotions, making them more powerful in combat. Units gain XP from buildings and combat victories.',
    sources: [
      'Buildings (Barracks +3 XP, Drydock +3 XP naval)',
      'Wonders (West Point +4 XP, Pentagon +2 XP all units)',
      'Combat victories (based on unit strength defeated)',
      'Civics (Theocracy +2 XP for units with state religion)',
      'Traits (Charismatic +1, Aggressive +1 for melee/gunpowder)'
    ],
    mechanics: [
      'New units receive base XP from city buildings',
      'Combat XP = defeated unit strength × combat odds factor',
      'Promotions cost 2, 5, 10, 15, 20, etc. XP',
      'First promotion available at 2 XP',
      'Wounded units heal faster with Medic promotions',
      'Settled Great Generals provide +2 XP to all units',
      'Maximum practical level: 10 promotions (~100 XP)'
    ]
  }
];

export const yieldCategories = {
  primary: ['food', 'production', 'commerce'],
  economic: ['science', 'gold', 'culture', 'espionage'],
  cityManagement: ['health', 'happiness'],
  special: ['great_people_points', 'experience']
};
