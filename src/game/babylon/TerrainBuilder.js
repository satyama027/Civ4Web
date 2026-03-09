import { Mesh, VertexData, Vector3, Color3, MeshBuilder } from '@babylonjs/core';

const TILE_SIZE = 1;

/**
 * Resolve a tile coordinate, wrapping if the map wraps in that axis.
 * Returns -1 for out-of-bounds on non-wrapping axes.
 */
function wrapCoord(coord, size, wrap) {
  if (coord >= 0 && coord < size) return coord;
  if (wrap) return ((coord % size) + size) % size;
  return -1;
}

/**
 * Compute the Y elevation for a vertex at grid corner (i, j).
 * Averages the elevations of the up-to-4 adjacent tiles.
 * i/j are raw tile-space coordinates (may be negative or >= W for padded mesh).
 */
function computeVertexY(i, j, mapData) {
  const W = mapData.width;
  const H = mapData.height;
  const wrapX = mapData.settings?.wrapX ?? true;
  const wrapY = mapData.settings?.wrapY ?? false;
  let sum = 0;
  let count = 0;

  // Adjacent tiles sharing this corner: (i-1,j-1), (i,j-1), (i-1,j), (i,j)
  for (const [tx, ty] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
    const wrappedTx = wrapCoord(tx, W, wrapX);
    const wrappedTy = wrapCoord(ty, H, wrapY);
    if (wrappedTx < 0 || wrappedTy < 0) continue;

    const tile = mapData.getTile(wrappedTx, wrappedTy);
    if (!tile) continue;
    const h = mapData.heightmap?.[wrappedTy]?.[wrappedTx] ?? 0;

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
 * i/j are raw tile-space coordinates (may be negative or >= W for padded mesh).
 */
function computeVertexColor(i, j, mapData, terrainRGB) {
  const W = mapData.width;
  const H = mapData.height;
  const wrapX = mapData.settings?.wrapX ?? true;
  const wrapY = mapData.settings?.wrapY ?? false;
  let r = 0, g = 0, b = 0, count = 0;

  for (const [tx, ty] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
    const wrappedTx = wrapCoord(tx, W, wrapX);
    const wrappedTy = wrapCoord(ty, H, wrapY);
    if (wrappedTx < 0 || wrappedTy < 0) continue;

    const tile = mapData.getTile(wrappedTx, wrappedTy);
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
 * When wrapX is true, the mesh is extended with padding columns on each side
 * that duplicate opposite-edge tiles, enabling seamless visual wrapping.
 *
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @param {Record<string, number[]>} terrainRGB - terrain name → [r, g, b]
 * @param {import('@babylonjs/core').Material} material
 * @returns {{ mesh: Mesh, positions: Float32Array, padding: number, extVertW: number }}
 */
export function buildTerrainMesh(scene, mapData, terrainRGB, material) {
  const W = mapData.width;
  const H = mapData.height;
  const wrapX = mapData.settings?.wrapX ?? true;

  // Padding: half the map width on each side (enough for any camera angle/zoom)
  const padding = wrapX ? Math.ceil(W / 2) : 0;
  const extW = W + 2 * padding;      // extended tile columns
  const extVertW = extW + 1;          // extended vertex columns
  const vertH = H + 1;
  const vertCount = extVertW * vertH;

  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 4);
  const indices = [];

  // Build vertex positions and colors
  // Vertex i=0 corresponds to tile-space x = -padding
  for (let j = 0; j < vertH; j++) {
    for (let i = 0; i < extVertW; i++) {
      const tileX = i - padding; // raw tile-space X (may be negative or >= W)
      const idx = j * extVertW + i;
      const p = idx * 3;
      positions[p] = tileX * TILE_SIZE;
      positions[p + 1] = computeVertexY(tileX, j, mapData);
      positions[p + 2] = j * TILE_SIZE;

      const c = idx * 4;
      const rgba = computeVertexColor(tileX, j, mapData, terrainRGB);
      colors[c] = rgba[0];
      colors[c + 1] = rgba[1];
      colors[c + 2] = rgba[2];
      colors[c + 3] = rgba[3];
    }
  }

  // Build index buffer — two triangles per tile
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < extW; x++) {
      const tl = y * extVertW + x;
      const tr = tl + 1;
      const bl = (y + 1) * extVertW + x;
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

  return { mesh, positions, padding, extVertW };
}

/**
 * Build a grid overlay that follows the terrain elevation.
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @param {Float32Array} positions - vertex positions from buildTerrainMesh
 * @param {number} padding - number of padding columns on each side
 * @param {number} extVertW - extended vertex width (W + 2*padding + 1)
 * @returns {Mesh}
 */
export function buildGridOverlay(scene, mapData, positions, padding = 0, extVertW = null) {
  const W = mapData.width;
  const H = mapData.height;
  const actualExtVertW = extVertW ?? (W + 1);
  const startX = -padding;
  const endX = W + padding;
  const lines = [];
  const offset = 0.03; // slight Y offset above terrain

  const getY = (tileX, j) => {
    const i = tileX + padding; // convert tile-space X to vertex array index
    if (i < 0 || i >= actualExtVertW) return 0;
    return positions[(j * actualExtVertW + i) * 3 + 1];
  };

  // Lines along X (one per row of vertices)
  for (let j = 0; j <= H; j++) {
    const path = [];
    for (let tileX = startX; tileX <= endX; tileX++) {
      path.push(new Vector3(tileX * TILE_SIZE, getY(tileX, j) + offset, j * TILE_SIZE));
    }
    lines.push(path);
  }

  // Lines along Z (one per column of vertices)
  for (let tileX = startX; tileX <= endX; tileX++) {
    const path = [];
    for (let j = 0; j <= H; j++) {
      path.push(new Vector3(tileX * TILE_SIZE, getY(tileX, j) + offset, j * TILE_SIZE));
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
