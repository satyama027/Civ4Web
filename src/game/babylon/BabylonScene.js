import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, MeshBuilder, StandardMaterial } from '@babylonjs/core';

/**
 * Compute camera radius so the full map fits within the viewport.
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
  const cz = mapData.height / 2;
  const cx = mapData.width / 2;

  // Near-Z edge (south side) is the binding vertical constraint for a south-looking camera
  const rVert  = cz * (Math.cos(beta) / Math.tan(vHalf) + Math.sin(beta));
  // X edges must fit within horizontal FOV
  const rHoriz = cx / Math.tan(hHalf);

  return Math.max(rVert, rHoriz) * 1.02; // 2% padding
}

/**
 * Create and initialize a Babylon.js scene for a flat rectangular map.
 * @param {HTMLCanvasElement} canvas
 * @param {{ width: number, height: number }} mapData
 * @returns {{ engine: Engine, scene: Scene, camera: ArcRotateCamera, resetCamera: () => void, dispose: () => void }}
 */
export function createScene(canvas, mapData) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  engine.resize();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.055, 0.1, 1);

  const centerX = mapData.width / 2;
  const centerZ = mapData.height / 2;

  const fovDeg = 42;
  const fovRad = fovDeg * (Math.PI / 180);
  const beta = Math.PI / 9; // ~20° from vertical (top-down-ish)

  const radius = computeRadius(canvas, mapData, fovRad, beta);

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

  const resetCamera = () => {
    const r = computeRadius(canvas, mapData, fovRad, beta);
    camera.radius = r;
    camera.upperRadiusLimit = r * 3;
    camera.target = new Vector3(centerX, 0, centerZ);
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

  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    engine,
    scene,
    camera,
    resetCamera,
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
