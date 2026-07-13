// Procedural HDR-ish sky. One analytic sky-color function (SKY_GLSL) is the
// single source of truth: it paints the visible sky dome, is baked into a
// PMREM environment map that drives IBL ambient + reflections for the whole
// town, and is reused by the water shader so reflections stay coherent.
// A Higgsfield-generated equirect panorama can later replace buildSkyEnv()'s
// source scene without changing anything downstream.
import * as THREE from 'three';

// dir: normalized world direction; sunDir: normalized. Returns linear HDR color.
export const SKY_GLSL = `
vec3 skyColor(vec3 dir, vec3 sunDir){
  float up = max(dir.y, -0.15);
  vec3 zenith  = vec3(0.11, 0.25, 0.55);
  vec3 horizon = vec3(0.88, 0.80, 0.68);
  vec3 ground  = vec3(0.30, 0.27, 0.23);
  vec3 col = mix(horizon, zenith, pow(clamp(up, 0.0, 1.0), 0.5));
  col = mix(col, ground, smoothstep(0.0, -0.10, dir.y));
  float s = max(dot(normalize(dir), sunDir), 0.0);
  col += vec3(1.0, 0.88, 0.66) * pow(s, 1200.0) * 16.0;   // sun disk
  col += vec3(1.0, 0.72, 0.42) * pow(s, 10.0)   * 0.55;   // warm glow
  col += vec3(1.0, 0.58, 0.36) * pow(s, 3.0)    * 0.12 * (1.0 - clamp(up,0.0,1.0)); // horizon haze
  return col;
}`;

function skyMesh(sunDir) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sunDir.clone().normalize() } },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;               // force to the far plane (skybox)
      }`,
    fragmentShader: `${SKY_GLSL}
      varying vec3 vDir; uniform vec3 uSun;
      void main(){ gl_FragColor = vec4(skyColor(normalize(vDir), normalize(uSun)), 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, mat };
}

// visible sky dome for the main scene (reposition to the camera each frame)
export function createSky(sunDir) {
  return skyMesh(sunDir);
}

// bake the same sky into a PMREM environment map for IBL + reflections
export function buildSkyEnv(renderer, sunDir) {
  const skyScene = new THREE.Scene();
  const { mesh } = skyMesh(sunDir);
  skyScene.add(mesh);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(skyScene, 0.0).texture;
  mesh.geometry.dispose();
  mesh.material.dispose();
  return env;
}
