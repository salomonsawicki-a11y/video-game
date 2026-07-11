// Shared PBR material palette for the Morioh building kit. One instance
// per material so the whole town batches well; Higgsfield-generated
// texture sets replace `map`/`normalMap`/`roughnessMap` on these same
// instances later without touching any geometry.
//
// Until then the maps are procedural canvas paints. Every texture canvas
// represents a 2 m × 2 m patch of surface; town.js box-projects merged
// geometry UVs at 0.5 repeats/m so texel density is uniform town-wide.
// Tint-style textures are drawn near-white so material.color still
// carries the palette hue; brick/asphalt are painted in full colour.
import * as THREE from 'three';

// deterministic rng so the town looks identical every load
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

function canvasTex(px, draw) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  draw(c.getContext('2d'), px);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// scatter translucent gray speckle over the whole canvas
function speckle(g, px, rnd, n, alpha, dark = true) {
  for (let i = 0; i < n; i++) {
    const v = Math.floor(rnd() * 70);
    g.fillStyle = dark && rnd() < 0.65
      ? `rgba(${40 + v},${40 + v},${40 + v},${alpha})`
      : `rgba(255,255,255,${alpha * 0.8})`;
    g.fillRect(rnd() * px, rnd() * px, 1 + rnd() * 3, 1 + rnd() * 3);
  }
}

const texPlaster = canvasTex(256, (g, px) => {
  const rnd = rng(101);
  g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, px, px);
  speckle(g, px, rnd, 3600, 0.10);
  // faint weather streaks running down the wall
  for (let i = 0; i < 14; i++) {
    const x = rnd() * px;
    g.fillStyle = `rgba(120,118,112,${0.05 + rnd() * 0.07})`;
    g.fillRect(x, rnd() * px * 0.4, 1 + rnd() * 2, px * (0.3 + rnd() * 0.6));
  }
});

const texConcrete = canvasTex(256, (g, px) => {
  const rnd = rng(202);
  g.fillStyle = '#f1efe9'; g.fillRect(0, 0, px, px);
  speckle(g, px, rnd, 4200, 0.11);
  for (let i = 0; i < 6; i++) { // stains
    g.fillStyle = `rgba(105,100,92,${0.04 + rnd() * 0.05})`;
    g.beginPath();
    g.ellipse(rnd() * px, rnd() * px, 12 + rnd() * 42, 8 + rnd() * 30, rnd() * 3, 0, 7);
    g.fill();
  }
});

const texBrick = canvasTex(512, (g, px) => { // full colour; material tint = white
  const rnd = rng(303);
  g.fillStyle = '#b0a89a'; g.fillRect(0, 0, px, px); // mortar
  const rows = 26, bh = px / rows, bw = px / 4.7;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2;
    for (let x = -bw; x < px + bw; x += bw) {
      const h = 158 + rnd() * 28, s = 0.82 + rnd() * 0.25;
      g.fillStyle = `rgb(${h * s | 0},${h * 0.62 * s | 0},${h * 0.47 * s | 0})`;
      g.fillRect(x + off + 1.5, r * bh + 1.5, bw - 3, bh - 3);
      if (rnd() < 0.3) { // chipped shading
        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.fillRect(x + off + 1.5, r * bh + bh * 0.6, bw - 3, bh * 0.4 - 1.5);
      }
    }
  }
});

const texRoofTiles = canvasTex(512, (g, px) => { // near-white; tinted per roof colour
  const rnd = rng(404);
  g.fillStyle = '#eceff1'; g.fillRect(0, 0, px, px);
  const rows = 12, rh = px / rows, tw = px / 8;
  for (let r = 0; r < rows; r++) {
    // shadow under each course
    const grd = g.createLinearGradient(0, r * rh, 0, r * rh + rh);
    grd.addColorStop(0, 'rgba(255,255,255,0.10)');
    grd.addColorStop(0.8, 'rgba(0,0,0,0.02)');
    grd.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = grd; g.fillRect(0, r * rh, px, rh);
    const off = (r % 2) * tw / 2;
    for (let x = -tw; x < px + tw; x += tw) { // tile joints
      g.fillStyle = 'rgba(0,0,0,0.30)';
      g.fillRect(x + off, r * rh + 2, 1.6, rh - 2);
      g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.09})`; // per-tile variance
      g.fillRect(x + off + 1.6, r * rh + 2, tw - 1.6, rh - 2);
    }
  }
});

const texStone = canvasTex(512, (g, px) => { // near-white blocks; tinted
  const rnd = rng(505);
  g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, px, px); // joints
  const rows = 8, rh = px / rows;
  for (let r = 0; r < rows; r++) {
    let x = -(rnd() * 40);
    while (x < px) {
      const w = px / 6 + rnd() * px / 6;
      const v = 232 + rnd() * 20 - 10;
      g.fillStyle = `rgb(${v | 0},${v - 3 | 0},${v - 8 | 0})`;
      g.fillRect(x + 2, r * rh + 2, w - 4, rh - 4);
      g.fillStyle = 'rgba(0,0,0,0.14)';
      g.fillRect(x + 2, r * rh + rh - 7, w - 4, 5);
      x += w;
    }
  }
  speckle(g, px, rnd, 1600, 0.04);
});

const texWood = canvasTex(256, (g, px) => { // near-white planks; tinted
  const rnd = rng(606);
  g.fillStyle = '#f2ede6'; g.fillRect(0, 0, px, px);
  const planks = 4, pw = px / planks;
  for (let p = 0; p < planks; p++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.06})`;
    g.fillRect(p * pw, 0, pw, px);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(p * pw, 0, 2, px);
    for (let i = 0; i < 9; i++) { // grain
      g.strokeStyle = `rgba(90,70,50,${0.06 + rnd() * 0.08})`;
      g.lineWidth = 0.8 + rnd();
      g.beginPath();
      const x = p * pw + 4 + rnd() * (pw - 8);
      g.moveTo(x, 0);
      g.bezierCurveTo(x + rnd() * 8 - 4, px * 0.33, x + rnd() * 8 - 4, px * 0.66, x + rnd() * 6 - 3, px);
      g.stroke();
    }
  }
});

