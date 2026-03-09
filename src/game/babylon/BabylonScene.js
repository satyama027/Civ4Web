import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, MeshBuilder, StandardMaterial } from '@babylonjs/core';

// ===== Civ4 BTS Camera Constants =====
const FOV_DEG = 42;
const FOV_RAD = FOV_DEG * (Math.PI / 180);
const INITIAL_BETA = Math.PI / 9;                    // ~20° from vertical (Civ4 pitch-zoom interpolation at start distance)
const CENTER_ALPHA = -Math.PI / 2;                   // map X runs left-right
const YAW_RANGE = 45 * (Math.PI / 180);              // ±45° rotation
const CIV4_MIN_DISTANCE = 700;
const CIV4_START_DISTANCE = 2200;
const CIV4_MAX_DISTANCE = 3000;
const ZOOM_LERP = 0.5;                               // Civ4 zoom speed factor
const ZOOM_STEP = 0.15;                               // 15% per scroll tick

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Compute camera radius so the terrain fills the viewport ("cover" strategy).
 * The north (far) edge appears at the top of the screen; terrain extends past
 * the south and side edges — matching Civ4's camera behaviour.
 * @param {HTMLCanvasElement} canvas
 * @param {{ width: number, height: number }} mapData
 * @param {number} fovRad  vertical FOV in radians
 * @param {number} beta    camera tilt from vertical in radians
 * @returns {number}
 */
function computeRadius(canvas, mapData, fovRad, beta) {
  const canvasW = canvas.clientWidth;
  const canvasH = canvas.clientHeight;
  const aspect = (canvasW > 0 && canvasH > 0) ? (canvasW / canvasH) : 16 / 9;

  const vHalf = fovRad / 2;
  const hHalf = Math.atan(aspect * Math.tan(vHalf));
  const cz = mapData.width  / 2;  // X axis = screen vertical (camera looks east with alpha=-PI/2)
  const cx = mapData.height / 2;  // Z axis = screen horizontal

  // North (far) edge at top of screen — "cover" mode (minus, not plus)
  const rVert  = cz * (Math.cos(beta) / Math.tan(vHalf) - Math.sin(beta));
  // Horizontal: smallest radius that fills side edges
  const rHoriz = cx / Math.tan(hHalf);

  return Math.min(rVert, rHoriz); // cover: use whichever fills sooner
}

/**
 * Radius at which the entire map fits on screen ("contain" — no part overflows).
 * Uses Math.max instead of Math.min so zooming out can reveal the full map.
 */
function computeContainRadius(canvas, mapData, fovRad, beta) {
  const canvasW = canvas.clientWidth;
  const canvasH = canvas.clientHeight;
  const aspect = (canvasW > 0 && canvasH > 0) ? (canvasW / canvasH) : 16 / 9;

  const vHalf = fovRad / 2;
  const hHalf = Math.atan(aspect * Math.tan(vHalf));
  const cz = mapData.width  / 2;
  const cx = mapData.height / 2;

  const rVert  = cz * (Math.cos(beta) / Math.tan(vHalf) - Math.sin(beta));
  const rHoriz = cx / Math.tan(hHalf);

  return Math.max(rVert, rHoriz); // contain: use whichever is larger
}

/**
 * Create and initialize a Babylon.js scene for a flat rectangular map.
 * @param {HTMLCanvasElement} canvas
 * @param {{ width: number, height: number }} mapData
 * @returns {{ engine: Engine, scene: Scene, camera: ArcRotateCamera, resetCamera: () => void, resizeCamera: () => void, dispose: () => void }}
 */
