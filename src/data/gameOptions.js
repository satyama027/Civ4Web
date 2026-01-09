// Game Setup Options for Civilization IV: Beyond the Sword
// All values sourced from CIV4HandicapInfo.xml and CIV4GameSpeedInfo.xml

export const difficultyLevels = [
  {
    id: 'settler',
    name: 'Settler',
    description: 'For learning the basics',
    // Player bonuses
    playerResearchModifier: 0.60,      // 60% research cost
    playerUnitCostModifier: 0.20,      // 20% unit cost
    playerMaintenanceModifier: 0.45,   // 45% distance maintenance
    playerInflationModifier: 0.60,     // 60% inflation
    playerCivicUpkeep: 0.50,           // 50% civic upkeep
    freeHappiness: 6,
    freeHealth: 4,
    // Starting bonuses
    startingSettlers: 2,
    startingWorkers: 2,
    startingDefenders: 0,
    startingScouts: 0,
    // AI settings
    aiResearchModifier: 1.30,          // 130% research cost for AI
    aiStartingDefenders: 0,
    aiStartingWorkers: 0,
    // Barbarian settings
    barbarianSpawnTurns: 50,
    animalAttackProbability: 0,
    // Combat bonuses
    barbarianCombatBonus: 0.40,        // +40% vs barbarians
    animalCombatBonus: 0.70            // +70% vs animals
  },
  {
    id: 'chieftain',
    name: 'Chieftain',
    description: 'Easy difficulty',
    playerResearchModifier: 0.70,
    playerUnitCostModifier: 0.40,
    playerMaintenanceModifier: 0.55,
    playerInflationModifier: 0.70,
    playerCivicUpkeep: 0.60,
    freeHappiness: 5,
    freeHealth: 3,
    startingSettlers: 1,
    startingWorkers: 1,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 1.20,
    aiStartingDefenders: 0,
    aiStartingWorkers: 0,
    barbarianSpawnTurns: 40,
    animalAttackProbability: 0.25,
    barbarianCombatBonus: 0.30,
    animalCombatBonus: 0.50
  },
  {
    id: 'warlord',
    name: 'Warlord',
    description: 'Below normal difficulty',
    playerResearchModifier: 0.80,
    playerUnitCostModifier: 0.60,
    playerMaintenanceModifier: 0.65,
    playerInflationModifier: 0.80,
    playerCivicUpkeep: 0.70,
    freeHappiness: 5,
    freeHealth: 3,
    startingSettlers: 1,
    startingWorkers: 1,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 1.10,
    aiStartingDefenders: 0,
    aiStartingWorkers: 0,
    barbarianSpawnTurns: 35,
    animalAttackProbability: 0.50,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  },
  {
    id: 'noble',
    name: 'Noble',
    description: 'Fair challenge for all',
    playerResearchModifier: 0.90,
    playerUnitCostModifier: 0.80,
    playerMaintenanceModifier: 0.80,
    playerInflationModifier: 0.90,
    playerCivicUpkeep: 0.85,
    freeHappiness: 4,
    freeHealth: 2,
    startingSettlers: 1,
    startingWorkers: 0,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 1.00,
    aiStartingDefenders: 0,
    aiStartingWorkers: 0,
    barbarianSpawnTurns: 30,
    animalAttackProbability: 0.75,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  },
  {
    id: 'prince',
    name: 'Prince',
    description: 'Standard difficulty - no bonuses',
    playerResearchModifier: 1.00,
    playerUnitCostModifier: 1.00,
    playerMaintenanceModifier: 1.00,
    playerInflationModifier: 1.00,
    playerCivicUpkeep: 1.00,
    freeHappiness: 4,
    freeHealth: 2,
    startingSettlers: 1,
    startingWorkers: 0,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 1.00,
    aiStartingDefenders: 0,
    aiStartingWorkers: 0,
    barbarianSpawnTurns: 25,
    animalAttackProbability: 1.00,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  },
  {
    id: 'monarch',
    name: 'Monarch',
    description: 'AI receives small bonuses',
    playerResearchModifier: 1.00,
    playerUnitCostModifier: 1.00,
    playerMaintenanceModifier: 1.00,
    playerInflationModifier: 1.00,
    playerCivicUpkeep: 1.00,
    freeHappiness: 3,
    freeHealth: 1,
    startingSettlers: 1,
    startingWorkers: 0,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 0.90,
    aiStartingDefenders: 1,
    aiStartingWorkers: 1,
    barbarianSpawnTurns: 20,
    animalAttackProbability: 1.00,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  },
  {
    id: 'emperor',
    name: 'Emperor',
    description: 'AI receives moderate bonuses',
    playerResearchModifier: 1.00,
    playerUnitCostModifier: 1.00,
    playerMaintenanceModifier: 1.00,
    playerInflationModifier: 1.00,
    playerCivicUpkeep: 1.00,
    freeHappiness: 3,
    freeHealth: 1,
    startingSettlers: 1,
    startingWorkers: 0,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 0.85,
    aiStartingDefenders: 2,
    aiStartingWorkers: 1,
    aiProductionModifier: 0.90,
    barbarianSpawnTurns: 15,
    animalAttackProbability: 1.00,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  },
  {
    id: 'immortal',
    name: 'Immortal',
    description: 'AI receives large bonuses',
    playerResearchModifier: 1.00,
    playerUnitCostModifier: 1.00,
    playerMaintenanceModifier: 1.00,
    playerInflationModifier: 1.00,
    playerCivicUpkeep: 1.00,
    freeHappiness: 3,
    freeHealth: 1,
    startingSettlers: 1,
    startingWorkers: 0,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 0.80,
    aiStartingDefenders: 3,
    aiStartingWorkers: 1,
    aiProductionModifier: 0.85,
    barbarianSpawnTurns: 12,
    animalAttackProbability: 1.00,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  },
  {
    id: 'deity',
    name: 'Deity',
    description: 'Ultimate challenge',
    playerResearchModifier: 1.00,
    playerUnitCostModifier: 1.00,
    playerMaintenanceModifier: 1.00,
    playerInflationModifier: 1.00,
    playerCivicUpkeep: 1.00,
    freeHappiness: 3,
    freeHealth: 1,
    startingSettlers: 1,
    startingWorkers: 0,
    startingDefenders: 0,
    startingScouts: 0,
    aiResearchModifier: 0.75,
    aiStartingDefenders: 4,
    aiStartingWorkers: 2,
    aiStartingScouts: 1,
    aiProductionModifier: 0.80,
    aiFreeTechs: ['archery', 'hunting', 'agriculture', 'wheel'],
    barbarianSpawnTurns: 10,
    animalAttackProbability: 1.00,
    barbarianCombatBonus: 0.25,
    animalCombatBonus: 0.40
  }
];

