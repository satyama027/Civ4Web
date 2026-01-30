import { ShaderMaterial, RawTexture, Texture, Vector2, Vector3, Constants, Effect, Color3, StandardMaterial } from '@babylonjs/core';

/** RGB values per terrain type (used for vertex color fallback) */
export const TERRAIN_RGB = {
  ocean:     [0.10, 0.29, 0.48],
  coast:     [0.23, 0.54, 0.69],
  grassland: [0.29, 0.60, 0.29],
  plains:    [0.72, 0.63, 0.38],
  desert:    [0.91, 0.82, 0.63],
  tundra:    [0.60, 0.67, 0.67],
  snow:      [0.94, 0.94, 0.94],
};

/** Terrain name → shader index (must match fragment shader) */
export const TERRAIN_INDEX = {
  ocean: 0, coast: 1, grassland: 2, plains: 3,
  desert: 4, tundra: 5, snow: 6,
};

const DETAIL_TEXTURES = [
  { sampler: 'detailOcean',  file: 'oceandetail.dds' },
  { sampler: 'detailCoast',  file: 'coastdetail.dds' },
  { sampler: 'detailGrass',  file: 'grassdetail.dds' },
  { sampler: 'detailPlains', file: 'plainsdetail.dds' },
  { sampler: 'detailDesert', file: 'desertdetail.dds' },
  { sampler: 'detailTundra', file: 'tundradetail.dds' },
  { sampler: 'detailIce',    file: 'icedetail.dds' },
];

// Register shaders in Babylon's ShadersStore
Effect.ShadersStore['terrainVertexShader'] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

uniform mat4 worldViewProjection;
uniform mat4 world;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;

void main() {
    vec4 wp = world * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vColor = color;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

Effect.ShadersStore['terrainFragmentShader'] = `
precision highp float;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;

uniform sampler2D terrainIdTex;
uniform vec2 mapSize;
uniform float detailTiling;
uniform vec3 lightDir;
uniform float useTextures;

uniform sampler2D detailOcean;
uniform sampler2D detailCoast;
uniform sampler2D detailGrass;
uniform sampler2D detailPlains;
uniform sampler2D detailDesert;
uniform sampler2D detailTundra;
uniform sampler2D detailIce;

// Base terrain tint colors (must match TERRAIN_RGB order)
const vec3 TINT_COLORS[7] = vec3[7](
    vec3(0.10, 0.29, 0.48),  // ocean
    vec3(0.23, 0.54, 0.69),  // coast
    vec3(0.29, 0.60, 0.29),  // grassland
    vec3(0.72, 0.63, 0.38),  // plains
    vec3(0.91, 0.82, 0.63),  // desert
    vec3(0.60, 0.67, 0.67),  // tundra
    vec3(0.94, 0.94, 0.94)   // snow/ice
);

vec3 getDetailColor(int idx, vec2 uv) {
    vec3 tex;
    if (idx == 0) tex = texture2D(detailOcean, uv).rgb;
    else if (idx == 1) tex = texture2D(detailCoast, uv).rgb;
    else if (idx == 2) tex = texture2D(detailGrass, uv).rgb;
    else if (idx == 3) tex = texture2D(detailPlains, uv).rgb;
    else if (idx == 4) tex = texture2D(detailDesert, uv).rgb;
    else if (idx == 5) tex = texture2D(detailTundra, uv).rgb;
    else if (idx == 6) tex = texture2D(detailIce, uv).rgb;
    else tex = texture2D(detailGrass, uv).rgb;
    return tex;
}

vec3 sampleTerrain(int idx, vec2 uv) {
    vec3 detail = getDetailColor(idx, uv);
    // Use detail texture luminance as variation on top of base color
    float lum = dot(detail, vec3(0.299, 0.587, 0.114));
    vec3 tint = (idx >= 0 && idx < 7) ? TINT_COLORS[idx] : vec3(0.5);
    // Blend: base color modulated by detail texture variation
    return tint * (0.5 + lum);
}

int getTerrainAt(vec2 tilePos) {
    vec2 uv = (tilePos + 0.5) / mapSize;
    uv = clamp(uv, vec2(0.0), vec2(1.0));
    float val = texture2D(terrainIdTex, uv).r;
    return int(val * 255.0 + 0.5);
}

void main() {
    float NdotL = max(dot(vNormal, -lightDir), 0.0);
    float lighting = 0.4 + 0.6 * NdotL;

    // Textured path
    if (useTextures > 0.5) {
        vec2 detailUV = vWorldPos.xz * detailTiling;
        vec2 tileCoord = vWorldPos.xz;
        vec2 baseTile = floor(tileCoord);
        vec2 f = fract(tileCoord);

        int centerIdx = getTerrainAt(baseTile);
        vec3 texColor = sampleTerrain(centerIdx, detailUV);

        float blendZone = 0.3;

        if (f.x < blendZone) {
            int nIdx = getTerrainAt(baseTile + vec2(-1.0, 0.0));
            if (nIdx != centerIdx) {
                float w = smoothstep(0.0, blendZone, f.x);
                texColor = mix(sampleTerrain(nIdx, detailUV), texColor, w);
            }
        }
        if (f.x > 1.0 - blendZone) {
            int nIdx = getTerrainAt(baseTile + vec2(1.0, 0.0));
            if (nIdx != centerIdx) {
                float w = smoothstep(0.0, blendZone, 1.0 - f.x);
                texColor = mix(sampleTerrain(nIdx, detailUV), texColor, w);
            }
        }
        if (f.y < blendZone) {
            int nIdx = getTerrainAt(baseTile + vec2(0.0, -1.0));
            if (nIdx != centerIdx) {
                float w = smoothstep(0.0, blendZone, f.y);
                texColor = mix(sampleTerrain(nIdx, detailUV), texColor, w);
            }
        }
        if (f.y > 1.0 - blendZone) {
            int nIdx = getTerrainAt(baseTile + vec2(0.0, 1.0));
            if (nIdx != centerIdx) {
                float w = smoothstep(0.0, blendZone, 1.0 - f.y);
                texColor = mix(sampleTerrain(nIdx, detailUV), texColor, w);
            }
        }

        gl_FragColor = vec4(texColor * lighting, 1.0);
        return;
    }

    // Fallback: vertex colors only
    gl_FragColor = vec4(vColor.rgb * lighting, 1.0);
}
`;

/**
 * Create a RawTexture encoding terrain type index per tile.
 */
function createTerrainIdTexture(scene, mapData) {
  const W = mapData.width;
  const H = mapData.height;
  const data = new Uint8Array(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = mapData.getTile(x, y);
      const idx = TERRAIN_INDEX[tile?.terrain] ?? TERRAIN_INDEX.grassland;
      const offset = (y * W + x) * 4;
      data[offset] = idx;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 255;
    }
  }

  return new RawTexture(
    data, W, H,
    Constants.TEXTUREFORMAT_RGBA,
    scene,
    false, false,
    Texture.NEAREST_SAMPLINGMODE,
    Constants.TEXTURETYPE_UNSIGNED_BYTE
  );
}

