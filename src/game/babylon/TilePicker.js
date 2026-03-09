import { MeshBuilder, StandardMaterial, Color3, Color4, Vector3 } from '@babylonjs/core';

/**
 * Set up tile hover and click detection via raycasting on the continuous terrain mesh.
 * Uses pickedPoint world position to determine tile coordinates.
 *
 * @param {import('@babylonjs/core').Scene} scene
 * @param {HTMLCanvasElement} canvas
 * @param {Object} mapData
 * @param {Float32Array} positions - vertex positions from terrain mesh
 * @param {number} padding - number of padding columns on each side (0 if no wrapping)
 * @param {number} extVertW - extended vertex width (W + 2*padding + 1)
 * @param {(tile: {x: number, y: number} | null) => void} onHover
 * @param {(tile: {x: number, y: number}) => void} onClick
 * @returns {{ dispose: () => void }}
 */
export function setupTilePicking(scene, canvas, mapData, positions, padding, extVertW, onHover, onClick) {
  const W = mapData.width;
  const H = mapData.height;
  const wrapX = mapData.settings?.wrapX ?? true;

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
    // Offset by padding to index into extended vertex array
    const ci = tx + padding;
    const corners = [
      [ci, ty], [ci + 1, ty], [ci, ty + 1], [ci + 1, ty + 1]
    ];
    let sum = 0;
    for (const [vi, vj] of corners) {
      if (vi < 0 || vi >= extVertW || vj < 0 || vj > H) {
        continue;
      }
      sum += positions[(vj * extVertW + vi) * 3 + 1];
    }
    return sum / 4;
  }

  function pointToTile(point) {
    let tx = Math.floor(point.x);
    const ty = Math.floor(point.z);

    if (wrapX) {
      // Modulo-wrap X into [0, W)
      tx = ((tx % W) + W) % W;
    } else {
      if (tx < 0 || tx >= W) return null;
    }

    if (ty < 0 || ty >= H) return null;
    return { x: tx, y: ty };
  }

  /**
   * Find the best world-X position for the highlight quad.
   * For wrapping maps, choose the copy nearest to the camera.
   */
  function bestHighlightX(tx, cameraX) {
    if (!wrapX) return tx + 0.5;
    // Three candidates: tx, tx+W, tx-W — pick closest to camera
    const candidates = [tx, tx + W, tx - W];
    let best = candidates[0];
    let bestDist = Math.abs(best + 0.5 - cameraX);
    for (let k = 1; k < candidates.length; k++) {
      const d = Math.abs(candidates[k] + 0.5 - cameraX);
      if (d < bestDist) {
        bestDist = d;
        best = candidates[k];
      }
    }
    return best + 0.5;
  }

  const handleMove = () => {
    const hit = scene.pick(scene.pointerX, scene.pointerY);
    if (hit.hit && hit.pickedPoint) {
      const tile = pointToTile(hit.pickedPoint);
      if (tile) {
        const avgY = getTileY(tile.x, tile.y);
        const camera = scene.activeCamera;
        const hlX = bestHighlightX(tile.x, camera ? camera.target.x : tile.x);
        highlight.position.set(hlX, avgY + 0.05, tile.y + 0.5);
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
