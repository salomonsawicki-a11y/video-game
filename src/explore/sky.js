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
  // golden hour: deep blue overhead, warm peach at the horizon opposite-warmed by the sun
  vec3 zenith  = vec3(0.10, 0.22, 0.52);
  vec3 hiMid   = vec3(0.42, 0.46, 0.70);
  vec3 horizon = vec3(0.98, 0.74, 0.52);
  float t = pow(clamp(up, 0.0, 1.0), 0.62);
  vec3 col = mix(horizon, hiMid, smoothstep(0.0, 0.35, up));
  col = mix(col, zenith, smoothstep(0.28, 1.0, up));
  col = mix(col, vec3(0.22, 0.20, 0.22), smoothstep(0.0, -0.10, dir.y));
  // warm the sky near the sun's azimuth even away from the disk
  float az = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
  col = mix(col, col * vec3(1.25, 1.02, 0.82), az * (1.0 - up) * 0.7);
  float sdot = max(dot(normalize(dir), sunDir), 0.0);
  col += vec3(1.0, 0.82, 0.52) * pow(sdot, 1400.0) * 18.0;  // sun disk
  col += vec3(1.0, 0.66, 0.36) * pow(sdot, 9.0)    * 0.55;  // broad warm glow
  col += vec3(1.0, 0.50, 0.30) * pow(sdot, 2.5)    * 0.10 * (1.0 - clamp(up,0.0,1.0));
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
