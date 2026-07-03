// The Morioh modular building kit — hand-built geometry only (the brief
// forbids generated meshes for tiling kit pieces). Every piece returns
//   { group, colliders } — colliders are LOCAL-space AABBs
//   ({ min:[x,y,z], max:[x,y,z] }); the town assembler transforms them.
// Pieces face +Z; origin at ground center of the footprint.
import * as THREE from 'three';
import { MAT } from './materials.js';

const B = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};
const box = (min, max) => ({ min, max });

// gabled roof: two pitched slabs + triangular gable infills, ridge along X
function gableRoof(w, d, rise, mat, overhang = 0.45, thick = 0.12) {
  const g = new THREE.Group();
  const halfD = d / 2 + overhang;
  const slope = Math.hypot(halfD, rise);
  const ang = Math.atan2(rise, halfD);
  const mk = (sign) => {
    const s = B(w + overhang * 2, thick, slope, mat);
    s.rotation.x = sign * ang;
    s.position.set(0, rise / 2, sign * halfD / 2);
    return s;
  };
  g.add(mk(1), mk(-1));
  // gable infill triangles (extruded shapes at ±X)
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, rise); shape.closePath();
  const tri = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(tri, MAT.plaster);
    m.rotation.y = sx * Math.PI / 2;
    m.position.set(sx * (w / 2 - 0.05), 0, sx * 0.05);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function windows(g, w, h, d, y, mat = MAT.glass) {
  // simple recessed window planes on front/back
  for (const sz of [-1, 1]) {
    for (let x = -w / 2 + 1.2; x <= w / 2 - 1.2; x += 2.2) {
      const win = B(1.1, 1.0, 0.06, mat, x, y, sz * (d / 2 + 0.02));
      const frame = B(1.25, 1.15, 0.05, MAT.woodDark, x, y, sz * (d / 2 + 0.01));
      g.add(frame, win);
    }
  }
}

// ---------------- housing ----------------
function houseSmall() {
  const g = new THREE.Group();
  const w = 7, d = 5.6, hh = 3.0;
  g.add(B(w, 0.35, d, MAT.concrete, 0, 0.175, 0));                 // foundation
  g.add(B(w - 0.2, hh, d - 0.2, MAT.plaster, 0, 0.35 + hh / 2, 0)); // body
  const roof = gableRoof(w + 0.3, d + 0.3, 1.7, MAT.roofBlue);
  roof.position.y = 0.35 + hh;
  g.add(roof);
  g.add(B(1.0, 2.1, 0.08, MAT.woodDark, w / 4, 0.35 + 1.05, d / 2 + 0.02)); // door
  windows(g, w, hh, d, 1.9);
  return { group: g, colliders: [box([-w / 2, 0, -d / 2], [w / 2, 0.35 + hh + 1.7, d / 2])] };
}

function houseTwoStory() {
  const g = new THREE.Group();
  const w = 7.5, d = 6.2, hh = 5.6;
  g.add(B(w, 0.35, d, MAT.concrete, 0, 0.175, 0));
  g.add(B(w - 0.2, hh, d - 0.2, MAT.plasterTan, 0, 0.35 + hh / 2, 0));
  g.add(B(w + 0.5, 0.16, d + 0.5, MAT.roofGrey, 0, 0.35 + 2.85, 0)); // floor band
  const roof = gableRoof(w + 0.3, d + 0.3, 1.9, MAT.roofGrey);
  roof.position.y = 0.35 + hh;
  g.add(roof);
  g.add(B(1.0, 2.1, 0.08, MAT.woodDark, -w / 4, 0.35 + 1.05, d / 2 + 0.02));
  windows(g, w, hh, d, 1.9);
  windows(g, w, hh, d, 4.5);
  // small balcony
  g.add(B(2.6, 0.1, 1.1, MAT.concrete, w / 4, 3.6, d / 2 + 0.55));
  g.add(B(2.6, 0.7, 0.06, MAT.metalWhite, w / 4, 3.98, d / 2 + 1.08));
  return { group: g, colliders: [box([-w / 2, 0, -d / 2], [w / 2, 0.35 + hh + 1.9, d / 2])] };
}

function houseWestern() {
  const g = new THREE.Group();
  const w = 8.5, d = 7, hh = 4.6;
  g.add(B(w, 0.4, d, MAT.stone, 0, 0.2, 0));
  g.add(B(w - 0.2, hh, d - 0.2, MAT.brick, 0, 0.4 + hh / 2, 0));
  // hip roof: squashed 4-sided pyramid
  const pyr = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 * 0.78, 2.4, 4), MAT.roofTerra);
  pyr.rotation.y = Math.PI / 4;
  pyr.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  pyr.position.y = 0.4 + hh + 1.2;
  pyr.castShadow = pyr.receiveShadow = true;
  g.add(pyr);
  g.add(B(1.2, 2.3, 0.1, MAT.woodDark, 0, 0.4 + 1.15, d / 2 + 0.03));
  windows(g, w, hh, d, 2.0);
  windows(g, w, hh, d, 3.6);
  return { group: g, colliders: [box([-w / 2, 0, -d / 2], [w / 2, 0.4 + hh + 2.4, d / 2])] };
}

