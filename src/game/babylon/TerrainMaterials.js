import { StandardMaterial, Color3 } from '@babylonjs/core';

/** RGB values per terrain type (used for vertex coloring) */
export const TERRAIN_RGB = {
  ocean:     [0.10, 0.29, 0.48],
  coast:     [0.23, 0.54, 0.69],
  grassland: [0.29, 0.60, 0.29],
  plains:    [0.72, 0.63, 0.38],
  desert:    [0.91, 0.82, 0.63],
  tundra:    [0.60, 0.67, 0.67],
  snow:      [0.94, 0.94, 0.94],
};

/**
 * Create a single material that renders vertex colors.
 * @param {import('@babylonjs/core').Scene} scene
 * @returns {StandardMaterial}
 */
export function createTerrainMaterial(scene) {
  const mat = new StandardMaterial('terrainMat', scene);
  mat.diffuseColor = new Color3(1, 1, 1);
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  mat.backFaceCulling = true;
  return mat;
}