/**
 * Create the terrain material. Starts with vertex colors, upgrades to
 * DDS textures once they finish loading.
 * @param {import('@babylonjs/core').Scene} scene
 * @param {Object} mapData
 * @returns {StandardMaterial|ShaderMaterial}
 */
export function createTerrainMaterial(scene, mapData) {
  // Start with StandardMaterial for immediate vertex-color rendering
  const fallbackMat = new StandardMaterial('terrainFallback', scene);
  fallbackMat.diffuseColor = new Color3(1, 1, 1);
  fallbackMat.specularColor = new Color3(0.05, 0.05, 0.05);
  fallbackMat.backFaceCulling = true;

  // Build ShaderMaterial in parallel
  const shaderMat = new ShaderMaterial('terrainShader', scene, {
    vertex: 'terrain',
    fragment: 'terrain',
  }, {
    attributes: ['position', 'normal', 'color'],
    uniforms: ['worldViewProjection', 'world', 'mapSize', 'detailTiling', 'lightDir', 'useTextures'],
    samplers: ['terrainIdTex', ...DETAIL_TEXTURES.map(t => t.sampler)],
    needAlphaBlending: false,
  });

  shaderMat.backFaceCulling = true;
  shaderMat.setVector2('mapSize', new Vector2(mapData.width, mapData.height));
  shaderMat.setFloat('detailTiling', 0.5);
  shaderMat.setVector3('lightDir', new Vector3(-1, -2, 1).normalize());
  shaderMat.setFloat('useTextures', 0.0);

  // Terrain ID texture
  const idTex = createTerrainIdTexture(scene, mapData);
  shaderMat.setTexture('terrainIdTex', idTex);

  // Load detail DDS textures
  let loadedCount = 0;
  const totalTextures = DETAIL_TEXTURES.length;

  // Store reference to the mesh so we can swap materials
  shaderMat._terrainMesh = null;
  shaderMat._fallbackMat = fallbackMat;

  for (const { sampler, file } of DETAIL_TEXTURES) {
    const tex = new Texture(
      `/textures/terrain/${file}`,
      scene,
      false, false,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        loadedCount++;
        console.log(`[Terrain] Loaded ${file} (${loadedCount}/${totalTextures})`);
        if (loadedCount === totalTextures) {
          shaderMat.setFloat('useTextures', 1.0);
          console.log('[Terrain] All textures loaded — switching to shader material');
          // Swap the mesh material to the shader
          if (shaderMat._terrainMesh) {
            shaderMat._terrainMesh.material = shaderMat;
          }
        }
      },
      (msg) => {
        console.warn(`[Terrain] Failed to load ${file}:`, msg);
      }
    );
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
    shaderMat.setTexture(sampler, tex);
  }

  // Return the fallback; caller should also store shaderMat reference
  fallbackMat._shaderMat = shaderMat;
  return fallbackMat;
}
