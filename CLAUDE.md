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
| 1 | NULL HOUR     | The World (DIO, P3)          | time stop, knife fan, steamroller drop |
| 2 | JADE ORACLE   | Hierophant Green (Kakyoin, P3)| Emerald Splash, puppet control |
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
- GILDED MENDER ships as an embedded base64 Mixamo-rigged GLB
  (`MENDER_GLB_B64`, single "punch combo" clip). Its techniques are animated
  procedurally: per-art whole-body gestures (`P.gesture`) + bone-level limb
  poses (`P.menderPose`) applied additively after `mixer.update()` and
  restored from a per-frame snapshot (`cm.poseRestore`) — a paused clip never
  rewrites bone quaternions, so skipping the restore makes additive rotations
  accumulate.
- Mixamo rig axis conventions (measured, see comment in the gesture block):
  arms raise forward with Z (R:−, L:+), swing outward with X−; forearms
  extend with Z (R:+, L:−); Spine1/Head pitch forward with X+; thighs swing
  forward with Z+; knees fold with Z−.

## Testing

Serve locally (`python3 -m http.server`) and drive with Playwright
(chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`):
click `#trainBtn` for the dojo, keys `1-8` switch stands, `J`/click = basic,
`L U I O P` = arts, `K` = special, mouse wheel zooms. Verify animation work
with screenshots (`#mdlStatus` shows when the embedded model loaded).

## Ongoing direction

The user is bringing in more real JoJo models (e.g., The World for NULL HOUR)
by auto-rigging them through Mixamo and converting to `.glb`, then giving each
stand per-attack choreography like the Mender's.
