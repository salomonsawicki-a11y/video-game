// Summonable phantom companion for Morioh exploration. F summons or
// dismisses the player's stand; Q cycles through all eight. Stands with
// rigged GLB bodies (NULL HOUR, JADE ORACLE, GILDED MENDER) load their
// model and hold the embedded stance, arena-style (clip played but
// paused); the rest use the same procedural bodies as the arena via
// buildStand. The phantom hovers at the player's shoulder JoJo-style.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STANDS, buildStand } from '../game/arena.js';

const GLB = {
  1: './assets/models/theworld.glb',
  2: './assets/models/hierophant.glb',
  4: './assets/models/mender.glb',
};
const SCALE_H = 2.15;   // phantom height in metres next to the 1.75 m player

export function createPhantom(scene) {
  const holder = new THREE.Group();
  holder.visible = false;
  scene.add(holder);

  const bodies = new Array(STANDS.length).fill(null);
  const mixers = new Array(STANDS.length).fill(null);
  let idx = 1;               // NULL HOUR by default
  let active = false;
  let t = 0;

  // stand nameplate, flashes on summon/switch
  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:35;'
    + 'font:700 15px monospace;letter-spacing:3px;padding:6px 18px;display:none;pointer-events:none;'
    + 'background:rgba(8,10,16,.65);border:1px solid rgba(255,255,255,.25)';
  document.body.appendChild(label);
  let labelT = 0;
  function flashLabel() {
    const s = STANDS[idx];
    label.textContent = active ? s.name : s.name + ' — DISMISSED';
    label.style.color = s.css;
    label.style.borderColor = s.css;
    label.style.display = 'block';
    labelT = 2.2;
  }

  function buildBody(i) {
    const wrap = new THREE.Group();
    if (GLB[i]) {
      new GLTFLoader().load(GLB[i], gltf => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        root.scale.setScalar(SCALE_H / (size.y || 1));
        const b2 = new THREE.Box3().setFromObject(root);
        const c = b2.getCenter(new THREE.Vector3());
        root.position.set(-c.x, -b2.min.y, -c.z);
        root.traverse(o => {
          if (!o.isMesh) return;
          o.castShadow = true; o.frustumCulled = false;
          // arena-style tint: untextured near-white materials take the stand colour
          const mt = o.material;
          if (mt && !mt.map && mt.color && mt.color.r > 0.6 && mt.color.g > 0.6 && mt.color.b > 0.6) {
            mt.color.setHex(STANDS[i].hex);
          }
        });
        if (gltf.animations && gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(root);
          const a = mixer.clipAction(gltf.animations[0]);
          a.play(); a.paused = true;      // held stance, same as the arena idle
          mixer.update(0.001);
          mixers[i] = mixer;
        }
        wrap.add(root);
      }, undefined, e => console.error('phantom glb failed', i, e));
    } else {
      // buildStand parents the group to the arena scene hidden, with a ground
      // marker ring — adopt it here, unhide it, and drop the marker
      const m = buildStand(STANDS[i], i);
      m.visible = true;
      if (m.userData.marker) m.userData.marker.visible = false;
      m.scale.setScalar(SCALE_H / 3.4);   // procedural bodies are ~3.4 m in arena units
      wrap.add(m);
    }
    return wrap;
  }

  function show(i) {
    if (!bodies[i]) bodies[i] = buildBody(i);
    for (let k = 0; k < bodies.length; k++) {
      if (bodies[k]) bodies[k].visible = k === i;
      if (bodies[k] && !bodies[k].parent) holder.add(bodies[k]);
    }
  }

  function toggle() {
    active = !active;
    if (active) show(idx);
    holder.visible = active;
    flashLabel();
  }

  function cycle() {
    idx = (idx + 1) % STANDS.length;
    if (active) show(idx);
    flashLabel();
  }

  const target = new THREE.Vector3();
  function update(dt, playerPos, heading) {
    if (labelT > 0) { labelT -= dt; if (labelT <= 0) label.style.display = 'none'; }
    if (!active) return;
    t += dt;
    // hover at the player's left shoulder, slightly behind
    const ox = -0.95, oz = -0.75;
    const s = Math.sin(heading), c = Math.cos(heading);
    target.set(
      playerPos.x + c * ox + s * oz,
      playerPos.y + 0.35 + Math.sin(t * 1.7) * 0.09,
      playerPos.z - s * ox + c * oz);
    const k = 1 - Math.exp(-7 * dt);      // critically-damped-ish follow
    holder.position.lerp(target, k);
    // face where the player faces
    const turn = ((heading - holder.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    holder.rotation.y += turn * Math.min(1, dt * 8);
    if (mixers[idx]) mixers[idx].update(0);  // keep the held pose applied
  }

  return { toggle, cycle, update, get active() { return active; } };
}