// ---------------- commercial ----------------
function shopUnit() {
  const g = new THREE.Group();
  const w = 6, d = 6, hh = 4.4;
  g.add(B(w, hh, d, MAT.plasterTan, 0, hh / 2, 0));
  // glass storefront
  g.add(B(w - 1.0, 2.3, 0.08, MAT.glass, 0, 1.35, d / 2 + 0.04));
  g.add(B(w, 0.5, 0.1, MAT.woodDark, 0, 2.75, d / 2 + 0.05));
  // awning
  const aw = B(w - 0.6, 0.08, 1.3, MAT.signRed, 0, 3.05, d / 2 + 0.7);
  aw.rotation.x = 0.28;
  g.add(aw);
  // signboard (texture slot — swap material.map with generated signage)
  g.add(B(w - 1.2, 0.9, 0.12, MAT.signTeal, 0, 3.8, d / 2 + 0.08));
  return { group: g, colliders: [box([-w / 2, 0, -d / 2], [w / 2, hh, d / 2])] };
}

function konbini() {
  const g = new THREE.Group();
  const w = 12, d = 9, hh = 4.2;
  g.add(B(w, hh, d, MAT.plaster, 0, hh / 2, 0));
  g.add(B(w - 2.5, 2.4, 0.08, MAT.glass, 0, 1.4, d / 2 + 0.05));
  g.add(B(w + 0.4, 0.9, d + 0.4, MAT.concrete, 0, hh + 0.45, 0)); // parapet
  g.add(B(w - 1.0, 0.8, 0.14, MAT.signTeal, 0, 3.55, d / 2 + 0.1)); // sign band
  g.add(B(2.0, 0.8, 0.14, MAT.signRed, -w / 2 + 1.4, 3.55, d / 2 + 0.11));
  return { group: g, colliders: [box([-w / 2, 0, -d / 2], [w / 2, hh + 0.9, d / 2])] };
}

// ---------------- walls, hedges, stairs ----------------
function wallBlock() { // 3 m garden wall segment
  const g = new THREE.Group();
  g.add(B(3, 1.8, 0.28, MAT.concrete, 0, 0.9, 0));
  g.add(B(3, 0.12, 0.4, MAT.stone, 0, 1.86, 0)); // coping
  return { group: g, colliders: [box([-1.5, 0, -0.2], [1.5, 1.95, 0.2])] };
}

function hedge() { // 3 m hedge segment
  const g = new THREE.Group();
  g.add(B(3, 1.3, 0.9, MAT.foliageHedge, 0, 0.75, 0));
  return { group: g, colliders: [box([-1.5, 0, -0.45], [1.5, 1.4, 0.45])] };
}

function retainingWall() { // 4 m hillside retaining segment, 2.6 m tall
  const g = new THREE.Group();
  const w = B(4, 2.6, 0.5, MAT.stone, 0, 1.3, 0);
  w.rotation.x = -0.08; // slight batter
  g.add(w);
  return { group: g, colliders: [box([-2, 0, -0.35], [2, 2.65, 0.35])] };
}

function stairs() { // concrete stairs: 8 steps up 2.0 m over 3.2 m run, 2.4 m wide
  const g = new THREE.Group();
  const steps = 8, rise = 0.25, run = 0.4, w = 2.4;
  const colliders = [];
  for (let i = 0; i < steps; i++) {
    const y = rise * (i + 0.5), z = -run * (i + 0.5);
    g.add(B(w, rise, run, MAT.concrete, 0, y, z));
    colliders.push(box([-w / 2, 0, z - run / 2], [w / 2, rise * (i + 1), z + run / 2]));
  }
  // side rails
  for (const sx of [-1, 1]) {
    const r = B(0.08, 0.9, steps * run, MAT.metalGrey, sx * (w / 2 + 0.05), steps * rise / 2 + 0.55, -steps * run / 2);
    r.rotation.x = Math.atan2(rise, run) * 0; g.add(r);
  }
  return { group: g, colliders };
}

function guardrail() { // 3 m white JP guardrail
  const g = new THREE.Group();
  for (const x of [-1.3, 1.3]) g.add(B(0.1, 0.75, 0.1, MAT.metalWhite, x, 0.375, 0));
  g.add(B(3, 0.28, 0.06, MAT.metalWhite, 0, 0.72, 0));
  return { group: g, colliders: [box([-1.5, 0, -0.08], [1.5, 0.9, 0.08])] };
}

// ---------------- street furniture ----------------
function lampPost() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), MAT.metalGrey);
  pole.position.y = 2.3; pole.castShadow = true;
  g.add(pole);
  const arm = B(0.9, 0.07, 0.07, MAT.metalGrey, 0.45, 4.5, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffd9a0, emissiveIntensity: 1.6, roughness: 0.4 }));
  head.position.set(0.9, 4.42, 0);
  g.add(arm, head);
  return { group: g, colliders: [box([-0.12, 0, -0.12], [0.12, 4.6, 0.12])] };
}

