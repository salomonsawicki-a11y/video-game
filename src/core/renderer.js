// Shared PBR renderer — the single renderer for every mode (arena, exploration).
// Color management: sRGB output + AgX tonemapping; all lighting is physical.
import * as THREE from 'three';

export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