const texFoliage = canvasTex(256, (g, px) => { // leafy mottle; tinted
  const rnd = rng(707);
  g.fillStyle = '#f0f4ea'; g.fillRect(0, 0, px, px);
  for (let i = 0; i < 2400; i++) {
    const d = rnd();
    g.fillStyle = d < 0.5 ? `rgba(30,60,20,${0.06 + rnd() * 0.12})`
                          : `rgba(255,255,255,${0.05 + rnd() * 0.08})`;
    g.beginPath();
    g.arc(rnd() * px, rnd() * px, 1 + rnd() * 3.5, 0, 7);
    g.fill();
  }
});

// full-colour road surface: asphalt + dashed centreline + edge lines.
// buildRoad UVs: u = 0..1 across the width, v = one repeat per ~10 m.
const texRoad = canvasTex(512, (g, px) => {
  const rnd = rng(808);
  g.fillStyle = '#3d3d42'; g.fillRect(0, 0, px, px);
  for (let i = 0; i < 5200; i++) {
    const v = 40 + rnd() * 50;
    g.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + rnd() * 0.3})`;
    g.fillRect(rnd() * px, rnd() * px, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const line = (x, w, a) => { g.fillStyle = `rgba(228,226,214,${a})`; g.fillRect(x - w / 2, 0, w, px); };
  line(px * 0.085, px * 0.012, 0.5);   // edge lines
  line(px * 0.915, px * 0.012, 0.5);
  for (const y of [px * 0.06, px * 0.56]) { // centre dashes: 2 per 10 m repeat
    g.fillStyle = 'rgba(232,230,218,0.6)';
    g.fillRect(px / 2 - px * 0.009, y, px * 0.018, px * 0.19);
  }
});

const M = (opts) => new THREE.MeshStandardMaterial(opts);

export const MAT = {
  plaster:    M({ color: 0xe8e2d4, roughness: 0.9, map: texPlaster }),
  plasterTan: M({ color: 0xd9c9a8, roughness: 0.9, map: texPlaster }),
  woodDark:   M({ color: 0x4a3626, roughness: 0.85, map: texWood }),
  woodDeck:   M({ color: 0x8a6a48, roughness: 0.9, map: texWood }),
  roofBlue:   M({ color: 0x35506e, roughness: 0.55, metalness: 0.05, map: texRoofTiles }),
  roofGrey:   M({ color: 0x555a60, roughness: 0.6, map: texRoofTiles }),
  roofTerra:  M({ color: 0x9c5a40, roughness: 0.7, map: texRoofTiles }),
  concrete:   M({ color: 0xb9b4aa, roughness: 0.95, map: texConcrete }),
  stone:      M({ color: 0x8d8578, roughness: 0.95, map: texStone }),
  asphalt:    M({ color: 0xffffff, roughness: 0.98, map: texRoad }),
  brick:      M({ color: 0xffffff, roughness: 0.9, map: texBrick }),
  metalWhite: M({ color: 0xeef2f2, roughness: 0.4, metalness: 0.6 }),
  metalGrey:  M({ color: 0x777d82, roughness: 0.5, metalness: 0.7 }),
  glass:      M({ color: 0x9fc4d4, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.42 }),
  foliage:    M({ color: 0x3e6b2e, roughness: 0.95, map: texFoliage }),
  foliageHedge: M({ color: 0x35592a, roughness: 0.95, map: texFoliage }),
  trunk:      M({ color: 0x5a4230, roughness: 0.95, map: texWood }),
  signRed:    M({ color: 0xc03a30, roughness: 0.6, emissive: 0xc03a30, emissiveIntensity: 0.15 }),
  signTeal:   M({ color: 0x1e7d70, roughness: 0.6, emissive: 0x1e7d70, emissiveIntensity: 0.15 }),
  vermilion:  M({ color: 0xc2401f, roughness: 0.7 }),
  carPaint:   M({ color: 0xcfd4d8, roughness: 0.25, metalness: 0.7 }),
  carGlass:   M({ color: 0x2a3540, roughness: 0.1, metalness: 0.3 }),
  tireBlack:  M({ color: 0x1c1c1e, roughness: 0.95 }),
};

// parked-car paint variety — kit.js cycles through these per placement
export const CAR_PAINTS = [
  MAT.carPaint,
  M({ color: 0x8c2f30, roughness: 0.28, metalness: 0.65 }), // deep red
  M({ color: 0x2d4462, roughness: 0.28, metalness: 0.65 }), // navy
  M({ color: 0xdad9d2, roughness: 0.3, metalness: 0.55 }),  // white
  M({ color: 0x24262a, roughness: 0.24, metalness: 0.7 }),  // black
  M({ color: 0x5d6e56, roughness: 0.32, metalness: 0.6 }),  // olive
];