function powerPole() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 8.5, 8), MAT.concrete);
  pole.position.y = 4.25; pole.castShadow = true;
  g.add(pole);
  g.add(B(2.2, 0.09, 0.09, MAT.woodDark, 0, 7.6, 0));
  g.add(B(1.6, 0.09, 0.09, MAT.woodDark, 0, 6.9, 0));
  return { group: g, colliders: [box([-0.16, 0, -0.16], [0.16, 8.5, 0.16])] };
}

function vendingMachine() {
  const g = new THREE.Group();
  g.add(B(1.1, 1.9, 0.75, MAT.signRed, 0, 0.95, 0));
  g.add(B(0.8, 1.0, 0.04, MAT.glass, -0.08, 1.25, 0.39));
  g.add(B(1.1, 0.12, 0.75, MAT.metalGrey, 0, 0.06, 0));
  return { group: g, colliders: [box([-0.55, 0, -0.38], [0.55, 1.9, 0.38])] };
}

function bench() {
  const g = new THREE.Group();
  g.add(B(1.8, 0.07, 0.45, MAT.woodDeck, 0, 0.45, 0));
  g.add(B(1.8, 0.4, 0.06, MAT.woodDeck, 0, 0.75, -0.22));
  for (const x of [-0.75, 0.75]) g.add(B(0.08, 0.45, 0.4, MAT.metalGrey, x, 0.225, 0));
  return { group: g, colliders: [box([-0.9, 0, -0.3], [0.9, 0.95, 0.3])] };
}

function tree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.6, 7), MAT.trunk);
  trunk.position.y = 1.3; trunk.castShadow = true;
  g.add(trunk);
  for (const [x, y, z, r] of [[0, 3.2, 0, 1.4], [0.8, 2.7, 0.3, 0.9], [-0.7, 2.8, -0.4, 0.95], [0.1, 2.5, 0.8, 0.8]]) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), MAT.foliage);
    blob.position.set(x, y, z); blob.castShadow = true;
    g.add(blob);
  }
  return { group: g, colliders: [box([-0.25, 0, -0.25], [0.25, 2.6, 0.25])] };
}

function carParked() {
  const g = new THREE.Group();
  g.add(B(1.6, 0.55, 3.4, MAT.carPaint, 0, 0.55, 0));
  g.add(B(1.45, 0.5, 1.9, MAT.carGlass, 0, 1.05, -0.15));
  for (const [x, z] of [[-0.72, 1.1], [0.72, 1.1], [-0.72, -1.1], [0.72, -1.1]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), MAT.tireBlack);
    t.rotation.z = Math.PI / 2; t.position.set(x, 0.28, z); t.castShadow = true;
    g.add(t);
  }
  return { group: g, colliders: [box([-0.85, 0, -1.75], [0.85, 1.35, 1.75])] };
}

function toriiGate() {
  const g = new THREE.Group();
  for (const x of [-1.6, 1.6]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 3.6, 10), MAT.vermilion);
    p.position.set(x, 1.8, 0); p.castShadow = true;
    g.add(p);
  }
  g.add(B(4.6, 0.3, 0.34, MAT.vermilion, 0, 3.7, 0));
  g.add(B(3.6, 0.22, 0.26, MAT.vermilion, 0, 3.05, 0));
  return { group: g, colliders: [box([-1.8, 0, -0.2], [-1.4, 3.9, 0.2]), box([1.4, 0, -0.2], [1.8, 3.9, 0.2])] };
}

function pierSegment() { // 4 m of wooden pier deck on posts, deck at y=1.4
  const g = new THREE.Group();
  g.add(B(3.4, 0.14, 4, MAT.woodDeck, 0, 1.4, 0));
  for (const [x, z] of [[-1.5, -1.7], [1.5, -1.7], [-1.5, 1.7], [1.5, 1.7]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), MAT.woodDark);
    post.position.set(x, 0.2, z); post.castShadow = true;
    g.add(post);
  }
  for (const sx of [-1, 1]) g.add(B(0.09, 0.7, 4, MAT.woodDark, sx * 1.65, 1.82, 0));
  return { group: g, colliders: [box([-1.7, 1.28, -2], [1.7, 1.47, 2])] };
}

// ---------------- registry ----------------
export const KIT = {
  house_small: houseSmall,
  house_two_story: houseTwoStory,
  house_western: houseWestern,
  shop_unit: shopUnit,
  konbini,
  wall_block: wallBlock,
  hedge,
  retaining_wall: retainingWall,
  stairs,
  guardrail,
  lamp_post: lampPost,
  power_pole: powerPole,
  vending_machine: vendingMachine,
  bench,
  tree,
  car_parked: carParked,
  torii_gate: toriiGate,
  pier_segment: pierSegment,
};

export function buildPiece(id) {
  const fn = KIT[id];
  if (!fn) throw new Error('unknown kit piece: ' + id);
  return fn();
}
