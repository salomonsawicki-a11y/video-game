// Density-mapped instanced detail scatter — grass tufts on gentle grassy
// ground, rocks on steep/beach ground. Chunked into terrain-aligned regions
// so each InstancedMesh has real bounds for frustum culling, plus a
// distance toggle so far chunks drop out entirely. Scatter never casts
// shadows (respects the shadow-caster budget) and never collides.
// Placeholder tuft/rock geometry swaps for Higgsfield foliage/rock meshes
// via the same region assembly.
import * as THREE from 'three';
import { getGroundHeight, getGroundNormal, WORLD_HALF, SEA_LEVEL } from './heightfield.js';
import { MAT } from './materials.js';

const REGION = 64, REGIONS = (WORLD_HALF * 2) / REGION;
const GRASS_DIST = 115, ROCK_DIST = 160;

// deterministic per-point rng
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// a grass tuft: three crossed blades (cheap, no alpha)
function tuftGeo() {
  const blade = new THREE.PlaneGeometry(0.34, 0.6);
  blade.translate(0, 0.3, 0);
  const geos = [];
  for (let i = 0; i < 3; i++) {
    const g = blade.clone(); g.rotateY(i * Math.PI / 3); geos.push(g);
  }
  // manual merge (avoid BufferGeometryUtils dependency at runtime)
  let vTotal = 0, iTotal = 0;
  for (const g of geos) { vTotal += g.attributes.position.count; iTotal += g.index.count; }
  const pos = new Float32Array(vTotal * 3), nrm = new Float32Array(vTotal * 3), idx = new Uint16Array(iTotal);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3);
    nrm.set(g.attributes.normal.array, vo * 3);
    const gi = g.index.array;
    for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo;
    vo += g.attributes.position.count; io += gi.length;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

export function createScatter(worldColliders) {
  const group = new THREE.Group();
  const chunks = []; // { cx, cz, mesh, dist }

  const grassGeo = tuftGeo();
  const grassMat = MAT.foliage.clone(); grassMat.side = THREE.DoubleSide; grassMat.roughness = 1.0;
  const rockGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const rockMat = MAT.stone.clone(); rockMat.roughness = 1.0;

  // buildings/walls we must not scatter on (tall colliders only)
  const blockers = worldColliders.filter(c => c.max.y - c.min.y > 1.2);
  const blocked = (x, z) => {
    for (const c of blockers) {
      if (x > c.min.x - 0.6 && x < c.max.x + 0.6 && z > c.min.z - 0.6 && z < c.max.z + 0.6) return true;
    }
    return false;
  };

  const nrm = new THREE.Vector3();
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();

  for (let rz = 0; rz < REGIONS; rz++) for (let rx = 0; rx < REGIONS; rx++) {
    const ox = -WORLD_HALF + rx * REGION, oz = -WORLD_HALF + rz * REGION;
    const cx = ox + REGION / 2, cz = oz + REGION / 2;
    const rnd = rng((rx * 73856093) ^ (rz * 19349663));
    const grassM = [], rockM = [];

    // grass candidates: 4 m grid + jitter
    for (let gz = 0; gz < REGION; gz += 4) for (let gx = 0; gx < REGION; gx += 4) {
      const x = ox + gx + (rnd() - 0.5) * 3.5, z = oz + gz + (rnd() - 0.5) * 3.5;
      const y = getGroundHeight(x, z);
      if (y < SEA_LEVEL + 0.8) continue;
      getGroundNormal(x, z, nrm);
      if (nrm.y < 0.86) continue;          // too steep for grass
      if (rnd() > 0.55) continue;          // density
      if (blocked(x, z)) continue;
      q.setFromAxisAngle(up, rnd() * Math.PI * 2);
      const sc = 0.7 + rnd() * 0.9; scl.set(sc, sc * (0.8 + rnd() * 0.6), sc);
      pos.set(x, y - 0.05, z);
      grassM.push(mtx.clone().compose(pos, q, scl));
    }
    // rock candidates: 10 m grid, on steeper or beach ground
    for (let gz = 2; gz < REGION; gz += 10) for (let gx = 2; gx < REGION; gx += 10) {
      const x = ox + gx + (rnd() - 0.5) * 6, z = oz + gz + (rnd() - 0.5) * 6;
      const y = getGroundHeight(x, z);
      if (y < SEA_LEVEL - 1) continue;
      getGroundNormal(x, z, nrm);
      const steep = nrm.y < 0.82, beach = y < SEA_LEVEL + 2.2;
      if (!steep && !beach) continue;
      if (rnd() > 0.4) continue;
      if (blocked(x, z)) continue;
      q.setFromAxisAngle(new THREE.Vector3(rnd(), 1, rnd()).normalize(), rnd() * Math.PI * 2);
      const sc = 0.5 + rnd() * 1.6; scl.set(sc, sc * (0.6 + rnd() * 0.5), sc);
      pos.set(x, y - sc * 0.15, z);
      rockM.push(mtx.clone().compose(pos, q, scl));
    }

    for (const [geo, mat, arr, dist] of [[grassGeo, grassMat, grassM, GRASS_DIST], [rockGeo, rockMat, rockM, ROCK_DIST]]) {
      if (!arr.length) continue;
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      im.castShadow = false; im.receiveShadow = true;
      arr.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = true;
      im.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 5, cz), REGION * 0.75);
      group.add(im);
      chunks.push({ cx, cz, mesh: im, dist });
    }
  }

  function update(camPos) {
    for (const c of chunks) {
      const d = Math.hypot(camPos.x - c.cx, camPos.z - c.cz);
      const vis = d < c.dist;
      if (c.mesh.visible !== vis) c.mesh.visible = vis;
    }
  }

  return { group, update, count: chunks.reduce((a, c) => a + c.mesh.count, 0) };
}