export const mapTypes = [
  {
    id: 'pangaea',
    name: 'Pangaea',
    description: 'One large landmass with all civilizations on the same continent',
    landPercent: 0.58,
    waterPercent: 0.42,
    continents: 1,
    allowSmallIslands: true,
    worldWrap: 'cylindrical',
    startingPositions: 'spread',          // Players spread across the landmass
    continentSeparation: 0,               // No separation (single continent)
    coastalBias: 0.3,                     // 30% chance of coastal starts
    resourceDensity: 1.0,
    features: {
      allowPeninsula: true,
      allowChokepointsMin: 2              // Minimum 2-tile wide connections
    }
  },
  {
    id: 'continents',
    name: 'Continents',
    description: 'Several large landmasses separated by oceans',
    landPercent: 0.40,
    waterPercent: 0.60,
    continents: 2,                        // Default 2, can be 2-6
    continentOptions: [2, 3, 4, 5, 6],
    allowSmallIslands: true,
    worldWrap: 'cylindrical',
    startingPositions: 'by_continent',    // Players grouped by continent
    continentSeparation: 3,               // 3 water tiles between continents
    coastalBias: 0.4,
    resourceDensity: 1.0,
    features: {
      balancedContinentSize: true,
      onePerTeamOption: true              // Option to put each team on own continent
    }
  },
  {
    id: 'archipelago',
    name: 'Archipelago',
    description: 'Many small islands scattered across vast oceans',
    landPercent: 0.30,
    waterPercent: 0.70,
    continents: 0,                        // No major continents
    islandCount: 'many',                  // Dynamic based on map size
    minIslandSize: 4,                     // Minimum 4 tiles per island
    maxIslandSize: 30,                    // Maximum 30 tiles per island
    worldWrap: 'cylindrical',
    startingPositions: 'island_each',     // Each player starts on different island
    continentSeparation: 2,
    coastalBias: 0.9,                     // Almost all starts are coastal
    resourceDensity: 1.1,                 // Slightly higher to compensate for small islands
    features: {
      navalFocus: true,
      seahorseBonus: true                 // More sea resources
    }
  },
  {
    id: 'terra',
    name: 'Terra',
    description: 'Old World start with a New World continent to discover',
    landPercent: 0.45,
    waterPercent: 0.55,
    continents: 2,
    worldWrap: 'cylindrical',
    startingPositions: 'old_world_only',  // All players start in Old World
    continentSeparation: 5,               // Large ocean between Old and New World
    coastalBias: 0.3,
    resourceDensity: 1.0,
    features: {
      newWorld: true,
      oldWorldSize: 0.6,                  // Old World is 60% of land
      newWorldSize: 0.4,                  // New World is 40% of land
      newWorldResources: 'rich',          // New World has bonus resources
      nativeBarbarianCamps: true          // Barbarian camps in New World
    }
  },
  {
    id: 'fractal',
    name: 'Fractal',
    description: 'Unpredictable coastlines with random continent shapes',
    landPercent: 0.40,
    waterPercent: 0.60,
    continents: 'random',                 // Randomly determined
    worldWrap: 'cylindrical',             // Can be cylindrical, flat, or toroidal
    worldWrapOptions: ['cylindrical', 'flat', 'toroidal'],
    startingPositions: 'random',
    continentSeparation: 'random',
    coastalBias: 0.5,
    resourceDensity: 1.0,
    features: {
      fractalGeneration: true,
      unpredictable: true,
      compactContinents: true             // Tends toward compact shapes
    }
  },
  {
    id: 'inland_sea',
    name: 'Inland Sea',
    description: 'Large landmass surrounding a central salt-water sea',
    landPercent: 0.55,
    waterPercent: 0.45,
    continents: 1,
    worldWrap: 'cylindrical',
    startingPositions: 'ring',            // Players start around the sea
    continentSeparation: 0,
    coastalBias: 0.6,                     // High coastal starts around inner sea
    resourceDensity: 1.1,
    features: {
      inlandSea: true,
      seaSize: 0.25,                      // Sea is 25% of map
      richRiverRegions: true,             // Rivers flow into the sea
      goldBonus: true                     // Known for gold resources
    }
  },
  {
    id: 'lakes',
    name: 'Lakes',
    description: 'Solid landmass with multiple salt-water lakes',
    landPercent: 0.60,
    waterPercent: 0.40,
    continents: 1,
    lakeCount: 'many',                    // Multiple lakes
    worldWrap: 'cylindrical',
    startingPositions: 'near_water',      // Almost always near a lake
    continentSeparation: 0,
    coastalBias: 0.7,
    resourceDensity: 1.0,
    features: {
      multipleLakes: true,
      forestProfusion: true,              // Known for many forests
      freshWaterBonus: true
    }
  },
  {
    id: 'oasis',
    name: 'Oasis',
    description: 'Desert world with fertile oases and ocean border',
    landPercent: 0.55,
    waterPercent: 0.45,
    continents: 1,
    worldWrap: 'cylindrical',
    startingPositions: 'south',           // Players start in the south (SP)
    continentSeparation: 0,
    coastalBias: 0.2,
    resourceDensity: 1.2,                 // Rich in specific resources
    features: {
      desertDominant: true,
      jungleBorder: true,                 // Jungle near water
      oceanNorth: true,                   // Ocean on north side
      oasisRegions: true,
      regionResources: {
        oasis: ['aluminum', 'corn', 'iron', 'oil', 'stone', 'gold', 'incense', 'ivory']
      }
    }
  },
  {
    id: 'ice_age',
    name: 'Ice Age',
    description: 'Frozen world with lots of ice, tundra, and limited habitable land',
    landPercent: 0.35,
    waterPercent: 0.65,
    continents: 'thin_strips',            // Thin continent strips
    worldWrap: 'cylindrical',
    startingPositions: 'random',
    continentSeparation: 2,
    coastalBias: 0.5,
    resourceDensity: 0.8,                 // Fewer resources due to harsh climate
    features: {
      iceAge: true,
      coldClimate: true,
      icePercent: 0.25,                   // 25% of map is ice
      tundraPercent: 0.30,                // 30% is tundra
      habitableLandPercent: 0.45,         // Only 45% is habitable
      variedLandmasses: true
    }
  },
  {
    id: 'mirror',
    name: 'Mirror',
    description: 'Symmetrical map mirrored for competitive fairness',
    landPercent: 0.40,
    waterPercent: 0.60,
    continents: 2,                        // One per "side"
    worldWrap: 'cylindrical',
    startingPositions: 'mirrored',        // Mirrored starting positions
    continentSeparation: 3,
    coastalBias: 0.4,
    resourceDensity: 1.0,
    features: {
      symmetrical: true,
      mirrorTypes: ['horizontal', 'vertical', 'rotational'],
      defaultMirror: 'horizontal',
      balancedStarts: true,               // Ensures fair starting locations
      mirroredResources: true             // Resources also mirrored
    }
  }
];

