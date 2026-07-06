# Phantom Verdict 3D

A JoJo-inspired browser game with two modes on one shared PBR renderer:

- **Arena** — the original phantom-summoning fighting game (`src/game/arena.js`).
- **Explore Morioh** — a walkable, photorealistic coastal town (`src/explore/`).

Everything runs offline from a static folder — no build step, no CDN. three.js
r185 (ESM) and pmndrs `postprocessing` are vendored in `vendor/`; the browser
loads `src/` directly via the import map in `index.html`.

## Running

```bash
python3 -m http.server        # from the repo root
# open http://localhost:8000/index.html
```

The legacy single-file build `phantom_verdict_3d_v3.html` is kept frozen as
reference — do not edit it.

### URL flags (exploration)

- `?fly` — debug fly camera instead of the character controller
- `?kit` — lay the whole building kit out on the terrain for eyeballing
- `?debug` — perf overlay (fps / draw calls / tris / scatter count) + `window.EXDBG`

## Controls

**Menu:** `BEGIN THE TRIAL` / `TRAINING ROOM` (arena) · `EXPLORE MORIOH`.

**Arena:** `1-8` swap phantom · `J`/click basic · `L U I O P` arts · `K` special ·
`+`/`-` or wheel zoom · left-hold-drag orbits camera · `SPACE` dash.

**Explore (character):** click to capture the mouse · `WASD` move · `SHIFT` run ·
`SPACE` jump · mouse look · `1-5` teleport (town / shops / harbor / park / overlook) ·
`ESC` release mouse, again to return to menu.

**Explore (`?fly`):** `WASD` fly · `Q`/`E` down/up · `SHIFT` fast · drag to look.

## Project structure

```
index.html              UI shell + import map + module entry
src/main.js             boots arena + explore
src/core/renderer.js    THE shared renderer (sRGB, AgX, shadows) — never make a second
src/core/modes.js       mode registry; arena loop delegates frames to the active mode
src/game/arena.js       the fight game (ported from the legacy file)
src/explore/
  heightfield.js        analytic Morioh terrain height + normal — the collision truth
  terrain.js            chunked LOD tiles + slope/height splat shader
  materials.js          shared PBR material palette
  kit.js                hand-built modular building/prop kit (geometry + colliders)
  town.js               assembles the town from the layout config; merges statics
  controller.js         third-person character controller + collision
  sky.js                procedural sky dome + baked PMREM environment
  water.js              coastal water shader
  scatter.js            density-mapped instanced grass/rock scatter
  explore.js            the exploration scene: lighting, fog, wiring, camera modes
assets/
  models/*.glb          rigged phantom bodies (fetched by the arena)
  config/morioh_layout.json    the editable town
  config/asset_manifest.json   Higgsfield-generated 3D asset registry
vendor/                 three r185 ESM + addons + postprocessing
```

## Town layout config — `assets/config/morioh_layout.json`

Editing this file rearranges Morioh; nothing is hardcoded per object.

```jsonc
{
  "spawns": {
    "town_center": { "pos": [6, 52], "yaw": 170 }   // pos = [x, z]; yaw in degrees
  },
  "roads": [
    { "name": "main_street", "width": 6,
      "points": [[8, -96], [6, -40], [4, 20]] }      // polyline of [x, z]; draped on terrain
  ],
  "placements": [
    { "module": "house_small", "pos": [-46, -70], "rotY": 90 }  // rotY degrees, optional
  ]
}
```

`module` is a kit-piece id (see `KIT` in `kit.js`) **or** an asset id from the
manifest. Ground height and collision are resolved automatically from the
heightfield; placement y is snapped to the terrain.

Kit ids: `house_small`, `house_two_story`, `house_western`, `shop_unit`,
`konbini`, `wall_block`, `hedge`, `retaining_wall`, `stairs`, `guardrail`,
`lamp_post`, `power_pole`, `vending_machine`, `bench`, `tree`, `car_parked`,
`torii_gate`, `pier_segment`.

## Asset manifest — `assets/config/asset_manifest.json`

Registers Higgsfield-generated (or any) GLB assets so a `placements[].module`
can reference one instead of a kit piece. Empty until generation is authorized;
kit stand-ins hold every slot until then.

```jsonc
{
  "version": 1,
  "assets": [
    {
      "id": "harbor_lighthouse",             // referenced by placements[].module
      "prompt": "photoreal weathered concrete lighthouse, overcast",
      "glb": "assets/models/props/harbor_lighthouse.glb",
      "collider": [1.4, 9.0, 1.4],           // box half-extents [hx, hy, hz]; omit for auto-bounds
      "tris": 4200
    }
  ]
}
```

Conform every generated asset before adding it: decimate to a tri budget,
verify a full PBR map set (albedo + normal + roughness + metal + AO),
KTX2-compress the textures, give it a simplified collider, then add the entry.

## Adding content

- **A building/prop instance:** add a `placements` entry to the layout config.
- **A new location:** add a `spawns` entry (reachable via the `1-5` keys, in order).
- **A new kit piece:** add a builder to `kit.js` returning `{ group, colliders }`
  (colliders are local-space AABBs `{ min:[x,y,z], max:[x,y,z] }`), register it in
  `KIT`, then reference its id from the layout.
- **A generated GLB asset:** add a manifest entry and reference its `id` from a
  placement.

## Rendering & performance notes

- Full PBR: `MeshStandardMaterial` everywhere, sRGB + AgX tonemapping, IBL from a
  baked sky environment, directional sun with a player-following shadow frustum,
  bloom + SMAA post.
- The town is merged to ~one draw call per material after assembly; scatter is
  GPU-instanced and distance-culled; terrain is chunked with near/far LOD; only
  buildings and the avatar cast shadows.
- Measured in-scene: ~90–150 draw calls, ~55–80k triangles across all districts.
- Headless test rigs report ~10 fps because they fall back to software WebGL
  (SwiftShader, no GPU); real fps validates on a GPU. Verification here is
  numeric (draw calls, exposure, collision positions), not screenshot-based.
