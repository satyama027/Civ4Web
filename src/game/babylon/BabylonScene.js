import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color4 } from '@babylonjs/core';

/**
 * Create and initialize a Babylon.js scene for a flat rectangular map.
 * @param {HTMLCanvasElement} canvas
 * @param {{ width: number, height: number }} mapData
 * @returns {{ engine: Engine, scene: Scene, camera: ArcRotateCamera, dispose: () => void }}
 */
export function createScene(canvas, mapData) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.055, 0.1, 1);

  const centerX = mapData.width / 2;
  const centerZ = mapData.height / 2;

  // Civ4 GlobalDefines: CAMERA_LOWER_PITCH=-28°, CAMERA_UPPER_PITCH=-90°, FOV=42°
  // Civ4 starts zoomed out (near top-down). Use beta ~20° from vertical (fairly top-down)
  // so the wider map width dominates the horizontal screen axis.
  const fovDeg = 42;
  const fovRad = fovDeg * (Math.PI / 180);
  const beta = Math.PI / 9; // ~20° from vertical (top-down-ish, like Civ4 zoomed out)

  // Compute radius so the full map width fits horizontally.
  // Camera height above ground = radius * cos(beta)
  // Horizontal half-extent visible = height * tan(hFov/2)
  // where hFov ≈ vFov * aspect. Assume ~16:9 aspect.
  const aspect = canvas.width / canvas.height || 16 / 9;
  const hFov = 2 * Math.atan(aspect * Math.tan(fovRad / 2));
  const cameraHeight = (mapData.width / 2) / Math.tan(hFov / 2);
  const radius = cameraHeight / Math.cos(beta);

  const camera = new ArcRotateCamera(
    'camera',
    0,         // alpha: straight (no horizontal rotation)
    beta,
    radius,
    new Vector3(centerX, 0, centerZ),
    scene
  );
  camera.fov = fovRad;
  camera.lowerBetaLimit = 0.01;                            // straight down (Civ4: -90° pitch)
  camera.upperBetaLimit = (90 - 28) * (Math.PI / 180);     // 62° from vertical (Civ4: -28° pitch)
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = radius * 3;
  camera.panningSensibility = 50;
  camera.wheelPrecision = 10;
  camera.attachControl(canvas, true);

  const hemi = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.4;

  const sun = new DirectionalLight('sun', new Vector3(-1, -2, 1).normalize(), scene);
  sun.intensity = 0.8;

  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    engine,
    scene,
    camera,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    }
  };
}