export const mapSizes = [
  {
    id: 'duel',
    name: 'Duel',
    maxPlayers: 2,
    description: 'Tiny map for 2 players',
    gridWidth: 10,
    gridHeight: 6,
    tilesWidth: 40,
    tilesHeight: 24,
    totalTiles: 960,
    recommendedCities: 4
  },
  {
    id: 'tiny',
    name: 'Tiny',
    maxPlayers: 3,
    description: 'Small map for 3 players',
    gridWidth: 13,
    gridHeight: 8,
    tilesWidth: 52,
    tilesHeight: 32,
    totalTiles: 1664,
    recommendedCities: 6
  },
  {
    id: 'small',
    name: 'Small',
    maxPlayers: 5,
    description: 'Compact map for 5 players',
    gridWidth: 16,
    gridHeight: 10,
    tilesWidth: 64,
    tilesHeight: 40,
    totalTiles: 2560,
    recommendedCities: 8
  },
  {
    id: 'standard',
    name: 'Standard',
    maxPlayers: 7,
    description: 'Regular size for 7 players',
    gridWidth: 21,
    gridHeight: 13,
    tilesWidth: 84,
    tilesHeight: 52,
    totalTiles: 4368,
    recommendedCities: 10
  },
  {
    id: 'large',
    name: 'Large',
    maxPlayers: 9,
    description: 'Expansive map for 9 players',
    gridWidth: 26,
    gridHeight: 16,
    tilesWidth: 104,
    tilesHeight: 64,
    totalTiles: 6656,
    recommendedCities: 12
  },
  {
    id: 'huge',
    name: 'Huge',
    maxPlayers: 11,
    description: 'Massive map for 11 players',
    gridWidth: 32,
    gridHeight: 20,
    tilesWidth: 128,
    tilesHeight: 80,
    totalTiles: 10240,
    recommendedCities: 15
  }
];

