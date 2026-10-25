# Native quality roundtrip: partial pass, tree shading discrepancy

Actual WorldScene.qualitySetting: medium -> low -> very-low -> medium -> medium, fixed gameplay camera, seed712,1280x720, paused time and wind, full backgrounds, day/night.

Fern checks pass: medium978near+1524far, low1446far, very-low hidden, return restores2502 instances. Shadows2048 allocated/on -> low768 configured but unallocated/off -> medium2048 allocated/on. Texture count118->116->118. Resident geometries238 initially ->237 on first medium return, then237 on later returns; finite observation, not leak proof. No GL/JS errors.

Image validation does NOT pass globally: medium day return changes42201pixels,max188, concentrated in existing trees; fern/ground regions visually unchanged. Night changes1pixel,max3. The tree difference remains on the next settled capture. Do not declare quality roundtrip regression-free.

## Controls

- No quality change + forced material recompilation: zero changed pixels on return.
- Shadow enable/disable + resolution only: zero.
- Far vegetation quality band only: zero.
- World quality flag only (LOD/residency/resize, other settings fixed): zero first return;1pixel,max4 next.
- Full quality with ground material substitution suppressed: same42201pixels,max188.
- Full quality with ORIGINAL dense round-leaf cover, new fern option absent:42919pixels,max188. Therefore the discrepancy is not exclusive to native ferns. This is the laboratory original-cover control, NOT a main-branch test.

Controls' filenames use quality labels for sequence actions; they do not represent full quality switches except the explicit full-cycle probes. Each raw quality.json records actual coverage and shadow states. Discrepancy cause remains unresolved; individual negative controls do not rule out interactions. Next inspect shared material/uniform/LOD invalidation during combined transitions, compare with main if needed. Do not reduce foliage to hide it.

All scripts in tools/experiments/probe-holly-fern-*.mjs corresponding to the artifact names reproduce with WG_CARD_TREATMENTS=cards and Vite5190. No renderer changes in this investigation. No FPS inference from these settling captures. Completion and six-biome closure remain open.
