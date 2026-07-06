// Coastal water. A single sea plane with a custom shader that: perturbs its
// normal with two scrolling procedural wave layers, reflects the shared sky
// model (SKY_GLSL) through a Fresnel term with a sun glint, deepens colour
// with distance, fades to the scene fog at the horizon, and turns
// increasingly transparent at grazing shallow angles so the sand reads
// through at the shoreline (grounding without a depth pre-pass).
import * as THREE from 'three';
import { SKY_GLSL } from './sky.js';
import { SEA_LEVEL, WORLD_HALF } from './heightfield.js';

export function createWater(sunDir, fogColor, fogNear, fogFar) {
  const geo = new THREE.PlaneGeometry(WORLD_HALF * 4, WORLD_HALF * 4, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: sunDir.clone().normalize() },
      uCam: { value: new THREE.Vector3() },
      uDeep: { value: new THREE.Color(0x08283a) },
      uShallow: { value: new THREE.Color(0x2f6f7e) },
      uFog: { value: new THREE.Color(fogColor) },
      uFogNear: { value: fogNear }, uFogFar: { value: fogFar },
    },
    vertexShader: `
      varying vec3 vW;
      void main(){
        vW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `${SKY_GLSL}
      varying vec3 vW;
      uniform float uTime, uFogNear, uFogFar;
      uniform vec3 uSun, uCam, uDeep, uShallow, uFog;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hsh(i), hsh(i+vec2(1,0)), f.x), mix(hsh(i+vec2(0,1)), hsh(i+vec2(1,1)), f.x), f.y); }
      float waves(vec2 p){
        vec2 a = vec2(0.11, 0.06) * uTime, b = vec2(-0.08, 0.10) * uTime;
        return vn(p + a) + vn(p * 2.1 + b) * 0.5;
      }
      void main(){
        vec2 p = vW.xz * 0.05;
        float e = 0.7;
        vec3 nrm = normalize(vec3(
          waves(p + vec2(e,0.)) - waves(p - vec2(e,0.)),
          2.4,
          waves(p + vec2(0.,e)) - waves(p - vec2(0.,e))));
        vec3 V = normalize(uCam - vW);
        float fres = mix(0.03, 1.0, pow(1.0 - max(dot(V, nrm), 0.0), 4.0));
        vec3 sun = normalize(uSun);
        vec3 refl = skyColor(reflect(-V, nrm), sun);
        float dist = length(uCam - vW);
        vec3 water = mix(uShallow, uDeep, clamp(dist * 0.004, 0.0, 1.0));
        vec3 col = mix(water, refl, fres);
        col += vec3(1.0, 0.9, 0.7) * pow(max(dot(reflect(-V, nrm), sun), 0.0), 220.0) * 0.9; // glint
        col = mix(col, uFog, clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0));
        gl_FragColor = vec4(col, mix(0.65, 1.0, fres));
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = SEA_LEVEL - 0.05;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return { mesh, mat };
}