export const gameSpeeds = [
  {
    id: 'quick',
    name: 'Quick',
    description: 'Fast-paced game',
    turns: 330,
    productionModifier: 0.67,
    researchModifier: 0.67,
    unitCostModifier: 0.67,
    cultureModifier: 0.50,
    growthModifier: 0.67,
    greatPeopleModifier: 0.67,
    anarchyModifier: 0.50,
    goldenAgeModifier: 0.67,
    legendaryThreshold: 25000
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'Standard game length',
    turns: 500,
    productionModifier: 1.00,
    researchModifier: 1.00,
    unitCostModifier: 1.00,
    cultureModifier: 1.00,
    growthModifier: 1.00,
    greatPeopleModifier: 1.00,
    anarchyModifier: 1.00,
    goldenAgeModifier: 1.00,
    legendaryThreshold: 50000
  },
  {
    id: 'epic',
    name: 'Epic',
    description: 'Extended game',
    turns: 750,
    productionModifier: 1.50,
    researchModifier: 1.50,
    unitCostModifier: 1.50,
    cultureModifier: 1.50,
    growthModifier: 1.50,
    greatPeopleModifier: 1.50,
    anarchyModifier: 1.50,
    goldenAgeModifier: 1.50,
    legendaryThreshold: 75000
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: 'Very long game',
    turns: 1500,
    productionModifier: 3.00,
    researchModifier: 3.00,
    unitCostModifier: 2.40,     // Units cheaper relative to buildings
    cultureModifier: 3.00,
    growthModifier: 3.00,
    greatPeopleModifier: 3.00,
    anarchyModifier: 2.00,
    goldenAgeModifier: 3.00,
    barbarianModifier: 4.00,    // Barbarians spawn more frequently
    legendaryThreshold: 150000
  }
];

