import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, MeshBuilder, StandardMaterial } from '@babylonjs/core';

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

  const fovDeg = 42;
  const fovRad = fovDeg * (Math.PI / 180);
  const beta = Math.PI / 9; // ~20° from vertical (top-down-ish)

  // At near-top-down view, the camera sees a rectangle on the ground.
  // We need to fit the map so width (X) runs left-right on screen.
  // Camera looks nearly straight down, so visible ground extent ≈
  //   horizontal: 2 * cameraHeight * tan(hFov/2)
  //   vertical:   2 * cameraHeight * tan(vFov/2)
  // We want both map dimensions to fit, so use the tighter constraint.
  const aspect = canvas.width / canvas.height || 16 / 9;
  const hFov = 2 * Math.atan(aspect * Math.tan(fovRad / 2));

  // Fit map width to screen width, and map height to screen height
  const heightForWidth = (mapData.width / 2) / Math.tan(hFov / 2);
  const heightForHeight = (mapData.height / 2) / Math.tan(fovRad / 2);
  // Use the larger (tighter) constraint with some padding
  const cameraHeight = Math.max(heightForWidth, heightForHeight) * 1.05;
  const radius = cameraHeight / Math.cos(beta);

  const camera = new ArcRotateCamera(
    'camera',
    -Math.PI / 2,  // alpha: rotated so map X axis runs left-right on screen
    beta,
    radius,
    new Vector3(centerX, 0, centerZ),
    scene
  );
  camera.fov = fovRad;
  camera.lowerBetaLimit = 0.01;
  camera.upperBetaLimit = (90 - 28) * (Math.PI / 180);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = radius * 3;
  camera.panningSensibility = 50;
  camera.wheelPrecision = 10;
  camera.attachControl(canvas, true);

  const hemi = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.4;

  const sun = new DirectionalLight('sun', new Vector3(-1, -2, 1).normalize(), scene);
  sun.intensity = 0.8;

  // Ocean background plane — covers area beyond terrain mesh so no black is visible
  const oceanBg = MeshBuilder.CreateGround('oceanBg', {
    width: mapData.width * 4,
    height: mapData.height * 4
  }, scene);
  oceanBg.position = new Vector3(centerX, -0.4, centerZ);
  const oceanMat = new StandardMaterial('oceanBgMat', scene);
  oceanMat.diffuseColor = new Color3(0.10, 0.29, 0.48);
  oceanBg.material = oceanMat;
  oceanBg.isPickable = false;

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
      oceanMat.dispose();
      oceanBg.dispose();
      scene.dispose();
      engine.dispose();
    }
  };
}
