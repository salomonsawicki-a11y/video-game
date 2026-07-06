// Third-person character controller for Morioh exploration.
//
// Ground truth comes from two sources, never from render meshes:
//   1. the analytic heightfield (getGroundHeight)
//   2. town collider AABB tops (piers, stairs) within step reach
// Walls are the same AABBs resolved horizontally against a capsule,
// with step-offset so curbs and stair steps are climbable.
import * as THREE from 'three';
import { getGroundHeight } from './heightfield.js';
import { worldColliders } from './town.js';

const WALK = 4.4, RUN = 8.2, JUMP = 5.4, GRAV = 14.5;
const RADIUS = 0.45, HEIGHT = 1.75, STEP = 0.55;
const BOOM_LEN = 4.8, BOOM_UP = 1.55;

export function createController(scene, camera, keys) {
  // --- placeholder avatar (photoreal character lands with the asset pass) ---
  const avatar = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8089a0, roughness: 0.6, metalness: 0.1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(RADIUS * 0.82, HEIGHT - 2 * RADIUS * 0.82, 6, 14), bodyMat);
  body.position.y = HEIGHT / 2;
  body.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.25 }));
  visor.position.set(0, HEIGHT - 0.32, RADIUS * 0.72); // marks the facing direction
  avatar.add(body, visor);
  scene.add(avatar);

  const st = {
    pos: new THREE.Vector3(6, 10, 52),
    vel: new THREE.Vector3(),
    yaw: Math.PI,            // camera yaw
    pitch: 0.28,             // camera pitch (down is +)
    heading: Math.PI,        // avatar facing
    grounded: false,
    locked: false,
  };

  // --- pointer lock look ---
  const cnv = document.querySelector('canvas');
  function onMove(e) {
    if (!st.locked) return;
    st.yaw -= e.movementX * 0.0026;
    st.pitch = Math.max(-0.5, Math.min(1.15, st.pitch + e.movementY * 0.0022));
  }
  document.addEventListener('pointerlockchange', () => { st.locked = document.pointerLockElement === cnv; });
  document.addEventListener('mousemove', onMove);

  function requestLock() { if (!st.locked) cnv.requestPointerLock?.(); }

  // --- ground query: heightfield + collider tops within step reach ---
  function groundAt(x, z, feetY) {
    let g = getGroundHeight(x, z);
    for (const c of worldColliders) {
      if (x < c.min.x - RADIUS * 0.6 || x > c.max.x + RADIUS * 0.6) continue;
      if (z < c.min.z - RADIUS * 0.6 || z > c.max.z + RADIUS * 0.6) continue;
      const top = c.max.y;
      if (top > g && top <= feetY + STEP) g = top;
    }
    return g;
  }

  // --- horizontal capsule-vs-AABB resolution (walls) ---
  function resolveWalls() {
    const feet = st.pos.y;
    for (const c of worldColliders) {
      // skip anything we can simply step onto — the ground pass owns it
      if (c.max.y <= feet + STEP) continue;
      if (c.min.y >= feet + HEIGHT) continue;
      const cx = Math.max(c.min.x, Math.min(st.pos.x, c.max.x));
      const cz = Math.max(c.min.z, Math.min(st.pos.z, c.max.z));
      let dx = st.pos.x - cx, dz = st.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = (RADIUS - d) / d;
        st.pos.x += dx * push; st.pos.z += dz * push;
      } else {
        // center inside the box — push out along the thinnest axis
        const pens = [
          [st.pos.x - c.min.x + RADIUS, -1, 0], [c.max.x - st.pos.x + RADIUS, 1, 0],
          [st.pos.z - c.min.z + RADIUS, 0, -1], [c.max.z - st.pos.z + RADIUS, 0, 1],
        ].sort((a, b) => a[0] - b[0])[0];
        st.pos.x += pens[1] * pens[0]; st.pos.z += pens[2] * pens[0];
      }
    }
  }

  function update(dt) {
    // camera-relative input
    let ix = 0, iz = 0;
    if (keys['w']) iz += 1; if (keys['s']) iz -= 1;
    if (keys['d']) ix += 1; if (keys['a']) ix -= 1;
    const moving = ix !== 0 || iz !== 0;
    const spd = keys['shift'] ? RUN : WALK;
    const sy = Math.sin(st.yaw), cy = Math.cos(st.yaw);
    // forward = away from camera (camera sits behind at yaw)
    const fx = sy, fz = cy, rx = cy, rz = -sy;
    let mx = 0, mz = 0;
    if (moving) {
      const il = Math.hypot(ix, iz);
      mx = (fx * iz + rx * ix) / il; mz = (fz * iz + rz * ix) / il;
      st.heading = Math.atan2(mx, mz);
    }
    st.pos.x += mx * spd * dt;
    st.pos.z += mz * spd * dt;

    resolveWalls();

    // vertical: gravity, jump, ground snap
    const g = groundAt(st.pos.x, st.pos.z, st.pos.y);
    if (st.grounded && keys[' ']) { st.vel.y = JUMP; st.grounded = false; }
    st.vel.y -= GRAV * dt;
    st.pos.y += st.vel.y * dt;
    if (st.pos.y <= g + 0.001) {
      st.pos.y = g; st.vel.y = 0; st.grounded = true;
    } else if (st.grounded && st.pos.y < g + STEP) {
      st.pos.y = g; st.vel.y = 0; // snap down small drops while walking
    } else {
      st.grounded = st.pos.y <= g + 0.001;
    }

    // avatar transform
    avatar.position.copy(st.pos);
    const turn = ((st.heading - avatar.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    avatar.rotation.y += turn * Math.min(1, dt * 10);

    // camera boom, clipped against terrain
    const target = st.pos.clone(); target.y += BOOM_UP;
    const bx = -Math.sin(st.yaw) * Math.cos(st.pitch);
    const by = Math.sin(st.pitch);
    const bz = -Math.cos(st.yaw) * Math.cos(st.pitch);
    let len = BOOM_LEN;
    for (let t = 0.6; t <= BOOM_LEN; t += 0.35) {
      const px = target.x + bx * t, py = target.y + by * t, pz = target.z + bz * t;
      if (py < getGroundHeight(px, pz) + 0.32) { len = t - 0.3; break; }
    }
    camera.position.set(target.x + bx * len, target.y + by * len, target.z + bz * len);
    camera.lookAt(target);
  }

  function teleport(sp) {
    st.pos.copy(sp.pos); st.pos.y += 0.1;
    st.vel.set(0, 0, 0);
    st.yaw = sp.yaw; // camera sits behind, looking along the spawn's facing
    st.heading = sp.yaw;
  }

  return { update, teleport, requestLock, state: st, avatar };
}
