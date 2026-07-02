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

## Architecture (all inside the one HTML file)

- three.js r128 core + GLTFLoader are **inlined** — the game runs fully
  offline; never add CDN references.
- Main game script is one big IIFE near the end of the file.
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

Serve locally (`python3 -m http.server`) and drive with Playwright
(chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`):
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
