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

let scene, camera, composer, terrain, inited = false;

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
  addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === 'Escape' && modes.current === 'explore') exitExplore(); });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  const cnv = renderer.domElement;
  cnv.addEventListener('pointerdown', e => { if (modes.current === 'explore') { looking = true; lastX = e.clientX; lastY = e.clientY; } });
  addEventListener('pointerup', () => { looking = false; });
  addEventListener('pointermove', e => {
    if (modes.current !== 'explore' || !looking) return;
    fly.yaw -= (e.clientX - lastX) * 0.004;
    fly.pitch = Math.max(-1.4, Math.min(1.4, fly.pitch - (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });
}

function tick(dt) {
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

export function enterExplore() {
  if (!inited) init();
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  modes.enter('explore');
}

function exitExplore() {
  modes.enter('arena');
  document.getElementById('overlay').style.display = 'flex';
}

modes.register('explore', tick);
document.getElementById('exploreBtn').addEventListener('click', () => enterExplore());