export const startingEras = [
  {
    id: 'ancient',
    name: 'Ancient',
    year: '4000 BC',
    startingYear: -4000,
    freeTechs: [],
    startingGold: 0
  },
  {
    id: 'classical',
    name: 'Classical',
    year: '1000 BC',
    startingYear: -1000,
    freeTechs: ['agriculture', 'animal_husbandry', 'archery', 'bronze_working', 'fishing', 'hunting', 'masonry', 'mining', 'mysticism', 'pottery', 'sailing', 'the_wheel', 'writing'],
    startingGold: 100
  },
  {
    id: 'medieval',
    name: 'Medieval',
    year: '500 AD',
    startingYear: 500,
    freeTechs: ['alphabet', 'calendar', 'code_of_laws', 'construction', 'currency', 'drama', 'feudalism', 'horseback_riding', 'iron_working', 'literature', 'machinery', 'mathematics', 'meditation', 'metal_casting', 'monarchy', 'monotheism', 'music', 'philosophy', 'polytheism', 'priesthood'],
    startingGold: 200
  },
  {
    id: 'renaissance',
    name: 'Renaissance',
    year: '1300 AD',
    startingYear: 1300,
    freeTechs: ['banking', 'civil_service', 'compass', 'divine_right', 'engineering', 'guilds', 'liberalism', 'nationalism', 'optics', 'paper', 'printing_press'],
    startingGold: 400
  },
  {
    id: 'industrial',
    name: 'Industrial',
    year: '1700 AD',
    startingYear: 1700,
    freeTechs: ['astronomy', 'chemistry', 'constitution', 'corporation', 'democracy', 'economics', 'education', 'gunpowder', 'military_tradition', 'nationalism', 'physics', 'replaceable_parts', 'rifling', 'scientific_method', 'steel'],
    startingGold: 600
  },
  {
    id: 'modern',
    name: 'Modern',
    year: '1900 AD',
    startingYear: 1900,
    freeTechs: ['artillery', 'assembly_line', 'biology', 'combustion', 'communism', 'electricity', 'fascism', 'flight', 'industrialism', 'mass_media', 'medicine', 'military_science', 'railroad', 'radio'],
    startingGold: 800
  }
];

