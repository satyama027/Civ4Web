import { MeshBuilder, StandardMaterial, Color3, Matrix, Vector3, Quaternion } from '@babylonjs/core';

/**
 * Build instanced trees for forest/jungle tiles and river line meshes.
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @param {Float32Array} positions - vertex positions from terrain mesh
 * @returns {{ dispose: () => void }}
 */
export function buildFeatures(scene, mapData, positions) {
  const W = mapData.width;
  const H = mapData.height;
  const vertW = W + 1;
  const disposables = [];

  function getTileY(tx, ty) {
    const corners = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]];
    let sum = 0;
    for (const [ci, cj] of corners) {
      sum += positions[(cj * vertW + ci) * 3 + 1];
    }
    return sum / 4;
  }

  // --- Trees (forests & jungles) ---
  const forestMat = new StandardMaterial('forestMat', scene);
  forestMat.diffuseColor = new Color3(0.15, 0.45, 0.15);
  disposables.push(forestMat);

  const jungleMat = new StandardMaterial('jungleMat', scene);
  jungleMat.diffuseColor = new Color3(0.08, 0.35, 0.08);
  disposables.push(jungleMat);

  // Prototype cone for trees
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

  // Deterministic pseudo-random from tile coords
  function tileRand(x, y, idx) {
    const n = (x * 374761393 + y * 668265263 + idx * 1274126177) & 0x7fffffff;
    return (n % 1000) / 1000;
  }

  // Collect instance matrices
  const forestMatrices = [];
  const jungleMatrices = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = mapData.getTile(x, y);
      if (!tile || !tile.feature) continue;

      const baseY = getTileY(x, y);
      const isJungle = tile.feature === 'jungle';
      const isForest = tile.feature === 'forest';
      if (!isForest && !isJungle) continue;

      const treeCount = 2 + Math.floor(tileRand(x, y, 99) * 2); // 2-3 trees
      const target = isJungle ? jungleMatrices : forestMatrices;

      for (let t = 0; t < treeCount; t++) {
        const ox = tileRand(x, y, t * 2) * 0.7 - 0.35;
        const oz = tileRand(x, y, t * 2 + 1) * 0.7 - 0.35;
        const scale = 0.8 + tileRand(x, y, t + 10) * 0.5;
        const treeY = baseY + (isJungle ? 0.35 : 0.3) * scale;

        target.push(Matrix.Compose(
          new Vector3(scale, scale, scale),
          Quaternion.Identity(),
          new Vector3(x + ox, treeY, y + oz)
        ));
      }
    }
  }

  // Apply thin instances
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

  // --- Rivers ---
  const riverPaths = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = mapData.getTile(x, y);
      if (!tile || !tile.hasRiver) continue;

      const ty = getTileY(x, y) + 0.04;
      const cx = x;
      const cz = y;

      // Connect to neighboring river tiles
      const neighbors = [[1, 0], [0, 1]]; // only right and down to avoid duplicates
      for (const [dx, dz] of neighbors) {
        const nx = x + dx;
        const nz = y + dz;
        if (nx >= W || nz >= H) continue;
        const neighbor = mapData.getTile(nx, nz);
        if (neighbor && neighbor.hasRiver) {
          const ny = getTileY(nx, nz) + 0.04;
          riverPaths.push([
            new Vector3(cx, ty, cz),
            new Vector3(nx, ny, nz)
          ]);
        }
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