export function createScene(canvas, mapData) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  engine.resize();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.10, 0.29, 0.48, 1);

  const centerX = mapData.width / 2;
  const centerZ = mapData.height / 2;

  const coverRadius = computeRadius(canvas, mapData, FOV_RAD, INITIAL_BETA);
  const startRadius = coverRadius * (CIV4_START_DISTANCE / CIV4_MAX_DISTANCE);
  const containRadius = computeContainRadius(canvas, mapData, FOV_RAD, INITIAL_BETA);

  const camera = new ArcRotateCamera(
    'camera',
    CENTER_ALPHA,
    INITIAL_BETA,
    startRadius,
    new Vector3(centerX, 0, centerZ),
    scene
  );
  camera.fov = FOV_RAD;

  // Pitch limits: 0° (vertical) to 62° from vertical (Civ4 CAMERA_LOWER_PITCH = -28°)
  camera.lowerBetaLimit = 0.01;
  camera.upperBetaLimit = (90 - 28) * (Math.PI / 180);

  // Rotation limits: ±45° from center
  camera.lowerAlphaLimit = CENTER_ALPHA - YAW_RANGE;
  camera.upperAlphaLimit = CENTER_ALPHA + YAW_RANGE;

  // Zoom limits (proportional to map size like Civ4)
  camera.lowerRadiusLimit = coverRadius * (CIV4_MIN_DISTANCE / CIV4_MAX_DISTANCE);
  camera.upperRadiusLimit = containRadius * 1.2;

  // Near/far clip planes (Civ4 CAMERA_NEAR_FAR_PLANE_RATIO = 100)
  camera.maxZ = Math.max(mapData.width, mapData.height) * 4;
  camera.minZ = camera.maxZ / 100;

  // Smooth inertia for pitch/rotation drag (Civ4's 0.5 smoothing)
  camera.inertia = 0.85;

  camera.panningSensibility = 50;
  camera.attachControl(canvas, true);

  // --- Smooth zoom: replace default wheel with custom interpolation ---
  // Remove Babylon's built-in mousewheel input
  camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');

  let targetRadius = startRadius;

  // Custom wheel handler
  const onWheel = (e) => {
    e.preventDefault();
    targetRadius *= (1 + Math.sign(e.deltaY) * ZOOM_STEP);
    targetRadius = clamp(targetRadius, camera.lowerRadiusLimit, camera.upperRadiusLimit);
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // Per-frame smooth zoom interpolation
  const onZoomBeforeRender = () => {
    const dt = engine.getDeltaTime() / 1000;
    const factor = 1 - Math.pow(1 - ZOOM_LERP, dt * 60);
    camera.radius += (targetRadius - camera.radius) * factor;
  };
  scene.registerBeforeRender(onZoomBeforeRender);

  // --- Camera resize (preserves user's view) ---
  const resizeCamera = () => {
    const coverR = computeRadius(canvas, mapData, FOV_RAD, camera.beta);
    const containR = computeContainRadius(canvas, mapData, FOV_RAD, camera.beta);
    camera.upperRadiusLimit = containR * 1.2;
    camera.lowerRadiusLimit = coverR * (CIV4_MIN_DISTANCE / CIV4_MAX_DISTANCE);
    camera.maxZ = Math.max(mapData.width, mapData.height) * 4;
    camera.minZ = camera.maxZ / 100;
  };

  // --- Full camera reset (returns to initial state) ---
  const resetCamera = () => {
    camera.alpha = CENTER_ALPHA;
    camera.beta = INITIAL_BETA;
    const coverR = computeRadius(canvas, mapData, FOV_RAD, INITIAL_BETA);
    const containR = computeContainRadius(canvas, mapData, FOV_RAD, INITIAL_BETA);
    camera.radius = coverR * (CIV4_START_DISTANCE / CIV4_MAX_DISTANCE);
    camera.upperRadiusLimit = containR * 1.2;
    camera.lowerRadiusLimit = coverR * (CIV4_MIN_DISTANCE / CIV4_MAX_DISTANCE);
    camera.target = new Vector3(centerX, 0, centerZ);
    targetRadius = camera.radius;
  };

  const hemi = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.4;

  const sun = new DirectionalLight('sun', new Vector3(-1, -2, 1).normalize(), scene);
  sun.intensity = 0.8;

  // Ocean background plane — covers area beyond terrain mesh so no black is visible
  const oceanBg = MeshBuilder.CreateGround('oceanBg', {
    width: mapData.width * 4,
    height: mapData.height * 4
  }, scene);
  oceanBg.position = new Vector3(centerX, -0.5, centerZ);
  const oceanMat = new StandardMaterial('oceanBgMat', scene);
  oceanMat.diffuseColor = new Color3(0.10, 0.29, 0.48);
  oceanMat.specularColor = new Color3(0, 0, 0);
  oceanBg.material = oceanMat;
  oceanBg.isPickable = false;

  // Camera X-wrapping: keep target.x within [0, W) for seamless horizontal scrolling
  const wrapX = mapData.settings?.wrapX ?? true;
  if (wrapX) {
    const W = mapData.width;
    scene.registerBeforeRender(() => {
      const t = camera.target;
      t.x = ((t.x % W) + W) % W;
    });
  }

  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    engine,
    scene,
    camera,
    resetCamera,
    resizeCamera,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('wheel', onWheel);
      scene.unregisterBeforeRender(onZoomBeforeRender);
      engine.stopRenderLoop();
      oceanMat.dispose();
      oceanBg.dispose();
      scene.dispose();
      engine.dispose();
    }
  };
}
