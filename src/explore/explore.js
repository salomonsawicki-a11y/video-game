// Morioh exploration mode — Phase 2: terrain + debug fly camera.
// Phase 5 replaces the fly camera with the third-person character
// controller; the scene, lighting, and terrain stay.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect } from 'postprocessing';
import { renderer } from '../core/renderer.js';
import { modes } from '../core/modes.js';
import { createTerrain } from './terrain.js';
import { getGroundHeight } from './heightfield.js';
import { KIT, buildPiece } from './kit.js';
import { buildTown, spawns, worldColliders } from './town.js';
import { createController } from './controller.js';

let scene, camera, composer, terrain, ctl = null, inited = false;
const FLY = new URLSearchParams(location.search).has('fly');

// debug fly camera state
const fly = { yaw: 2.6, pitch: -0.25, pos: new THREE.Vector3(-40, 26, 120), speed: 24 };
const keys = {};
let looking = false, lastX = 0, lastY = 0;

function init() {
  inited = true;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb8d4);
  scene.fog = new THREE.Fog(0xa8bccc, 120, 520);

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);

  // lighting: sun + IBL (placeholder env until the HDR sky in Phase 6)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const sun = new THREE.DirectionalLight(0xfff3e0, 3.4);
  sun.position.set(-120, 160, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160;
  sc.near = 10; sc.far = 500;
  scene.add(sun);

  terrain = createTerrain();
  scene.add(terrain.group);

  // assemble the town from the layout config (async; terrain is already live)
  buildTown().then(({ group }) => {
    scene.add(group);
    const s0 = spawns.town_center;
    if (s0) {
      if (ctl) ctl.teleport(s0);
      else { fly.pos.copy(s0.pos).add(new THREE.Vector3(-Math.sin(s0.yaw) * 14, 8, -Math.cos(s0.yaw) * 14)); fly.yaw = s0.yaw; }
    }
  }).catch(e => console.error('town build failed', e));

  // ?kit — lay the whole building kit out in a grid for eyeballing
  if (new URLSearchParams(location.search).has('kit')) {
    const ids = Object.keys(KIT);
    const cols = 6, gap = 16, ox = -40, oz = 60;
    ids.forEach((id, i) => {
      const { group } = buildPiece(id);
      const x = ox + (i % cols) * gap, z = oz + Math.floor(i / cols) * gap;
      group.position.set(x, getGroundHeight(x, z), z);
      scene.add(group);
    });
    fly.pos.set(ox + 40, getGroundHeight(ox + 40, oz + 55) + 9, oz + 55);
    fly.yaw = Math.PI; fly.pitch = -0.25;
  }

  if (!FLY) ctl = createController(scene, camera, keys);
  if (new URLSearchParams(location.search).has('debug')) {
    window.EXDBG = { get state() { return ctl && ctl.state; }, spawns, worldColliders };
  }

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera,
    new BloomEffect({ intensity: 0.35, luminanceThreshold: 0.8, mipmapBlur: true }),
    new SMAAEffect()));
  composer.setSize(innerWidth, innerHeight);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    composer.setSize(innerWidth, innerHeight);
  });

  // fly-cam input (debug; Phase 5 replaces with pointer-lock controller)
  addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (modes.current !== 'explore') return;
    if (e.key === ' ') e.preventDefault();
    if (e.key === 'Escape' && !document.pointerLockElement) exitExplore();
    const names = Object.keys(spawns);
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= names.length) {
      const sp = spawns[names[n - 1]];
      if (ctl) ctl.teleport(sp);
      else {
        fly.pos.copy(sp.pos).add(new THREE.Vector3(-Math.sin(sp.yaw) * 12, 7, -Math.cos(sp.yaw) * 12));
        fly.yaw = sp.yaw; fly.pitch = -0.3;
      }
    }
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  const cnv = renderer.domElement;
  cnv.addEventListener('pointerdown', e => {
    if (modes.current !== 'explore') return;
    if (ctl) { ctl.requestLock(); return; }
    looking = true; lastX = e.clientX; lastY = e.clientY;
  });
  addEventListener('pointerup', () => { looking = false; });
  addEventListener('pointermove', e => {
    if (modes.current !== 'explore' || !looking) return;
    fly.yaw -= (e.clientX - lastX) * 0.004;
    fly.pitch = Math.max(-1.4, Math.min(1.4, fly.pitch - (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });
}

function tick(dt) {
  if (ctl) {
    ctl.update(dt);
    terrain.update(ctl.state.pos);
    composer.render();
    return;
  }
  const fwd = new THREE.Vector3(Math.sin(fly.yaw) * Math.cos(fly.pitch), Math.sin(fly.pitch), Math.cos(fly.yaw) * Math.cos(fly.pitch));
  const right = new THREE.Vector3(Math.cos(fly.yaw), 0, -Math.sin(fly.yaw));
  const sp = fly.speed * (keys['shift'] ? 3 : 1) * dt;
  if (keys['w']) fly.pos.addScaledVector(fwd, sp);
  if (keys['s']) fly.pos.addScaledVector(fwd, -sp);
  if (keys['d']) fly.pos.addScaledVector(right, sp);
  if (keys['a']) fly.pos.addScaledVector(right, -sp);
  if (keys['e']) fly.pos.y += sp;
  if (keys['q']) fly.pos.y -= sp;
  // never sink under the ground
  const gy = getGroundHeight(fly.pos.x, fly.pos.z) + 1.7;
  if (fly.pos.y < gy) fly.pos.y = gy;

  camera.position.copy(fly.pos);
  camera.lookAt(fly.pos.clone().add(fwd));
  terrain.update(fly.pos);
  composer.render();
}

let hintEl = null;
export function enterExplore() {
  if (!inited) init();
  if (!hintEl) {
    hintEl = document.createElement('div');
    hintEl.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:30;'
      + 'font:11px monospace;letter-spacing:1px;color:#dfe8f0;background:rgba(10,14,20,.55);'
      + 'padding:6px 14px;border:1px solid rgba(160,190,210,.35);pointer-events:none';
    hintEl.textContent = FLY ? 'WASD fly · Q/E down/up · SHIFT fast · drag to look · 1-5 teleport · ESC menu'
      : 'CLICK to capture mouse · WASD move · SHIFT run · SPACE jump · 1-5 teleport (town/shops/harbor/park/overlook) · ESC menu';
    document.body.appendChild(hintEl);
  }
  hintEl.style.display = 'block';
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  modes.enter('explore');
}

function exitExplore() {
  modes.enter('arena');
  document.getElementById('overlay').style.display = 'flex';
  if (hintEl) hintEl.style.display = 'none';
}

modes.register('explore', tick);
document.getElementById('exploreBtn').addEventListener('click', () => enterExplore());
