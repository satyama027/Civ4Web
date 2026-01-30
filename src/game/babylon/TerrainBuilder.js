import { Mesh, VertexData, Vector3, Color3, MeshBuilder } from '@babylonjs/core';

const TILE_SIZE = 1;

/**
 * Compute the Y elevation for a vertex at grid corner (i, j).
 * Averages the elevations of the up-to-4 adjacent tiles.
 */
function computeVertexY(i, j, mapData) {
  const W = mapData.width;
  const H = mapData.height;
  let sum = 0;
  let count = 0;

  // Adjacent tiles sharing this corner: (i-1,j-1), (i,j-1), (i-1,j), (i,j)
  for (const [tx, ty] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
    const tile = mapData.getTile(tx, ty);
    if (!tile) continue;
    const h = mapData.heightmap?.[ty]?.[tx] ?? 0;

    let y;
    if (tile.isPeak) {
      y = 2.0 + h * 1.5;
    } else if (tile.isHills) {
      y = 0.8 + h * 0.8;
    } else if (tile.terrain === 'ocean') {
      y = -0.4;
    } else if (tile.terrain === 'coast') {
      y = -0.15;
    } else {
      y = h * 0.3;
    }
    sum += y;
    count++;
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Compute the vertex color at grid corner (i, j) by averaging
 * terrain colors of adjacent tiles.
 */
function computeVertexColor(i, j, mapData, terrainRGB) {
  const W = mapData.width;
  const H = mapData.height;
  let r = 0, g = 0, b = 0, count = 0;

  for (const [tx, ty] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
    const tile = mapData.getTile(tx, ty);
    if (!tile) continue;
    const rgb = terrainRGB[tile.terrain] || terrainRGB['grassland'];
    r += rgb[0];
    g += rgb[1];
    b += rgb[2];
    count++;
  }

  if (count > 0) {
    return [r / count, g / count, b / count, 1.0];
  }
  return [0.29, 0.60, 0.29, 1.0]; // fallback grassland
}

/**
 * Build a single continuous terrain mesh from heightmap data with vertex colors.
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @param {Record<string, number[]>} terrainRGB - terrain name → [r, g, b]
 * @param {import('@babylonjs/core').Material} material
 * @returns {{ mesh: Mesh, positions: Float32Array }}
 */
export function buildTerrainMesh(scene, mapData, terrainRGB, material) {
  const W = mapData.width;
  const H = mapData.height;
  const vertW = W + 1;
  const vertH = H + 1;
  const vertCount = vertW * vertH;

  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 4);
  const indices = [];

  // Build vertex positions and colors
  for (let j = 0; j < vertH; j++) {
    for (let i = 0; i < vertW; i++) {
      const idx = j * vertW + i;
      const p = idx * 3;
      positions[p] = i * TILE_SIZE;
      positions[p + 1] = computeVertexY(i, j, mapData);
      positions[p + 2] = j * TILE_SIZE;

      const c = idx * 4;
      const rgba = computeVertexColor(i, j, mapData, terrainRGB);
      colors[c] = rgba[0];
      colors[c + 1] = rgba[1];
      colors[c + 2] = rgba[2];
      colors[c + 3] = rgba[3];
    }
  }

  // Build index buffer — two triangles per tile
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tl = y * vertW + x;
      const tr = tl + 1;
      const bl = (y + 1) * vertW + x;
      const br = bl + 1;

      indices.push(tl, tr, bl);
      indices.push(tr, br, bl);
    }
  }

  // Compute normals
  const normals = new Float32Array(vertCount * 3);
  VertexData.ComputeNormals(positions, indices, normals);

  // Create mesh
  const mesh = new Mesh('terrain', scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh);

  mesh.material = material;
  mesh.isPickable = true;
  mesh.freezeWorldMatrix();

  return { mesh, positions };
}

/**
 * Build a grid overlay that follows the terrain elevation.
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @param {Float32Array} positions - vertex positions from buildTerrainMesh
 * @returns {Mesh}
 */
export function buildGridOverlay(scene, mapData, positions) {
  const W = mapData.width;
  const H = mapData.height;
  const vertW = W + 1;
  const lines = [];
  const offset = 0.03; // slight Y offset above terrain

  const getY = (i, j) => positions[(j * vertW + i) * 3 + 1];

  // Lines along X (one per row of vertices)
  for (let j = 0; j <= H; j++) {
    const path = [];
    for (let i = 0; i <= W; i++) {
      path.push(new Vector3(i * TILE_SIZE, getY(i, j) + offset, j * TILE_SIZE));
    }
    lines.push(path);
  }

  // Lines along Z (one per column of vertices)
  for (let i = 0; i <= W; i++) {
    const path = [];
    for (let j = 0; j <= H; j++) {
      path.push(new Vector3(i * TILE_SIZE, getY(i, j) + offset, j * TILE_SIZE));
    }
    lines.push(path);
  }

  const grid = MeshBuilder.CreateLineSystem('gridOverlay', { lines }, scene);
  grid.color = new Color3(1, 1, 1);
  grid.alpha = 0.15;
  grid.isVisible = false;
  grid.isPickable = false;

  return grid;
}