export const climateTypes = [
  {
    id: 'tropical',
    name: 'Tropical',
    description: 'Warm and wet - more jungles and grasslands',
    junglePercent: 0.40,
    desertPercent: 0.05,
    plainsPercent: 0.20,
    grasslandPercent: 0.35,
    tundraPercent: 0.00,
    snowPercent: 0.00
  },
  {
    id: 'temperate',
    name: 'Temperate',
    description: 'Balanced climate - variety of terrain',
    junglePercent: 0.15,
    desertPercent: 0.15,
    plainsPercent: 0.30,
    grasslandPercent: 0.25,
    tundraPercent: 0.10,
    snowPercent: 0.05
  },
  {
    id: 'rocky',
    name: 'Rocky',
    description: 'Mountainous terrain - more hills and peaks',
    junglePercent: 0.05,
    desertPercent: 0.10,
    plainsPercent: 0.25,
    grasslandPercent: 0.20,
    tundraPercent: 0.15,
    snowPercent: 0.10,
    hillModifier: 1.50,
    peakModifier: 1.50
  },
  {
    id: 'arid',
    name: 'Arid',
    description: 'Dry deserts - more plains and desert',
    junglePercent: 0.00,
    desertPercent: 0.40,
    plainsPercent: 0.35,
    grasslandPercent: 0.10,
    tundraPercent: 0.05,
    snowPercent: 0.00
  },
  {
    id: 'cold',
    name: 'Cold',
    description: 'Frozen tundra - harsh northern climate',
    junglePercent: 0.00,
    desertPercent: 0.05,
    plainsPercent: 0.20,
    grasslandPercent: 0.15,
    tundraPercent: 0.35,
    snowPercent: 0.25
  }
];

export const seaLevels = [
  {
    id: 'low',
    name: 'Low',
    description: 'More land, less water',
    waterPercent: 0.30,
    coastModifier: 0.70
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Balanced land and water',
    waterPercent: 0.40,
    coastModifier: 1.00
  },
  {
    id: 'high',
    name: 'High',
    description: 'More water, less land',
    waterPercent: 0.55,
    coastModifier: 1.30
  }
];

export const barbarianSettings = [
  {
    id: 'off',
    name: 'No Barbarians',
    description: 'Peaceful world - no barbarian spawns',
    spawnModifier: 0,
    strengthModifier: 0
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'Standard barbarian activity',
    spawnModifier: 1.0,
    strengthModifier: 1.0
  },
  {
    id: 'raging',
    name: 'Raging',
    description: 'Aggressive barbarians everywhere',
    spawnModifier: 2.0,
    strengthModifier: 1.25
  }
];

// Victory conditions (can be enabled/disabled)
export const victoryConditions = [
  { id: 'time', name: 'Time Victory', description: 'Highest score when time runs out', default: true },
  { id: 'conquest', name: 'Conquest', description: 'Eliminate all other civilizations', default: true },
  { id: 'domination', name: 'Domination', description: 'Control 64% of land and population', default: true },
  { id: 'cultural', name: 'Cultural', description: 'Three cities reach Legendary culture', default: true },
  { id: 'space', name: 'Space Race', description: 'Build and launch a spaceship', default: true },
  { id: 'diplomatic', name: 'Diplomatic', description: 'Win a United Nations vote', default: true }
];

// Default game settings
export const defaultGameSettings = {
  difficulty: 'prince',
  mapType: 'continents',
  mapSize: 'large',
  gameSpeed: 'normal',
  startingEra: 'ancient',
  climate: 'temperate',
  seaLevel: 'medium',
  barbarians: 'normal',
  numOpponents: 7
};

// Helper function to get configuration by ID
export const getDifficultyConfig = (id) => difficultyLevels.find(d => d.id === id);
export const getMapTypeConfig = (id) => mapTypes.find(m => m.id === id);
export const getMapSizeConfig = (id) => mapSizes.find(s => s.id === id);
export const getGameSpeedConfig = (id) => gameSpeeds.find(s => s.id === id);
export const getStartingEraConfig = (id) => startingEras.find(e => e.id === id);
export const getClimateConfig = (id) => climateTypes.find(c => c.id === id);
export const getSeaLevelConfig = (id) => seaLevels.find(l => l.id === id);
export const getBarbarianConfig = (id) => barbarianSettings.find(b => b.id === id);
