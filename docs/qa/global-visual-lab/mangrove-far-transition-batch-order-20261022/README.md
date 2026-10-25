# Cross-atlas transparency diagnostic

Actual Mangrove campaign, seed 712, media 1280x720, full native background/water/moss. Dither, unsorted alpha, opaque+per-atlas ordered alpha; day/night.

Force impostor meshes into one renderOrder band starting at 5000, then reverse only their relative batch order and restore. The band remains fixed relative to other transparent objects. No instance attributes, scene state or camera changes inside a triplet. These images use forced diagnostic order, not normal gameplay ordering.

| Phase | Dither changed pixels | Unsorted alpha | Split/ordered alpha |
|---|---:|---:|---:|
| Day | 0 | 5767 | 40 |
| Night | 0 | 5768 | 40 |

All restored images are RGB exact and all workloads match within each triplet. No reported GL/page errors. Opaque depth-writing greatly reduces cross-batch order sensitivity, but does not solve it completely. The residual occupies x355–362/y89–97 in this view, where partially transparent crowns overlap; [4x crop](residual-4x.png). Maximum day/night channel deltas 76/31; pixel count alone does not establish severity across other scenes.

Retain the smooth candidate. This small residual in one scene does not justify discarding the artistic improvement, nor prove it is harmless in denser views. Before native adoption, inspect normal ordering in other biomes and test whether global ordering of only the partial subset warrants its submission cost. Standby 3D trees remain outside this permutation test.

Reproduce with WG_REVIEW_BIOMES=manglares and WG_REVIEW_OUT set to this directory:

```sh
node tools/experiments/capture-far-transition-batch-order-20261022.mjs
python tools/experiments/audit-far-transition-order-20261022.py
```
