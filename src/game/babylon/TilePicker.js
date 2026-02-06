import { MeshBuilder, StandardMaterial, Color3, Color4, Vector3 } from '@babylonjs/core';

/**
 * Set up tile hover and click detection via raycasting on the continuous terrain mesh.
 * Uses pickedPoint world position to determine tile coordinates.
 * @param {import('@babylonjs/core').Scene} scene
 * @param {HTMLCanvasElement} canvas
 * @param {Object} mapData
 * @param {Float32Array} positions - vertex positions from terrain mesh
 * @param {(tile: {x: number, y: number} | null) => void} onHover
 * @param {(tile: {x: number, y: number}) => void} onClick
 * @returns {{ dispose: () => void }}
 */
export function setupTilePicking(scene, canvas, mapData, positions, onHover, onClick) {
  const W = mapData.width;
  const H = mapData.height;
  const vertW = W + 1;

  // Create hover highlight quad
  const highlight = MeshBuilder.CreateGround('tileHighlight', { width: 1, height: 1 }, scene);
  const hlMat = new StandardMaterial('highlightMat', scene);
  hlMat.diffuseColor = new Color3(1, 0.84, 0);
  hlMat.alpha = 0.3;
  hlMat.emissiveColor = new Color3(0.6, 0.5, 0);
  highlight.material = hlMat;
  highlight.isPickable = false;
  highlight.isVisible = false;

  function getTileY(tx, ty) {
    // Average the 4 corner vertex Y values for this tile
    const corners = [
      [tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]
    ];
    let sum = 0;
    for (const [ci, cj] of corners) {
      sum += positions[(cj * vertW + ci) * 3 + 1];
    }
    return sum / 4;
  }

  function pointToTile(point) {
    const tx = Math.floor(point.x);
    const ty = Math.floor(point.z);
    if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
      return { x: tx, y: ty };
    }
    return null;
  }

  const handleMove = () => {
    const hit = scene.pick(scene.pointerX, scene.pointerY);
    if (hit.hit && hit.pickedPoint) {
      const tile = pointToTile(hit.pickedPoint);
      if (tile) {
        const avgY = getTileY(tile.x, tile.y);
        highlight.position.set(tile.x + 0.5, avgY + 0.05, tile.y + 0.5);
        highlight.isVisible = true;
        onHover(tile);
        return;
      }
    }
    highlight.isVisible = false;
    onHover(null);
  };

  const handleDown = (e) => {
    if (e.button !== 0) return;
    const hit = scene.pick(scene.pointerX, scene.pointerY);
    if (hit.hit && hit.pickedPoint) {
      const tile = pointToTile(hit.pickedPoint);
      if (tile) onClick(tile);
    }
  };

  canvas.addEventListener('pointermove', handleMove);
  canvas.addEventListener('pointerdown', handleDown);

  return {
    dispose: () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handleDown);
      highlight.dispose();
      hlMat.dispose();
    }
  };
}
