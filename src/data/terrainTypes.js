export const terrainTypes = [
  // BASE TERRAINS
  {
    id: 'grassland',
    name: 'Grassland',
    category: 'Base Terrain',
    icon: '🌱',
    color: '#90EE90',
    svgIcon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" fill="#7CCD7C" stroke="#228B22" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Grass tufts - bold and visible -->
        <ellipse cx="-60" cy="-50" rx="30" ry="20" fill="#90EE90" stroke="#228B22" stroke-width="3"/>
        <ellipse cx="45" cy="-45" rx="35" ry="22" fill="#98FB98" stroke="#228B22" stroke-width="3"/>
        <ellipse cx="-40" cy="30" rx="32" ry="24" fill="#8FBC8F" stroke="#228B22" stroke-width="3"/>
        <ellipse cx="50" cy="35" rx="38" ry="26" fill="#90EE90" stroke="#228B22" stroke-width="3"/>
        <ellipse cx="0" cy="-10" rx="35" ry="20" fill="#98FB98" stroke="#228B22" stroke-width="3"/>
        <!-- Grass blades -->
        <path d="M -70,-30 L -70,-55 M -60,-35 L -60,-58 M -50,-32 L -50,-56"
              stroke="#228B22" stroke-width="4" stroke-linecap="round"/>
        <path d="M 35,-25 L 35,-50 M 45,-28 L 45,-52 M 55,-26 L 55,-50"
              stroke="#228B22" stroke-width="4" stroke-linecap="round"/>
        <path d="M -10,15 L -10,-5 M 0,18 L 0,-8 M 10,16 L 10,-6"
              stroke="#228B22" stroke-width="4" stroke-linecap="round"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#DEB887" stroke="#B8860B" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Tall grass/wheat pattern -->
        <path d="M -80,-60 L -80,-80 M -70,-55 L -70,-78 M -60,-58 L -60,-82 M -50,-56 L -50,-80 M -40,-60 L -40,-84"
              stroke="#DAA520" stroke-width="4" stroke-linecap="round"/>
        <path d="M -20,-50 L -20,-72 M -10,-52 L -10,-75 M 0,-50 L 0,-73 M 10,-52 L 10,-76 M 20,-50 L 20,-74"
              stroke="#B8860B" stroke-width="4" stroke-linecap="round"/>
        <path d="M 40,-55 L 40,-78 M 50,-52 L 50,-76 M 60,-54 L 60,-79 M 70,-52 L 70,-77 M 80,-55 L 80,-80"
              stroke="#DAA520" stroke-width="4" stroke-linecap="round"/>
        <path d="M -80,20 L -80,0 M -70,22 L -70,-2 M -60,20 L -60,-1 M -50,22 L -50,-3"
              stroke="#B8860B" stroke-width="4" stroke-linecap="round"/>
        <path d="M -20,25 L -20,3 M -10,27 L -10,2 M 0,25 L 0,3 M 10,27 L 10,2 M 20,25 L 20,3"
              stroke="#DAA520" stroke-width="4" stroke-linecap="round"/>
        <path d="M 40,22 L 40,0 M 50,24 L 50,-2 M 60,22 L 60,-1 M 70,24 L 70,-3 M 80,22 L 80,-1"
              stroke="#B8860B" stroke-width="4" stroke-linecap="round"/>
        <path d="M -70,70 L -70,50 M -60,72 L -60,48 M -50,70 L -50,49 M -40,72 L -40,48"
              stroke="#DAA520" stroke-width="4" stroke-linecap="round"/>
        <path d="M 30,75 L 30,52 M 40,77 L 40,50 M 50,75 L 50,51 M 60,77 L 60,50 M 70,75 L 70,52"
              stroke="#B8860B" stroke-width="4" stroke-linecap="round"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#EDC9AF" stroke="#DEB887" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Sand dunes - wavy pattern -->
        <path d="M -100,50 Q -70,25 -40,45 Q -10,20 20,40 Q 50,15 80,35 Q 110,10 130,30"
              fill="#DEB887" stroke="#D2B48C" stroke-width="4"/>
        <path d="M -100,70 Q -70,50 -40,65 Q -10,45 20,60 Q 50,40 80,55 Q 110,35 130,50"
              fill="#F5DEB3" stroke="#DEB887" stroke-width="4"/>
        <path d="M -90,-20 Q -60,-35 -30,-25 Q 0,-40 30,-30 Q 60,-45 90,-35"
              fill="#DEB887" stroke="#D2B48C" stroke-width="4"/>
        <path d="M -90,0 Q -60,-10 -30,-5 Q 0,-15 30,-10 Q 60,-20 90,-15"
              fill="#F5DEB3" stroke="#DEB887" stroke-width="4"/>
        <!-- Sand texture dots -->
        <circle cx="-50" cy="-15" r="4" fill="#D2B48C" opacity="0.6"/>
        <circle cx="-30" cy="10" r="5" fill="#D2B48C" opacity="0.6"/>
        <circle cx="40" cy="-25" r="4" fill="#D2B48C" opacity="0.6"/>
        <circle cx="60" cy="20" r="5" fill="#D2B48C" opacity="0.6"/>
        <circle cx="-10" cy="-35" r="4" fill="#C19A6B" opacity="0.6"/>
        <circle cx="20" cy="5" r="4" fill="#C19A6B" opacity="0.6"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#D3D3D3" stroke="#B0C4DE" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Snow patches -->
        <ellipse cx="-50" cy="-50" rx="35" ry="22" fill="#E6E6FA" stroke="#B0C4DE" stroke-width="3" opacity="0.8"/>
        <ellipse cx="55" cy="-40" rx="40" ry="25" fill="#F0F8FF" stroke="#B0C4DE" stroke-width="3" opacity="0.8"/>
        <ellipse cx="-35" cy="35" rx="32" ry="20" fill="#E6E6FA" stroke="#B0C4DE" stroke-width="3" opacity="0.8"/>
        <ellipse cx="45" cy="40" rx="38" ry="24" fill="#F0F8FF" stroke="#B0C4DE" stroke-width="3" opacity="0.8"/>
        <ellipse cx="0" cy="-5" rx="30" ry="18" fill="#E6E6FA" stroke="#B0C4DE" stroke-width="3" opacity="0.8"/>
        <!-- Snowflakes -->
        <g opacity="0.7">
          <line x1="-60" y1="-70" x2="-60" y2="-55" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="-67" y1="-62.5" x2="-53" y2="-62.5" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="-65" y1="-67" x2="-55" y2="-58" stroke="#FFFFFF" stroke-width="2"/>
          <line x1="-55" y1="-67" x2="-65" y2="-58" stroke="#FFFFFF" stroke-width="2"/>
        </g>
        <g opacity="0.7">
          <line x1="65" y1="-55" x2="65" y2="-40" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="58" y1="-47.5" x2="72" y2="-47.5" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="60" y1="-52" x2="70" y2="-43" stroke="#FFFFFF" stroke-width="2"/>
          <line x1="70" y1="-52" x2="60" y2="-43" stroke="#FFFFFF" stroke-width="2"/>
        </g>
        <g opacity="0.7">
          <line x1="-25" y1="55" x2="-25" y2="70" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="-32" y1="62.5" x2="-18" y2="62.5" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="-30" y1="58" x2="-20" y2="67" stroke="#FFFFFF" stroke-width="2"/>
          <line x1="-20" y1="58" x2="-30" y2="67" stroke="#FFFFFF" stroke-width="2"/>
        </g>
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
      <rect x="0" y="0" width="200" height="200" fill="#FFFAFA" stroke="#F0F8FF" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Large snowflakes -->
        <g>
          <line x1="-50" y1="-70" x2="-50" y2="-40" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="-65" y1="-55" x2="-35" y2="-55" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="-60" y1="-65" x2="-40" y2="-45" stroke="#E0E0E0" stroke-width="4"/>
          <line x1="-40" y1="-65" x2="-60" y2="-45" stroke="#E0E0E0" stroke-width="4"/>
          <circle cx="-50" cy="-55" r="8" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="3"/>
        </g>
        <g>
          <line x1="60" y1="-50" x2="60" y2="-20" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="45" y1="-35" x2="75" y2="-35" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="50" y1="-45" x2="70" y2="-25" stroke="#E0E0E0" stroke-width="4"/>
          <line x1="70" y1="-45" x2="50" y2="-25" stroke="#E0E0E0" stroke-width="4"/>
          <circle cx="60" cy="-35" r="8" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="3"/>
        </g>
        <g>
          <line x1="-60" y1="55" x2="-60" y2="85" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="-75" y1="70" x2="-45" y2="70" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="-70" y1="60" x2="-50" y2="80" stroke="#E0E0E0" stroke-width="4"/>
          <line x1="-50" y1="60" x2="-70" y2="80" stroke="#E0E0E0" stroke-width="4"/>
          <circle cx="-60" cy="70" r="8" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="3"/>
        </g>
        <g>
          <line x1="50" y1="50" x2="50" y2="80" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="35" y1="65" x2="65" y2="65" stroke="#E0E0E0" stroke-width="5"/>
          <line x1="40" y1="55" x2="60" y2="75" stroke="#E0E0E0" stroke-width="4"/>
          <line x1="60" y1="55" x2="40" y2="75" stroke="#E0E0E0" stroke-width="4"/>
          <circle cx="50" cy="65" r="8" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="3"/>
        </g>
        <!-- Small snow crystals -->
        <circle cx="0" cy="-20" r="6" fill="#F0F8FF" stroke="#D3D3D3" stroke-width="2"/>
        <circle cx="-20" cy="10" r="5" fill="#FFFFFF" stroke="#D3D3D3" stroke-width="2"/>
        <circle cx="20" cy="15" r="6" fill="#F0F8FF" stroke="#D3D3D3" stroke-width="2"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#2F4F2F" stroke="#006400" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Large tree -->
        <rect x="-10" y="30" width="20" height="50" fill="#654321" stroke="#4d3319" stroke-width="4"/>
        <polygon points="0,-60 -40,-20 -28,-20 -45,10 -30,10 -50,40 50,40 30,10 45,10 28,-20 40,-20"
                 fill="#228B22" stroke="#006400" stroke-width="5"/>
        <polygon points="0,-55 -35,-18 -25,-18 -40,8 -27,8 -45,35 45,35 27,8 40,8 25,-18 35,-18"
                 fill="#2E8B57" stroke="#006400" stroke-width="3"/>
        <!-- Side trees -->
        <polygon points="-70,20 -85,35 -55,35" fill="#228B22" stroke="#006400" stroke-width="4"/>
        <rect x="-73" y="35" width="6" height="15" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <polygon points="70,20 55,35 85,35" fill="#2E8B57" stroke="#006400" stroke-width="4"/>
        <rect x="67" y="35" width="6" height="15" fill="#654321" stroke="#4d3319" stroke-width="2"/>
        <!-- Foliage accents -->
        <circle cx="-20" cy="-5" r="10" fill="#3CB371" opacity="0.7"/>
        <circle cx="15" cy="10" r="12" fill="#3CB371" opacity="0.7"/>
        <circle cx="-10" cy="20" r="8" fill="#3CB371" opacity="0.7"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#1a3d1a" stroke="#006400" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Dense jungle foliage -->
        <!-- Main tree trunk -->
        <rect x="-12" y="20" width="24" height="60" fill="#8B4513" stroke="#654321" stroke-width="4"/>
        <!-- Layered jungle canopy -->
        <ellipse cx="-45" cy="-30" rx="28" ry="42" fill="#228B22" stroke="#006400" stroke-width="4"/>
        <ellipse cx="40" cy="-25" rx="30" ry="45" fill="#2E8B57" stroke="#006400" stroke-width="4"/>
        <ellipse cx="-20" cy="-15" rx="32" ry="38" fill="#3CB371" stroke="#006400" stroke-width="4"/>
        <ellipse cx="20" cy="-8" rx="30" ry="40" fill="#228B22" stroke="#006400" stroke-width="4"/>
        <ellipse cx="0" cy="10" rx="35" ry="32" fill="#2E8B57" stroke="#006400" stroke-width="4"/>
        <!-- Additional dense foliage -->
        <circle cx="-60" cy="0" r="20" fill="#228B22" stroke="#006400" stroke-width="3"/>
        <circle cx="55" cy="5" r="22" fill="#3CB371" stroke="#006400" stroke-width="3"/>
        <circle cx="-10" cy="-40" r="18" fill="#2E8B57" stroke="#006400" stroke-width="3"/>
        <circle cx="10" cy="-35" r="16" fill="#228B22" stroke="#006400" stroke-width="3"/>
        <!-- Vines -->
        <path d="M -50,-50 Q -45,-30 -48,-10 Q -52,10 -48,30"
              fill="none" stroke="#006400" stroke-width="4"/>
        <path d="M 45,-45 Q 48,-25 45,-5 Q 42,15 45,35"
              fill="none" stroke="#006400" stroke-width="4"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#6B8E23" stroke="#556B2F" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- River/water -->
        <path d="M -100,40 Q -70,30 -40,40 Q -10,50 20,40 Q 50,30 80,40 Q 110,50 140,40"
              fill="none" stroke="#4682B4" stroke-width="8" opacity="0.8"/>
        <path d="M -100,55 Q -70,48 -40,55 Q -10,62 20,55 Q 50,48 80,55 Q 110,62 140,55"
              fill="none" stroke="#4682B4" stroke-width="6" opacity="0.7"/>
        <!-- Fertile land patches -->
        <ellipse cx="-60" cy="-15" rx="35" ry="22" fill="#9ACD32" stroke="#6B8E23" stroke-width="3" opacity="0.8"/>
        <ellipse cx="50" cy="-20" rx="40" ry="25" fill="#8FBC8F" stroke="#6B8E23" stroke-width="3" opacity="0.8"/>
        <ellipse cx="-20" cy="15" rx="30" ry="18" fill="#90EE90" stroke="#6B8E23" stroke-width="3" opacity="0.8"/>
        <ellipse cx="25" cy="10" rx="32" ry="20" fill="#9ACD32" stroke="#6B8E23" stroke-width="3" opacity="0.8"/>
        <!-- Vegetation -->
        <path d="M -70,-30 L -70,-45 M -65,-32 L -65,-43 M -60,-30 L -60,-44"
              stroke="#228B22" stroke-width="3" stroke-linecap="round"/>
        <path d="M 40,-35 L 40,-50 M 45,-37 L 45,-48 M 50,-35 L 50,-49"
              stroke="#228B22" stroke-width="3" stroke-linecap="round"/>
        <!-- Mud/silt at bottom -->
        <rect x="-100" y="65" width="200" height="25" fill="#DEB887" opacity="0.6"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#F4A460" stroke="#DEB887" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Water pool -->
        <ellipse cx="0" cy="15" rx="65" ry="48" fill="#20B2AA" stroke="#008B8B" stroke-width="5"/>
        <ellipse cx="0" cy="12" rx="58" ry="42" fill="#40E0D0" stroke="#008B8B" stroke-width="3"/>
        <ellipse cx="0" cy="10" rx="48" ry="35" fill="#48D1CC" stroke="#20B2AA" stroke-width="2" opacity="0.7"/>
        <!-- Palm trees -->
        <!-- Left palm -->
        <rect x="-40" y="-20" width="12" height="50" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <ellipse cx="-48" cy="-38" rx="18" ry="28" fill="#228B22" stroke="#006400" stroke-width="3"/>
        <ellipse cx="-26" cy="-42" rx="20" ry="30" fill="#2E8B57" stroke="#006400" stroke-width="3"/>
        <ellipse cx="-38" cy="-52" rx="16" ry="26" fill="#3CB371" stroke="#006400" stroke-width="3"/>
        <ellipse cx="-30" cy="-48" rx="18" ry="28" fill="#228B22" stroke="#006400" stroke-width="3"/>
        <!-- Right palm -->
        <rect x="28" y="-15" width="12" height="45" fill="#8B4513" stroke="#654321" stroke-width="3"/>
        <ellipse cx="20" cy="-35" rx="18" ry="28" fill="#2E8B57" stroke="#006400" stroke-width="3"/>
        <ellipse cx="42" cy="-38" rx="20" ry="30" fill="#228B22" stroke="#006400" stroke-width="3"/>
        <ellipse cx="32" cy="-48" rx="16" ry="26" fill="#3CB371" stroke="#006400" stroke-width="3"/>
        <ellipse cx="38" cy="-44" rx="18" ry="28" fill="#2E8B57" stroke="#006400" stroke-width="3"/>
        <!-- Water reflection -->
        <ellipse cx="-15" cy="15" rx="20" ry="12" fill="#FFFFFF" opacity="0.4"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#A0826D" stroke="#654321" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Rolling hills -->
        <path d="M -100,70 L -70,20 L -40,50 L -10,10 L 20,45 L 50,15 L 80,40 L 100,70 Z"
              fill="#8B7355" stroke="#654321" stroke-width="5"/>
        <path d="M -95,70 L -68,25 L -38,52 L -8,15 L 22,47 L 52,20 L 82,42 L 98,70 Z"
              fill="#A0826D" stroke="#654321" stroke-width="3"/>
        <!-- Hill shading/shadows -->
        <polygon points="-70,20 -60,35 -80,35" fill="#654321" opacity="0.5"/>
        <polygon points="-10,10 0,25 -20,25" fill="#654321" opacity="0.5"/>
        <polygon points="20,45 30,58 10,58" fill="#654321" opacity="0.5"/>
        <polygon points="50,15 60,30 40,30" fill="#654321" opacity="0.5"/>
        <!-- Rocky texture -->
        <polygon points="-50,40 -45,35 -40,40 -42,45" fill="#696969" stroke="#505050" stroke-width="2"/>
        <polygon points="5,20 10,16 15,20 12,25" fill="#696969" stroke="#505050" stroke-width="2"/>
        <polygon points="35,50 40,46 45,50 42,55" fill="#696969" stroke="#505050" stroke-width="2"/>
        <polygon points="65,25 70,21 75,25 72,30" fill="#696969" stroke="#505050" stroke-width="2"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#505050" stroke="#2d2d2d" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Tall mountain peaks -->
        <polygon points="0,-80 -60,70 60,70"
                 fill="#696969" stroke="#2d2d2d" stroke-width="6"/>
        <polygon points="0,-75 -55,65 55,65"
                 fill="#808080" stroke="#2d2d2d" stroke-width="4"/>
        <!-- Mountain face highlight -->
        <polygon points="0,-75 -25,0 25,0"
                 fill="#A9A9A9" stroke="#505050" stroke-width="3"/>
        <!-- Snow cap -->
        <polygon points="0,-75 -20,-40 -10,-40 -15,-25 15,-25 10,-40 20,-40"
                 fill="#FFFFFF" stroke="#E0E0E0" stroke-width="3"/>
        <polygon points="0,-70 -15,-38 15,-38"
                 fill="#F0F8FF" opacity="0.8"/>
        <!-- Side peaks -->
        <polygon points="-70,-20 -85,70 -55,70"
                 fill="#696969" stroke="#2d2d2d" stroke-width="5"/>
        <polygon points="-70,-15 -82,65 -58,65"
                 fill="#808080" stroke="#505050" stroke-width="3"/>
        <polygon points="70,-20 55,70 85,70"
                 fill="#696969" stroke="#2d2d2d" stroke-width="5"/>
        <polygon points="70,-15 58,65 82,65"
                 fill="#808080" stroke="#505050" stroke-width="3"/>
        <!-- Rock shadows -->
        <path d="M -50,60 L -40,35 L -30,55" fill="#404040" opacity="0.6"/>
        <path d="M 30,55 L 40,35 L 50,60" fill="#404040" opacity="0.6"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#4682B4" stroke="#1E90FF" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Ocean waves -->
        <path d="M -100,-30 Q -80,-38 -60,-30 Q -40,-22 -20,-30 Q 0,-38 20,-30 Q 40,-22 60,-30 Q 80,-38 100,-30"
              fill="none" stroke="#87CEEB" stroke-width="6" opacity="0.7"/>
        <path d="M -100,-10 Q -80,-2 -60,-10 Q -40,-18 -20,-10 Q 0,-2 20,-10 Q 40,-18 60,-10 Q 80,-2 100,-10"
              fill="none" stroke="#B0E0E6" stroke-width="6" opacity="0.6"/>
        <path d="M -100,10 Q -80,18 -60,10 Q -40,2 -20,10 Q 0,18 20,10 Q 40,2 60,10 Q 80,18 100,10"
              fill="none" stroke="#87CEEB" stroke-width="6" opacity="0.7"/>
        <path d="M -100,30 Q -80,22 -60,30 Q -40,38 -20,30 Q 0,22 20,30 Q 40,38 60,30 Q 80,22 100,30"
              fill="none" stroke="#B0E0E6" stroke-width="6" opacity="0.6"/>
        <path d="M -100,50 Q -80,58 -60,50 Q -40,42 -20,50 Q 0,58 20,50 Q 40,42 60,50 Q 80,58 100,50"
              fill="none" stroke="#87CEEB" stroke-width="6" opacity="0.7"/>
        <!-- Foam/whitecaps -->
        <circle cx="-70" cy="-45" r="10" fill="#FFFFFF" opacity="0.5"/>
        <circle cx="-40" cy="-40" r="8" fill="#F0F8FF" opacity="0.5"/>
        <circle cx="50" cy="-38" r="9" fill="#FFFFFF" opacity="0.5"/>
        <circle cx="-30" cy="15" r="8" fill="#F0F8FF" opacity="0.5"/>
        <circle cx="30" cy="12" r="10" fill="#FFFFFF" opacity="0.5"/>
        <circle cx="-60" cy="45" r="7" fill="#F0F8FF" opacity="0.5"/>
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
      <rect x="0" y="0" width="200" height="200" fill="#191970" stroke="#000080" stroke-width="5"/>
      <g transform="translate(100, 100)">
        <!-- Deep ocean waves - larger and more dramatic -->
        <path d="M -100,-40 Q -75,-55 -50,-40 Q -25,-25 0,-40 Q 25,-55 50,-40 Q 75,-25 100,-40"
              fill="none" stroke="#4169E1" stroke-width="8" opacity="0.6"/>
        <path d="M -100,-15 Q -75,0 -50,-15 Q -25,-30 0,-15 Q 25,0 50,-15 Q 75,-30 100,-15"
              fill="none" stroke="#4682B4" stroke-width="8" opacity="0.5"/>
        <path d="M -100,10 Q -75,-5 -50,10 Q -25,25 0,10 Q 25,-5 50,10 Q 75,25 100,10"
              fill="none" stroke="#4169E1" stroke-width="8" opacity="0.6"/>
        <path d="M -100,35 Q -75,50 -50,35 Q -25,20 0,35 Q 25,50 50,35 Q 75,20 100,35"
              fill="none" stroke="#4682B4" stroke-width="8" opacity="0.5"/>
        <path d="M -100,60 Q -75,45 -50,60 Q -25,75 0,60 Q 25,45 50,60 Q 75,75 100,60"
              fill="none" stroke="#4169E1" stroke-width="8" opacity="0.6"/>
        <!-- Deep water effects -->
        <circle cx="-60" cy="-55" r="14" fill="#1E90FF" opacity="0.4"/>
        <circle cx="40" cy="-50" r="12" fill="#1E90FF" opacity="0.4"/>
        <circle cx="-35" cy="0" r="13" fill="#1E90FF" opacity="0.4"/>
        <circle cx="55" cy="5" r="11" fill="#1E90FF" opacity="0.4"/>
        <circle cx="-45" cy="65" r="12" fill="#1E90FF" opacity="0.4"/>
        <circle cx="25" cy="70" r="13" fill="#1E90FF" opacity="0.4"/>
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
