// Town assembler — builds Morioh from assets/config/morioh_layout.json.
// Rearranging the town = editing that JSON; nothing here is per-object.
// Exposes world-space colliders for the Phase 5 character controller.
import * as THREE from 'three';
import { buildPiece, KIT } from './kit.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
      idx.push(a, b, c, b, d, c);
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
  mesh.userData.keepUV = true; // road markings depend on the authored UVs
  return mesh;
}

// world-space box projection at 0.5 repeats/m — uniform texel density on
// every merged surface regardless of the source primitive's UV layout.
// Geometry must be non-indexed (vertices grouped in triangles).
function boxProjectUV(g) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const S = 0.5;
  for (let i = 0; i < p.count; i += 3) {
    const e1x = p.getX(i + 1) - p.getX(i), e1y = p.getY(i + 1) - p.getY(i), e1z = p.getZ(i + 1) - p.getZ(i);
    const e2x = p.getX(i + 2) - p.getX(i), e2y = p.getY(i + 2) - p.getY(i), e2z = p.getZ(i + 2) - p.getZ(i);
    const nx = Math.abs(e1y * e2z - e1z * e2y);
    const ny = Math.abs(e1z * e2x - e1x * e2z);
    const nz = Math.abs(e1x * e2y - e1y * e2x);
    for (let k = i; k < i + 3; k++) {
      let u, v;
      if (ny >= nx && ny >= nz) { u = p.getX(k); v = p.getZ(k); }
      else if (nx >= nz)        { u = p.getZ(k); v = p.getY(k); }
      else                      { u = p.getX(k); v = p.getY(k); }
      uv[k * 2] = u * S; uv[k * 2 + 1] = v * S;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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

// Collapse the assembled town (hundreds of small kit meshes sharing a finite
// material palette) into one merged mesh per material — the Phase 7 draw-call
// pass. Colliders are captured separately, so merging visuals is safe.
function mergeStatic(src) {
  src.updateMatrixWorld(true);
  const buckets = new Map();                 // material -> [geometry]
  const casts = new Map();                   // material -> any source mesh cast shadows
  src.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    let g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    // normalise to position/normal/uv so mergeGeometries never rejects a piece
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    if (g.index) g = g.toNonIndexed();   // keep all non-indexed for a clean merge
    if (!o.userData.keepUV) boxProjectUV(g);
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(g);
    casts.set(mat, casts.get(mat) || o.castShadow);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = !!casts.get(mat); mesh.receiveShadow = true;
    out.add(mesh);
  }
  return out;
}

export async function buildTown() {
  const [layout, manifest] = await Promise.all([
    fetch('./assets/config/morioh_layout.json').then(r => r.json()),
    fetch('./assets/config/asset_manifest.json').then(r => r.json()).catch(() => ({ assets: [] })),
  ]);
  const group = new THREE.Group();

  // preload any Higgsfield GLB assets referenced by placements
  const byId = {};
  for (const a of (manifest.assets || [])) byId[a.id] = a;
  const needed = new Set(layout.placements.map(p => p.module).filter(m => !KIT[m] && byId[m]));
  const loaded = {};
  if (needed.size) {
    const loader = new GLTFLoader();
    await Promise.all([...needed].map(id => new Promise(res => {
      loader.load(byId[id].glb, gltf => { loaded[id] = gltf.scene; res(); },
        undefined, err => { console.error('asset load failed', id, err); res(); });
    })));
  }

  function instantiate(module) {
    if (KIT[module]) return buildPiece(module);
    const src = loaded[module];
    if (!src) return { group: new THREE.Group(), colliders: [] };
    const g = src.clone(true);
    const a = byId[module];
    // normalise: scale to the manifest height and rest the base on y=0
    const bb = new THREE.Box3().setFromObject(g);
    const sc = a && a.height ? a.height / Math.max(0.001, bb.max.y - bb.min.y) : 1;
    g.scale.setScalar(sc);
    const ctr = bb.getCenter(new THREE.Vector3());
    g.position.set(-ctr.x * sc, -bb.min.y * sc, -ctr.z * sc);
    const inner = g; // wrap so placement transforms stay clean
    const wrap = new THREE.Group();
    wrap.add(inner);
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      o.userData.keepUV = true;   // authored texture UVs — merge must not box-project them
    });
    const h = a && a.collider ? a.collider : null;   // [hx, hy, hz] half-extents
    const colliders = h ? [{ min: [-h[0], 0, -h[2]], max: [h[0], h[1], h[2]] }]
      : (() => { const b = new THREE.Box3().setFromObject(wrap);
                 return [{ min: [b.min.x, 0, b.min.z], max: [b.max.x, b.max.y, b.max.z] }]; })();
    return { group: wrap, colliders };
  }

  for (const road of layout.roads) group.add(buildRoad(road));

  for (const p of layout.placements) {
    const { group: g, colliders } = instantiate(p.module);
    const [x, z] = p.pos;
    const y = getGroundHeight(x, z) - 0.04;
    g.position.set(x, y, z);
    g.rotation.y = (p.rotY || 0) * Math.PI / 180;
    group.add(g);
    for (const c of colliders) worldColliders.push(worldAABB(c, p.rotY || 0, x, y, z));
  }

  const merged = mergeStatic(group);   // ~one draw call per material

  for (const [name, s] of Object.entries(layout.spawns)) {
    const [x, z] = s.pos;
    spawns[name] = {
      pos: new THREE.Vector3(x, getGroundHeight(x, z), z),
      yaw: (s.yaw || 0) * Math.PI / 180,
    };
  }

  return { group: merged, layout };
}
