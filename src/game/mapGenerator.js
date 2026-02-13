/**
 * Map Generator — Backward Compatibility Wrapper
 *
 * This file re-exports all public API from the new modular mapgen system
 * (src/game/mapgen/) so that existing consumers (Game.jsx, etc.) require
 * no import changes.
 *
 * The actual implementation lives in:
 *   src/game/mapgen/index.js      — generateMap() entry point
 *   src/game/mapgen/scripts/*.js  — Per-map-type generation pipelines
 *   src/game/mapgen/*.js          — Engine classes (CyFractal, FractalWorld, etc.)
 */

// Main entry point and convenience functions
export {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra
} from './mapgen/index.js';

// Constants
export {
  TERRAIN,
  FEATURE,
  ELEVATION
} from './mapgen/index.js';

// Utility functions
export {
  mapToAscii,
  getMapStats,
  getMapScriptInfo,
  getAllMapScriptInfo
} from './mapgen/index.js';

// Default export for legacy `import mapGen from './mapGenerator'` usage
import {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra,
  TERRAIN,
  FEATURE,
  ELEVATION,
  mapToAscii,
  getMapStats,
  getMapScriptInfo,
  getAllMapScriptInfo
} from './mapgen/index.js';

export default {
  generateMap,
  generatePangaea,
  generateContinents,
  generateArchipelago,
  generateTerra,
  mapToAscii,
  getMapStats,
  getMapScriptInfo,
  getAllMapScriptInfo,
  TERRAIN,
  FEATURE,
  ELEVATION
};
