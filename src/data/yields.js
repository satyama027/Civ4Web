export const yields = [
  {
    id: 'food',
    name: 'Food',
    icon: '🌾',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#2E7D32" stroke="#1B5E20" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Wheat stalk - bold and simple -->
        <rect x="-7" y="-70" width="14" height="125" rx="4" fill="#8D6E63" stroke="#5D4037" stroke-width="4"/>
        <!-- Large grain bundles - very visible -->
        <ellipse cx="-22" cy="-55" rx="11" ry="18" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="-18" cy="-35" rx="10" ry="16" fill="#FFEB3B" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="-14" cy="-15" rx="9" ry="14" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="0" cy="-62" rx="11" ry="19" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="0" cy="-40" rx="10" ry="17" fill="#FFEB3B" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="0" cy="-20" rx="9" ry="15" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="22" cy="-55" rx="11" ry="18" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="18" cy="-35" rx="10" ry="16" fill="#FFEB3B" stroke="#F57F17" stroke-width="3"/>
        <ellipse cx="14" cy="-15" rx="9" ry="14" fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#6D4C41" stroke="#4E342E" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Hammer handle - thick and prominent -->
        <rect x="-12" y="10" width="24" height="65" rx="4" fill="#8D6E63" stroke="#5D4037" stroke-width="4"/>
        <ellipse cx="0" cy="72" rx="14" ry="8" fill="#6D4C41" stroke="#5D4037" stroke-width="3"/>
        <!-- Hammer head - bold rectangular design -->
        <rect x="-50" y="-18" width="100" height="36" rx="4" fill="#757575" stroke="#424242" stroke-width="4"/>
        <!-- Top highlight on hammer -->
        <rect x="-50" y="-18" width="100" height="12" rx="4" fill="#9E9E9E" stroke="#757575" stroke-width="2"/>
        <!-- Hammer striking face -->
        <rect x="35" y="-15" width="15" height="30" fill="#616161" stroke="#424242" stroke-width="3"/>
        <!-- Hammer claw -->
        <path d="M -50,-15 L -62,-8 L -62,8 L -50,15 Z" fill="#616161" stroke="#424242" stroke-width="3"/>
        <path d="M -62,-8 L -70,-3 L -70,3 L -62,8 Z" fill="#757575" stroke="#424242" stroke-width="3"/>
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
      <circle cx="100" cy="100" r="95" fill="#F57C00" stroke="#E65100" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Single large gold coin - commerce symbol -->
        <ellipse cx="0" cy="0" rx="65" ry="58" fill="#FDD835" stroke="#F57F17" stroke-width="5"/>
        <ellipse cx="0" cy="0" rx="58" ry="51" fill="#FFEB3B" stroke="#F9A825" stroke-width="3"/>
        <!-- Inner decorative rings -->
        <ellipse cx="0" cy="0" rx="48" ry="42" fill="none" stroke="#FDD835" stroke-width="4"/>
        <ellipse cx="0" cy="0" rx="38" ry="33" fill="none" stroke="#F9A825" stroke-width="3"/>
        <!-- Corner shine marks -->
        <circle cx="-35" cy="-28" r="8" fill="#FFF9C4" opacity="0.8"/>
        <circle cx="38" cy="-25" r="6" fill="#FFF9C4" opacity="0.6"/>
      </g>
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
      <circle cx="100" cy="100" r="95" fill="#1565C0" stroke="#0D47A1" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Erlenmeyer flask - science beaker -->
        <!-- Flask neck -->
        <rect x="-18" y="-65" width="36" height="35" fill="none" stroke="#64B5F6" stroke-width="4"/>
        <ellipse cx="0" cy="-65" rx="18" ry="6" fill="#E1F5FE" stroke="#64B5F6" stroke-width="3"/>
        <!-- Flask body -->
        <path d="M -18,-30 L -45,35 Q -48,45 -40,50 L 40,50 Q 48,45 45,35 L 18,-30 Z"
              fill="#81D4FA" fill-opacity="0.7" stroke="#64B5F6" stroke-width="4"/>
        <!-- Liquid inside -->
        <ellipse cx="0" cy="45" rx="42" ry="10" fill="#42A5F5" stroke="#1976D2" stroke-width="3"/>
        <path d="M -42,45 L -35,15 L 35,15 L 42,45 Z" fill="#42A5F5" stroke="none"/>
        <!-- Flask base rim -->
        <ellipse cx="0" cy="50" rx="40" ry="8" fill="#90CAF9" stroke="#1976D2" stroke-width="3"/>
        <!-- Bubbles for effect -->
        <circle cx="-15" cy="25" r="5" fill="#E1F5FE" opacity="0.8"/>
        <circle cx="10" cy="30" r="6" fill="#E1F5FE" opacity="0.8"/>
        <circle cx="0" cy="15" r="4" fill="#E1F5FE" opacity="0.8"/>
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
      <circle cx="100" cy="100" r="95" fill="#F9A825" stroke="#F57F17" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Stack of coins - treasury -->
        <!-- Bottom coin -->
        <ellipse cx="0" cy="35" rx="45" ry="15" fill="#FBC02D" stroke="#F57F17" stroke-width="4"/>
        <ellipse cx="0" cy="35" rx="38" ry="12" fill="#FDD835" stroke="#F9A825" stroke-width="2"/>
        <!-- Middle coin -->
        <ellipse cx="0" cy="15" rx="45" ry="15" fill="#FBC02D" stroke="#F57F17" stroke-width="4"/>
        <ellipse cx="0" cy="15" rx="38" ry="12" fill="#FFEB3B" stroke="#F9A825" stroke-width="2"/>
        <!-- Top coin -->
        <ellipse cx="0" cy="-5" rx="45" ry="15" fill="#FBC02D" stroke="#F57F17" stroke-width="4"/>
        <ellipse cx="0" cy="-5" rx="38" ry="12" fill="#FDD835" stroke="#F9A825" stroke-width="2"/>
        <!-- Coin sides (stack effect) -->
        <rect x="-45" y="15" width="90" height="20" fill="#F9A825" stroke="none"/>
        <rect x="-45" y="35" width="90" height="0" fill="#F57F17" stroke="none"/>
        <!-- Highlight top coin -->
        <ellipse cx="0" cy="-5" rx="25" ry="7" fill="#FFF9C4" opacity="0.5"/>
      </g>
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
      <circle cx="100" cy="100" r="95" fill="#6A1B9A" stroke="#4A148C" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Comedy mask (left - happy) -->
        <ellipse cx="-30" cy="0" rx="35" ry="42" fill="#E1BEE7" stroke="#7B1FA2" stroke-width="4"/>
        <circle cx="-40" cy="-8" r="7" fill="#4A148C"/>
        <circle cx="-20" cy="-8" r="7" fill="#4A148C"/>
        <path d="M -45,12 Q -30,25 -15,12" fill="none" stroke="#4A148C" stroke-width="5" stroke-linecap="round"/>
        <!-- Tragedy mask (right - sad) -->
        <ellipse cx="30" cy="0" rx="35" ry="42" fill="#CE93D8" stroke="#7B1FA2" stroke-width="4"/>
        <circle cx="20" cy="-8" r="7" fill="#4A148C"/>
        <circle cx="40" cy="-8" r="7" fill="#4A148C"/>
        <path d="M 15,20 Q 30,8 45,20" fill="none" stroke="#4A148C" stroke-width="5" stroke-linecap="round"/>
        <!-- Mask ribbons -->
        <rect x="-8" y="35" width="16" height="30" rx="3" fill="#9C27B0" stroke="#6A1B9A" stroke-width="3"/>
        <ellipse cx="0" cy="65" rx="10" ry="6" fill="#7B1FA2" stroke="#4A148C" stroke-width="2"/>
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
      <circle cx="100" cy="100" r="95" fill="#263238" stroke="#000000" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Magnifying glass - spy tool -->
        <!-- Handle -->
        <rect x="-48" y="25" width="20" height="50" rx="4"
              fill="#455A64" stroke="#263238" stroke-width="4"
              transform="rotate(-45 -38 50)"/>
        <!-- Glass rim -->
        <circle cx="15" cy="5" r="42" fill="none" stroke="#607D8B" stroke-width="6"/>
        <!-- Glass surface -->
        <circle cx="15" cy="5" r="36" fill="#B0BEC5" fill-opacity="0.3" stroke="#78909C" stroke-width="3"/>
        <!-- Lens glare -->
        <circle cx="5" cy="-8" r="15" fill="#ECEFF1" opacity="0.6"/>
        <circle cx="30" cy="15" r="8" fill="#ECEFF1" opacity="0.4"/>
        <!-- Fingerprint/target in lens -->
        <circle cx="15" cy="5" r="18" fill="none" stroke="#37474F" stroke-width="2" opacity="0.6"/>
        <circle cx="15" cy="5" r="12" fill="none" stroke="#37474F" stroke-width="2" opacity="0.6"/>
        <circle cx="15" cy="5" r="6" fill="none" stroke="#37474F" stroke-width="2" opacity="0.6"/>
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
      <circle cx="100" cy="100" r="95" fill="#C62828" stroke="#B71C1C" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- White circle background -->
        <circle cx="0" cy="0" r="60" fill="#FFFFFF" stroke="#C62828" stroke-width="5"/>
        <!-- Red cross - medical symbol -->
        <!-- Vertical bar -->
        <rect x="-15" y="-50" width="30" height="100" rx="5" fill="#D32F2F" stroke="#B71C1C" stroke-width="4"/>
        <!-- Horizontal bar -->
        <rect x="-50" y="-15" width="100" height="30" rx="5" fill="#D32F2F" stroke="#B71C1C" stroke-width="4"/>
        <!-- Highlight on cross -->
        <rect x="-12" y="-47" width="10" height="94" rx="3" fill="#EF5350" opacity="0.6"/>
        <rect x="-47" y="-12" width="94" height="10" rx="3" fill="#EF5350" opacity="0.6"/>
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
      <circle cx="100" cy="100" r="95" fill="#F9A825" stroke="#F57F17" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Smiley face - bold and clear -->
        <circle cx="0" cy="0" r="65" fill="#FDD835" stroke="#F57F17" stroke-width="5"/>
        <!-- Eyes -->
        <circle cx="-25" cy="-12" r="11" fill="#3E2723"/>
        <circle cx="25" cy="-12" r="11" fill="#3E2723"/>
        <!-- Eye highlights -->
        <circle cx="-22" cy="-16" r="5" fill="#5D4037"/>
        <circle cx="28" cy="-16" r="5" fill="#5D4037"/>
        <!-- Big smile -->
        <path d="M -35,15 Q -25,45 0,48 Q 25,45 35,15"
              fill="#D84315" stroke="#3E2723" stroke-width="5" stroke-linecap="round"/>
        <path d="M -35,15 Q -25,40 0,42 Q 25,40 35,15"
              fill="#FF6F00" stroke="none"/>
        <!-- Cheek blush -->
        <ellipse cx="-45" cy="10" rx="12" ry="8" fill="#FF6F00" opacity="0.4"/>
        <ellipse cx="45" cy="10" rx="12" ry="8" fill="#FF6F00" opacity="0.4"/>
      </g>
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
      <circle cx="100" cy="100" r="95" fill="#6A1B9A" stroke="#4A148C" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Radiant star - representing greatness -->
        <!-- Outer glow rays -->
        <circle cx="0" cy="0" r="70" fill="#AB47BC" opacity="0.3"/>
        <circle cx="0" cy="0" r="55" fill="#BA68C8" opacity="0.4"/>
        <!-- Star shape -->
        <polygon points="0,-50 15,-15 52,-15 23,8 35,45 0,22 -35,45 -23,8 -52,-15 -15,-15"
                 fill="#FDD835" stroke="#F57F17" stroke-width="4"/>
        <polygon points="0,-50 15,-15 52,-15 23,8 35,45 0,22 -35,45 -23,8 -52,-15 -15,-15"
                 fill="#FFEB3B" opacity="0.6"/>
        <!-- Center circle -->
        <circle cx="0" cy="0" r="20" fill="#FFFFFF" stroke="#F57F17" stroke-width="4"/>
        <circle cx="0" cy="0" r="15" fill="#FDD835" stroke="#F9A825" stroke-width="2"/>
        <!-- Light rays -->
        <line x1="0" y1="-75" x2="0" y2="-85" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
        <line x1="53" y1="-53" x2="60" y2="-60" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
        <line x1="75" y1="0" x2="85" y2="0" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
        <line x1="53" y1="53" x2="60" y2="60" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
        <line x1="-53" y1="-53" x2="-60" y2="-60" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
        <line x1="-75" y1="0" x2="-85" y2="0" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
        <line x1="-53" y1="53" x2="-60" y2="60" stroke="#FDD835" stroke-width="4" stroke-linecap="round"/>
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
      <circle cx="100" cy="100" r="95" fill="#E65100" stroke="#BF360C" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Military badge/medal -->
        <!-- Shield background -->
        <path d="M 0,-60 L 45,-45 L 50,0 L 45,50 L 0,65 L -45,50 L -50,0 L -45,-45 Z"
              fill="#1565C0" stroke="#0D47A1" stroke-width="5"/>
        <path d="M 0,-55 L 40,-42 L 45,0 L 40,45 L 0,58 L -40,45 L -45,0 L -40,-42 Z"
              fill="#1976D2" stroke="#0D47A1" stroke-width="2"/>
        <!-- Star on badge -->
        <polygon points="0,-35 8,-12 33,-12 13,2 21,25 0,10 -21,25 -13,2 -33,-12 -8,-12"
                 fill="#FDD835" stroke="#F57F17" stroke-width="3"/>
        <!-- Chevron stripes (rank) -->
        <path d="M -25,15 L 0,0 L 25,15" fill="none" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
        <path d="M -25,28 L 0,13 L 25,28" fill="none" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
        <path d="M -25,41 L 0,26 L 25,41" fill="none" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
        <!-- Ribbon -->
        <rect x="-10" y="-75" width="20" height="20" fill="#C62828" stroke="#B71C1C" stroke-width="3"/>
        <polygon points="-10,-55 -10,-40 -15,-45 -10,-55" fill="#C62828" stroke="#B71C1C" stroke-width="2"/>
        <polygon points="10,-55 10,-40 15,-45 10,-55" fill="#C62828" stroke="#B71C1C" stroke-width="2"/>
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
