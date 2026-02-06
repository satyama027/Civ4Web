/**
 * EdgeScroller - Pan the camera when the mouse cursor is near screen edges.
 *
 * Runs per-frame via scene.registerBeforeRender for smooth, frame-rate-independent
 * panning. Scroll direction is screen-relative (accounts for camera rotation).
 */

const EDGE_THRESHOLD = 25;  // px from edge to start scrolling
const BASE_SPEED = 15;      // world units/sec at initial zoom level

/**
 * Enable edge scrolling on the game map.
 *
 * @param {import('@babylonjs/core').Scene} scene
 * @param {HTMLCanvasElement} canvas
 * @param {import('@babylonjs/core').ArcRotateCamera} camera
 * @param {{ width: number, height: number }} mapData
 * @returns {{ dispose: () => void }}
 */
export function setupEdgeScrolling(scene, canvas, camera, mapData) {
  const initialRadius = camera.radius;
  let isPointerOverCanvas = false;

  const onEnter = () => { isPointerOverCanvas = true; };
  const onLeave = () => { isPointerOverCanvas = false; };
  canvas.addEventListener('pointerenter', onEnter);
  canvas.addEventListener('pointerleave', onLeave);

  const onBeforeRender = () => {
    if (!isPointerOverCanvas) return;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const px = scene.pointerX;
    const py = scene.pointerY;

    // Compute edge intensity: 0 (at threshold boundary) to 1 (at screen edge)
    let dx = 0;
    let dz = 0;

    if (px < EDGE_THRESHOLD) {
      dx = -(1 - px / EDGE_THRESHOLD);
    } else if (px > cw - EDGE_THRESHOLD) {
      dx = 1 - (cw - px) / EDGE_THRESHOLD;
    }

    if (py < EDGE_THRESHOLD) {
      dz = 1 - py / EDGE_THRESHOLD;
    } else if (py > ch - EDGE_THRESHOLD) {
      dz = -(1 - (ch - py) / EDGE_THRESHOLD);
    }

    if (dx === 0 && dz === 0) return;

    // Rotate pan direction by camera alpha for screen-relative scrolling
    const angle = camera.alpha + Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const worldDx = dx * cosA - dz * sinA;
    const worldDz = dx * sinA + dz * cosA;

    // Scale by zoom and delta time for consistent feel
    const dt = scene.getEngine().getDeltaTime() / 1000;
    const zoomFactor = camera.radius / initialRadius;
    const speed = BASE_SPEED * zoomFactor * dt;

    // Apply and clamp to map boundaries
    const t = camera.target;
    t.x = Math.max(0, Math.min(mapData.width, t.x + worldDx * speed));
    t.z = Math.max(0, Math.min(mapData.height, t.z + worldDz * speed));
  };

  scene.registerBeforeRender(onBeforeRender);

  return {
    dispose: () => {
      scene.unregisterBeforeRender(onBeforeRender);
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
    }
  };
}
