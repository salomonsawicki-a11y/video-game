# Phantom Verdict 3D

A single-file browser arena brawler (`phantom_verdict_3d_v3.html`) **based on
JoJo's Bizarre Adventure**. The player summons a "phantom" (a stand) that
fights alongside them, JoJo-style. All stands, art names, and mechanics are
renamed homages to JoJo stands — keep that flavor in mind when naming or
designing anything new. The `part` field on each stand is the JoJo part it
comes from.

## Stand → JoJo mapping

| # | In-game name  | JoJo stand (user)            | Signature mechanic |
|---|---------------|------------------------------|--------------------|
| 0 | CRIMSON HERALD| King Crimson (Diavolo, P5)   | time erasure, Epitaph foresight |
| 1 | NULL HOUR     | The World (DIO, P3)          | time stop, knife fan, steamroller drop (embedded rigged GLB, The World model) |
| 2 | JADE ORACLE   | Hierophant Green (Kakyoin, P3)| Emerald Splash, puppet control (embedded rigged GLB, mesh `Mesh_3781.rip`) |
| 3 | SILVER ZEPHYR | Silver Chariot (Polnareff, P3)| fencing, armor purge, afterimages |
| 4 | GILDED MENDER | Crazy Diamond (Josuke, P4)   | restoration brawler (embedded rigged GLB, mesh `crd_CrazyD1`) |
| 5 | VELVET SEAM   | Stone Free (Jolyne, P6)      | string techniques |
| 6 | HIGH NOON     | Mandom (Ringo Roadagain, P7) | rewind six seconds |
| 7 | PLUNDER TIDE  | Soft & Wet (Josuke, P8)      | bubbles, plunder |

"MENDER'S WRATH" barrage = stand rush (DORARARA); the `cry` field is each
stand's battle cry.

## Architecture (PBR migration, Phase 1 complete)

The game is being migrated to full photorealism (PBR) with a walkable Morioh
exploration mode. New structure (serve the repo root, open `index.html`):

- `index.html` — entry + UI shell + import map (`three`, `three/addons/`,
  `postprocessing` → `vendor/`). No CDN; fully offline from a static folder.
- `src/core/renderer.js` — THE shared renderer: sRGB output, AgX tonemapping,
  PCFSoft shadows. Never create a second renderer.
- `src/game/arena.js` — the fight game (ported from the legacy file).
  PBR conventions: `MeshStandardMaterial` everywhere (toon/gradient/outline
  shells are retired), physical light intensities, IBL via
  `scene.environment` (RoomEnvironment placeholder until the Morioh HDR sky),
  post = pmndrs `postprocessing` composer (bloom + SMAA + `PVGrade` custom
  effect carrying the CA/vignette/time-stop/erase grades).
- `assets/models/*.glb` — the rigged phantom bodies (fetched, no longer
  base64-embedded). `vendor/` — three r185 ESM + addons + postprocessing.
- `phantom_verdict_3d_v3.html` — the frozen legacy single-file build; do not
  edit it, it's reference only.
- Morioh exploration mode is complete (Phases 2-7). `src/explore/`:
  `heightfield.js` (analytic height/normal = the collision truth),
  `terrain.js` (chunked LOD tiles + splat shader), `materials.js` (shared
  PBR palette), `kit.js` (hand-built building/prop kit → `{group,colliders}`),
  `town.js` (assembles from `assets/config/morioh_layout.json`, merges the
  town to ~one draw call per material, loads Higgsfield GLBs from
  `asset_manifest.json`), `controller.js` (third-person + capsule/AABB
  collision), `sky.js` (procedural sky dome + baked PMREM env), `water.js`
  (coastal shader), `scatter.js` (instanced grass/rock), `explore.js` (scene
  + camera modes). URL flags: `?fly` `?kit` `?debug`. See README.md for the
  layout/manifest formats and how to add content. Verification is numeric
  (headless is software-WebGL ~10fps; real fps needs a GPU) — see README.

## Legacy notes (still apply to gameplay code in arena.js)

- Main game script was one big IIFE; it is now one big ES module.
- `STANDS[]` — stand defs (stats, art names/cooldowns). `ARTS[][]` — one
  function per art, indexed [standIndex][slot]. `special()` — K specials.
- Stand bodies are procedural primitives (`standMeshes`, with `armL/armR` +
  elbow pivots) unless a custom `.glb` is loaded for that stand
  (`customModels[]`, drag-and-drop or file picker on the menu screen).
- GILDED MENDER (`MENDER_GLB_B64`, "punch combo" clip), NULL HOUR
  (`NULLHOUR_GLB_B64`, The World) and JADE ORACLE (`JADE_GLB_B64`,
  Hierophant Green) ship as embedded base64 Mixamo-rigged GLBs; the latter
  two hold a "body block" clip as a paused idle stance. Their techniques
  are animated procedurally: per-art whole-body gestures (`P.gesture`) +
  bone-level limb poses (`P.phantomPose`) applied additively after
  `mixer.update()` and restored from a per-frame snapshot (`cm.poseRestore`)
  — a paused clip never rewrites bone quaternions, so skipping the restore
  makes additive rotations accumulate. NULL HOUR never plays its clip as an
  attack; basics (alternating piston straights), all five arts, the
  steamroller pound, and the VOID TICK time-stop stance are all procedural.
- Model import gotchas (learned embedding The World): game-rip meshes can
  arrive with inward normals AND flipped triangle winding — fix both in the
  GLB binary (negate NORMAL accessors, swap two indices per tri) or the
  BackSide outline shells render in front of the body as a black blob.
  Geometry units vary wildly between exports, so outline inflation in
  `prepCustomModel` is proportional to each mesh's bounding-sphere radius
  (passed as a shader uniform), never a fixed offset.
- Mixamo rig axis conventions (measured, see comment in the gesture block):
  arms raise forward with Z (R:−, L:+), swing outward with X−; forearms
  extend with Z (R:+, L:−); Spine1/Head pitch forward with X+; thighs swing
  forward with Z+; knees fold with Z−.

## Testing

Serve the repo root (`python3 -m http.server`) and open `index.html`; drive
with Playwright (chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`).
Take SMALL JPEG screenshots (quality ~55, viewport ≤960px) — full-size PNGs
have blown the request limit before. Game controls:
click `#trainBtn` for the dojo, keys `1-8` switch stands, `J`/click = basic,
`L U I O P` = arts, `K` = special, `+`/`-` (or wheel) zooms, hold-drag with
the left button orbits the camera (a stationary hold keeps attacking).
Verify animation work with screenshots (`#mdlStatus` shows when the embedded
models loaded).

## Ongoing direction

The user is bringing in real JoJo models by auto-rigging them through Mixamo
and converting to `.glb` (fbx2gltf npm package works), then giving each stand
per-attack choreography. The World (NULL HOUR) and Hierophant Green
(JADE ORACLE) are done; the other stands still use primitive bodies.
JADE ORACLE's special sets `P.gesture={slot:5}` for its cast pose — slot 5
is the special, not an art.
