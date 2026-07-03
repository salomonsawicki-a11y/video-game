// Morioh heightfield — deterministic, analytic. This IS the collision
// surface: gameplay never collides against render meshes, it samples
// getGroundHeight / getGroundNormal.
//
// Layout intent (world units = meters, world is X/Z in [-256, 256]):
//   south (+Z)  : sea (below y=0), beach, low harbor shelf
//   center      : town shelf, gentle slopes (~y 4..14)
//   north-west  : hill mass rising to ~y 34 with a hilltop overlook
//   east        : low cliffs dropping to the water

export const WORLD_HALF = 256;   // world spans ±256 m
export const SEA_LEVEL = 0;

// ---- seeded value noise -----------------------------------------------
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  h ^= h >> 16;
  return (h >>> 0) / 4294967295;
}
const sCurve = t => t * t * (3 - 2 * t);
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const u = sCurve(fx), v = sCurve(fz);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct, lac, gain) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * freq, z * freq);
    norm += amp;
    amp *= gain; freq *= lac;
  }
  return sum / norm; // 0..1
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (a, b, v) => sCurve(clamp01((v - a) / (b - a)));

// ---- the height function ----------------------------------------------
export function getGroundHeight(x, z) {
  const nx = x / WORLD_HALF, nz = z / WORLD_HALF; // -1..1

  // base rolling ground
  const rolling = fbm(x * 0.008 + 13.7, z * 0.008 + 71.3, 4, 2.1, 0.5); // 0..1

  // coastal gradient: sea to the south (+Z). Shoreline meanders with noise.
  const shoreWobble = (fbm(x * 0.004 + 3.1, 0, 3, 2.2, 0.5) - 0.5) * 90;
  const distToSea = (170 + shoreWobble) - z;      // >0 inland, <0 out at sea
  const coast = smooth(-30, 90, distToSea);        // 0 at sea → 1 inland

  // town shelf: mid-band plateau the town sits on
  const shelf = smooth(-40, 60, distToSea) * 8.0;

  // north-west hill mass with an overlook knob
  const hillMask = smooth(0.15, 0.9, (-nz * 0.6 - nx * 0.5 + rolling * 0.35));
  const hills = hillMask * (14 + 20 * fbm(x * 0.006 + 41.2, z * 0.006 + 8.8, 4, 2.2, 0.5));

  // east cliffs: sharp rise near +X edge that the sea undercuts
  const cliff = smooth(0.55, 0.85, nx) * 10 * coast;

  // gentle town-scale undulation
  const undul = (rolling - 0.5) * 5.0 * coast;

  let h = -7 + coast * 9 + shelf + hills + cliff + undul;

  // beach flattening right at the shoreline
  const beach = 1 - smooth(6, 26, Math.abs(distToSea - 8));
  h = h * (1 - beach * 0.55) + (1.2) * beach * 0.55;

  return h;
}

export function getGroundNormal(x, z, out) {
  const e = 0.6;
  const hL = getGroundHeight(x - e, z), hR = getGroundHeight(x + e, z);
  const hD = getGroundHeight(x, z - e), hU = getGroundHeight(x, z + e);
  // normal of the heightfield
  const nx = hL - hR, nz = hD - hU, ny = 2 * e;
  const len = Math.hypot(nx, ny, nz) || 1;
  out.set(nx / len, ny / len, nz / len);
  return out;
}
