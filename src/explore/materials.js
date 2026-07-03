// Shared PBR material palette for the Morioh building kit. One instance
// per material so the whole town batches well; Higgsfield-generated
// texture sets replace `map`/`normalMap`/`roughnessMap` on these same
// instances later without touching any geometry.
import * as THREE from 'three';

const M = (opts) => new THREE.MeshStandardMaterial(opts);

export const MAT = {
  plaster:    M({ color: 0xe8e2d4, roughness: 0.9 }),
  plasterTan: M({ color: 0xd9c9a8, roughness: 0.9 }),
  woodDark:   M({ color: 0x4a3626, roughness: 0.85 }),
  woodDeck:   M({ color: 0x8a6a48, roughness: 0.9 }),
  roofBlue:   M({ color: 0x35506e, roughness: 0.55, metalness: 0.05 }),
  roofGrey:   M({ color: 0x555a60, roughness: 0.6 }),
  roofTerra:  M({ color: 0x9c5a40, roughness: 0.7 }),
  concrete:   M({ color: 0xb9b4aa, roughness: 0.95 }),
  stone:      M({ color: 0x8d8578, roughness: 0.95 }),
  asphalt:    M({ color: 0x3c3c40, roughness: 0.98 }),
  brick:      M({ color: 0xa06a52, roughness: 0.9 }),
  metalWhite: M({ color: 0xeef2f2, roughness: 0.4, metalness: 0.6 }),
  metalGrey:  M({ color: 0x777d82, roughness: 0.5, metalness: 0.7 }),
  glass:      M({ color: 0x9fc4d4, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.42 }),
  foliage:    M({ color: 0x3e6b2e, roughness: 0.95 }),
  foliageHedge: M({ color: 0x35592a, roughness: 0.95 }),
  trunk:      M({ color: 0x5a4230, roughness: 0.95 }),
  signRed:    M({ color: 0xc03a30, roughness: 0.6, emissive: 0xc03a30, emissiveIntensity: 0.15 }),
  signTeal:   M({ color: 0x1e7d70, roughness: 0.6, emissive: 0x1e7d70, emissiveIntensity: 0.15 }),
  vermilion:  M({ color: 0xc2401f, roughness: 0.7 }),
  carPaint:   M({ color: 0xcfd4d8, roughness: 0.25, metalness: 0.7 }),
  carGlass:   M({ color: 0x2a3540, roughness: 0.1, metalness: 0.3 }),
  tireBlack:  M({ color: 0x1c1c1e, roughness: 0.95 }),
};
