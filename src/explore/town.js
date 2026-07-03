// Town assembler — builds Morioh from assets/config/morioh_layout.json.
// Rearranging the town = editing that JSON; nothing here is per-object.
// Exposes world-space colliders for the Phase 5 character controller.
import * as THREE from 'three';
import { buildPiece } from './kit.js';
import { MAT } from './materials.js';
import { getGroundHeight } from './heightfield.js';

export const worldColliders = []; // { min:Vector3, max:Vector3 }
export const spawns = {};         // name -> { pos:Vector3, yaw }

// drape a road ribbon over the terrain along a polyline
function buildRoad(road) {
  const pts = road.points, half = road.width / 2;
  // resample the polyline every ~4 m
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 2.5));
    for (let j = (i === 0 ? 0 : 1); j <= n; j++) {
      samples.push([x0 + (x1 - x0) * j / n, z0 + (z1 - z0) * j / n]);
    }
  }
  const verts = [], uvs = [], idx = [];
  for (let i = 0; i < samples.length; i++) {
    const [x, z] = samples[i];
    const [xp, zp] = samples[Math.max(0, i - 1)];
    const [xn, zn] = samples[Math.min(samples.length - 1, i + 1)];
    let dx = xn - xp, dz = zn - zp;
    const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const px = -dz, pz = dx; // perpendicular
    for (const s of [-1, 1]) {
      const vx = x + px * half * s, vz = z + pz * half * s;
      verts.push(vx, getGroundHeight(vx, vz) + 0.16, vz);
      uvs.push(s * 0.5 + 0.5, i * 0.25);
    }
    if (i > 0) {
      const a = (i - 1) * 2, b = a + 1, c = i * 2, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = MAT.asphalt.clone();
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// transform a local AABB by rotY (degrees) + position → conservative world AABB
function worldAABB(c, rotYDeg, px, py, pz) {
  const r = rotYDeg * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const xs = [c.min[0], c.max[0]], zs = [c.min[2], c.max[2]];
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const x of xs) for (const z of zs) {
    const wx = x * cos + z * sin, wz = -x * sin + z * cos;
    minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
  }
  return {
    min: new THREE.Vector3(px + minX, py + c.min[1], pz + minZ),
    max: new THREE.Vector3(px + maxX, py + c.max[1], pz + maxZ),
  };
}

export async function buildTown() {
  const layout = await (await fetch('./assets/config/morioh_layout.json')).json();
  const group = new THREE.Group();

  for (const road of layout.roads) group.add(buildRoad(road));

  for (const p of layout.placements) {
    const { group: g, colliders } = buildPiece(p.module);
    const [x, z] = p.pos;
    const y = getGroundHeight(x, z) - 0.04;
    g.position.set(x, y, z);
    g.rotation.y = (p.rotY || 0) * Math.PI / 180;
    group.add(g);
    for (const c of colliders) worldColliders.push(worldAABB(c, p.rotY || 0, x, y, z));
  }

  for (const [name, s] of Object.entries(layout.spawns)) {
    const [x, z] = s.pos;
    spawns[name] = {
      pos: new THREE.Vector3(x, getGroundHeight(x, z), z),
      yaw: (s.yaw || 0) * Math.PI / 180,
    };
  }

  return { group, layout };
}
