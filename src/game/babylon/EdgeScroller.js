/**
 * EdgeScroller - Pan the camera when the mouse cursor is near screen edges.
 *
 * Runs per-frame via scene.registerBeforeRender for smooth, frame-rate-independent
 * panning. Scroll direction is screen-relative (accounts for camera rotation).
 *
 * Speed scales linearly between MIN and MAX based on zoom fraction, matching
 * Civ4's CAMERA_MIN_SCROLL_SPEED / CAMERA_MAX_SCROLL_SPEED (6× ratio).
 */

const EDGE_THRESHOLD = 25;   // px from edge to start scrolling
const MIN_SCROLL_SPEED = 5;  // world units/sec at closest zoom
const MAX_SCROLL_SPEED = 30; // world units/sec at farthest zoom (6× ratio like Civ4)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

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

    // Scale speed by zoom fraction (Civ4-style min/max interpolation)
    const dt = scene.getEngine().getDeltaTime() / 1000;
    const zoomFraction = clamp(
      (camera.radius - camera.lowerRadiusLimit) / (camera.upperRadiusLimit - camera.lowerRadiusLimit),
      0, 1
    );
    const speed = (MIN_SCROLL_SPEED + zoomFraction * (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED)) * dt;

    // Apply and clamp to map boundaries
    const t = camera.target;
    const wrapX = mapData.settings?.wrapX ?? true;
    t.x += worldDx * speed;
    if (!wrapX) {
      t.x = Math.max(0, Math.min(mapData.width, t.x));
    }
    // Z (north-south) is always clamped — no Y wrapping
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
