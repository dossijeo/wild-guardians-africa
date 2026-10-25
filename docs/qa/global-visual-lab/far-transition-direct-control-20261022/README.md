# Immediate material-toggle control

Sabana, Desert and Canyon, seed 712, media 1280x720, game camera, day/night. Full native background and established biome recipe. After warming camera views, draw dither / ordered smooth / dither synchronously, without world-frame updates between variants. This isolates toggling from stateful camera/chunk/readiness updates; it does not validate those runtime handoffs.

| Biome/phase | Return changed pixels | Maximum channel delta |
|---|---:|---:|
| Sabana day/night | 0 / 0 | 0 / 0 |
| Desert day/night | 3 / 3 | 13 / 6 |
| Canyon day/night | 13 / 0 | 12 / 0 |

All return calls/triangles and camera/time match; no reported GL/page errors. Sabana's larger matrix-return difference disappears when frame updates are excluded. The exact stateful handoff responsible has not been isolated.

Desert residual is confined to x721–722/y567–568; Canyon daytime to x796–802/y673–675. The cause is not isolated; do not call these controls RGB exact. The strict audit intentionally exits nonzero after writing evidence. No tolerance was added to turn the result green.

Reproduce with WG_REVIEW_BIOMES=sabana,desierto,gran-canon:

```sh
node tools/experiments/capture-far-transition-direct-control-20261022.mjs
python tools/experiments/audit-far-transition-direct-control-20261022.py
```

Original/ordered/return PNGs and audit.json retained. No performance or broad visual-completion claim.
