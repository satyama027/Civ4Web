import { MeshBuilder, StandardMaterial, Color3, Matrix, Vector3, Quaternion } from '@babylonjs/core';

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
 * Build instanced trees for forest/jungle tiles and river line meshes.
 * When padding > 0, features are duplicated in the padding zone so they
 * appear seamlessly when the camera wraps around.
 *
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @param {Float32Array} positions - vertex positions from terrain mesh
 * @param {number} padding - number of padding columns on each side
 * @param {number} extVertW - extended vertex width
 * @returns {{ dispose: () => void }}
 */
export function buildFeatures(scene, mapData, positions, padding = 0, extVertW = null) {
  const W = mapData.width;
  const H = mapData.height;
  const wrapX = mapData.settings?.wrapX ?? true;
  const actualExtVertW = extVertW ?? (W + 1);
  const disposables = [];

  function getTileY(worldX, ty) {
    // Convert world-space X to vertex array index
    const vi = Math.round(worldX) + padding;
    const corners = [
      [vi, ty], [vi + 1, ty], [vi, ty + 1], [vi + 1, ty + 1]
    ];
    let sum = 0;
    let count = 0;
    for (const [ci, cj] of corners) {
      if (ci < 0 || ci >= actualExtVertW || cj < 0 || cj > H) continue;
      sum += positions[(cj * actualExtVertW + ci) * 3 + 1];
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  function getVertexY(worldX, vy) {
    const vi = worldX + padding;
    if (vi < 0 || vi >= actualExtVertW || vy < 0 || vy >= H + 1) return 0;
    return positions[(vy * actualExtVertW + vi) * 3 + 1];
  }

  // --- Trees (forests & jungles) ---
  const forestMat = new StandardMaterial('forestMat', scene);
  forestMat.diffuseColor = new Color3(0.15, 0.45, 0.15);
  disposables.push(forestMat);

  const jungleMat = new StandardMaterial('jungleMat', scene);
  jungleMat.diffuseColor = new Color3(0.08, 0.35, 0.08);
  disposables.push(jungleMat);

  const treeCone = MeshBuilder.CreateCylinder('treeCone', {
    diameterTop: 0,
    diameterBottom: 0.35,
    height: 0.6,
    tessellation: 5,
  }, scene);
  treeCone.isVisible = false;
  treeCone.material = forestMat;
  disposables.push(treeCone);

  const jungleCone = MeshBuilder.CreateCylinder('jungleCone', {
    diameterTop: 0,
    diameterBottom: 0.4,
    height: 0.7,
    tessellation: 5,
  }, scene);
  jungleCone.isVisible = false;
  jungleCone.material = jungleMat;
  disposables.push(jungleCone);

  function tileRand(x, y, idx) {
    const n = (x * 374761393 + y * 668265263 + idx * 1274126177) & 0x7fffffff;
    return (n % 1000) / 1000;
  }

  const forestMatrices = [];
  const jungleMatrices = [];

  // Iterate over extended X range for wrapping maps
  const startX = -padding;
  const endX = W + padding;

  for (let y = 0; y < H; y++) {
    for (let worldX = startX; worldX < endX; worldX++) {
      // Map world X to tile data X via wrapping
      const dataX = wrapCoord(worldX, W, wrapX);
      if (dataX < 0) continue;

      const tile = mapData.getTile(dataX, y);
      if (!tile || !tile.feature) continue;

      const isJungle = tile.feature === 'jungle';
      const isForest = tile.feature === 'forest';
      if (!isForest && !isJungle) continue;

      const baseY = getTileY(worldX, y);
      // Use dataX for deterministic random (same trees at same tile regardless of copy)
      const treeCount = 2 + Math.floor(tileRand(dataX, y, 99) * 2);
      const target = isJungle ? jungleMatrices : forestMatrices;

      for (let t = 0; t < treeCount; t++) {
        const ox = tileRand(dataX, y, t * 2) * 0.7 - 0.35;
        const oz = tileRand(dataX, y, t * 2 + 1) * 0.7 - 0.35;
        const scale = 0.8 + tileRand(dataX, y, t + 10) * 0.5;
        const treeY = baseY + (isJungle ? 0.35 : 0.3) * scale;

        target.push(Matrix.Compose(
          new Vector3(scale, scale, scale),
          Quaternion.Identity(),
          new Vector3(worldX + 0.5 + ox, treeY, y + 0.5 + oz)
        ));
      }
    }
  }

  if (forestMatrices.length > 0) {
    const buf = new Float32Array(forestMatrices.length * 16);
    forestMatrices.forEach((m, i) => m.copyToArray(buf, i * 16));
    treeCone.thinInstanceSetBuffer('matrix', buf, 16);
    treeCone.isVisible = true;
    treeCone.isPickable = false;
  }

  if (jungleMatrices.length > 0) {
    const buf = new Float32Array(jungleMatrices.length * 16);
    jungleMatrices.forEach((m, i) => m.copyToArray(buf, i * 16));
    jungleCone.thinInstanceSetBuffer('matrix', buf, 16);
    jungleCone.isVisible = true;
    jungleCone.isPickable = false;
  }

  // --- Rivers (edge-based) ---
  const riverPaths = [];
  const riverOffset = 0.06;

  for (let y = 0; y < H; y++) {
    for (let worldX = startX; worldX < endX; worldX++) {
      const dataX = wrapCoord(worldX, W, wrapX);
      if (dataX < 0) continue;

      const tile = mapData.getTile(dataX, y);
      if (!tile) continue;

      // Bottom/south edge: between vertices (worldX,y+1) and (worldX+1,y+1)
      if (tile.isNOfRiver) {
        const y1 = getVertexY(worldX, y + 1) + riverOffset;
        const y2 = getVertexY(worldX + 1, y + 1) + riverOffset;
        riverPaths.push([
          new Vector3(worldX, y1, y + 1),
          new Vector3(worldX + 1, y2, y + 1)
        ]);
      }

      // Right/east edge: between vertices (worldX+1,y) and (worldX+1,y+1)
      if (tile.isWOfRiver) {
        const y1 = getVertexY(worldX + 1, y) + riverOffset;
        const y2 = getVertexY(worldX + 1, y + 1) + riverOffset;
        riverPaths.push([
          new Vector3(worldX + 1, y1, y),
          new Vector3(worldX + 1, y2, y + 1)
        ]);
      }
    }
  }

  let riverMesh = null;
  if (riverPaths.length > 0) {
    riverMesh = MeshBuilder.CreateLineSystem('rivers', { lines: riverPaths }, scene);
    riverMesh.color = new Color3(0.2, 0.5, 0.85);
    riverMesh.alpha = 0.7;
    riverMesh.isPickable = false;
    disposables.push(riverMesh);
  }

  return {
    dispose: () => {
      disposables.forEach(d => d.dispose());
    }
  };
}
