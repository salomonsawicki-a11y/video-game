// Chunked Morioh terrain. 8x8 tiles of 64 m, two LODs swapped by camera
// distance; three's per-mesh frustum culling handles visibility. The
// material is a slope/height splat blend (grass / rock / sand) built on
// MeshStandardMaterial via onBeforeCompile so it stays fully PBR-lit,
// with triplanar sampling on steep rock so nothing stretches.
// Detail textures are procedural-canvas stand-ins; Higgsfield-generated
// KTX2 sets replace them via setSplatTextures() without touching geometry.
import * as THREE from 'three';
import { getGroundHeight, WORLD_HALF, SEA_LEVEL } from './heightfield.js';
import { mirrorTileInto } from './materials.js';

const TILE = 64, TILES = (WORLD_HALF * 2) / TILE; // 8x8
const SEG_NEAR = 48, SEG_FAR = 12, LOD_DIST = 150;

// ---- procedural stand-in detail textures ------------------------------
function noiseCanvas(base, vary, grain = 42) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256), d = img.data;
  let s = grain;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - 0.5) * 2 * vary;
    d[i] += v; d[i + 1] += v; d[i + 2] += v;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function buildTileGeometry(tx, tz, seg) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const ox = -WORLD_HALF + tx * TILE + TILE / 2;
  const oz = -WORLD_HALF + tz * TILE + TILE / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox, z = pos.getZ(i) + oz;
    pos.setY(i, getGroundHeight(x, z));
  }
  geo.computeVertexNormals();
  geo.translate(0, 0, 0);
  return { geo, ox, oz };
}

export function createTerrain() {
  const group = new THREE.Group();

  const texGrass = noiseCanvas('#4d6b34', 26, 11);
  const texRock  = noiseCanvas('#6d675f', 30, 23);
  const texSand  = noiseCanvas('#c8b183', 20, 37);

  const uniforms = {
    tGrass: { value: texGrass }, tRock: { value: texRock }, tSand: { value: texSand },
    uRepeat: { value: 0.35 },
  };

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0 });
  material.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNorm = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNorm;
        uniform sampler2D tGrass; uniform sampler2D tRock; uniform sampler2D tSand;
        uniform float uRepeat;
        vec3 triplanar(sampler2D t, vec3 p, vec3 n, float rep){
          vec3 an = abs(n); an /= (an.x + an.y + an.z);
          vec3 cx = texture2D(t, p.zy * rep).rgb;
          vec3 cy = texture2D(t, p.xz * rep).rgb;
          vec3 cz = texture2D(t, p.xy * rep).rgb;
          return cx * an.x + cy * an.y + cz * an.z;
        }`)
      .replace('#include <map_fragment>', `
        {
          float slope = 1.0 - clamp(vWNorm.y, 0.0, 1.0);        // 0 flat → 1 vertical
          float rockW = smoothstep(0.28, 0.55, slope);
          float sandW = (1.0 - rockW) * (1.0 - smoothstep(1.0, 3.2, vWPos.y));
          float grassW = max(0.0, 1.0 - rockW - sandW);
          vec3 g = texture2D(tGrass, vWPos.xz * uRepeat).rgb;
          // large-scale meadow patchiness: re-sample the grass noise at a
          // macro frequency and swing between lush and sun-dried tones
          float macro = texture2D(tGrass, vWPos.xz * 0.011).g;
          g *= mix(vec3(0.82, 0.78, 0.55), vec3(1.06, 1.04, 0.95), smoothstep(0.30, 0.62, macro));
          vec3 s = texture2D(tSand,  vWPos.xz * uRepeat).rgb;
          vec3 r = triplanar(tRock, vWPos, vWNorm, uRepeat * 0.6);
          diffuseColor.rgb *= g * grassW + r * rockW + s * sandW;
        }`);
  };

  const tiles = [];
  for (let tz = 0; tz < TILES; tz++) for (let tx = 0; tx < TILES; tx++) {
    const near = buildTileGeometry(tx, tz, SEG_NEAR);
    const far = buildTileGeometry(tx, tz, SEG_FAR);
    const mNear = new THREE.Mesh(near.geo, material);
    const mFar = new THREE.Mesh(far.geo, material);
    mNear.position.set(near.ox, 0, near.oz);
    mFar.position.set(far.ox, 0, far.oz);
    mNear.receiveShadow = true; mFar.receiveShadow = true;
    mFar.visible = false;
    group.add(mNear, mFar);
    tiles.push({ x: near.ox, z: near.oz, mNear, mFar });
  }

  // (the sea is now the Phase 6 water shader, added by explore.js)

  function update(camPos) {
    for (const t of tiles) {
      const d = Math.hypot(camPos.x - t.x, camPos.z - t.z);
      const nearVis = d < LOD_DIST;
      if (t.mNear.visible !== nearVis) { t.mNear.visible = nearVis; t.mFar.visible = !nearVis; }
    }
  }

  function setSplatTextures({ grass, rock, sand }) {
    if (grass) uniforms.tGrass.value = grass;
    if (rock) uniforms.tRock.value = rock;
    if (sand) uniforms.tSand.value = sand;
  }

  // Higgsfield-generated splat textures load in over the stand-ins
  function loadTiled(url, apply) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 1024;
      mirrorTileInto(c, img);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      apply(t);
    };
    img.src = url;
  }
  loadTiled('./assets/textures/grass.png', t => setSplatTextures({ grass: t }));
  loadTiled('./assets/textures/rock.png', t => setSplatTextures({ rock: t }));

  return { group, update, setSplatTextures };
}
