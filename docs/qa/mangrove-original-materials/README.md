# Mangrove original material blend — 2026-10-04

The diagonal source pattern came from the combined lab tile. The first runtime
warp/dual-sampling experiment raised GPU cost and was discarded. The subsequent
baked UV warp also distorted the fine material detail and was discarded before
publication. None of those experiments is part of the delivered game.

The final tile uses the user's separate original Moss002 and Ground050 ZIPs.
Their color, NormalGL, AO, roughness and displacement maps retain their original
1024x1024 pixel coordinates, scale and orientation. A periodic, isotropic blend
mask decides where mud and moss appear. It is synthesized offline using radial
Fourier filtering, which avoids a preferred grid-axis direction. The same mask
mixes every channel; normals are normalized and AO/roughness/height packed as RGB.
There is no UV warp, rotation, extra shader sampling, additional per-chunk
texture or runtime blend mask. The original ground shader, quality bindings, tile scale, mipmaps and
anisotropy remain unchanged. Standard texture repetition at distance remains;
this is not a nonrepeating landscape algorithm.

## Source and reproduction

Both intact ZIPs are preserved under `references/materials`. The manifest
`content/manifests/mangrove-ground-bake.json` records hashes for both ZIPs, all ten
source image entries and the three final textures. Reproduce using
`python tools/bake_mangrove_ground.py` with `tools/requirements-ground-bake.txt`.
`tools/prepare_biome_update.py` retains the baked URLs when regenerating the lab
recipes; the regeneration check confirmed identical terrain and shader code.

Three compressed runtime maps total 3,217,409 bytes.
The original combined maps remain available for source/QA comparisons and are
excluded from the itch.io package. The two source ZIPs are outside `public` and
never ship to the browser. Compared with the former combined maps, the runtime
package grows by 334,927 texture bytes to preserve the original fine detail.
Resolution and texture count stay the same.

## Actual browser checks

`before-day.png` and `after-day.png` use the same camera, simulation, lighting
and material parameters. `after-night.png`, `after-grazing.png` and
`after-very-low.png` verify night lighting, undeformed close detail and the
MeshBasic/1280x720 quality route. The low-quality switch retains 25/25 chunks,
frees zero terrain geometries and leaves state unchanged. `after-actors.png`
uses the existing isolated four-worker/five-beast visual fixture (native scale
1, not a claim about production epic scale). The soil change adds no actor
shader changes. The final captured console is empty.

Two ABBA runs alternate original/prepared/prepared/original frames after 30
warm-up frames. Each records 180 actual asynchronous GPU elapsed queries: 90
per texture set. Both sets are preloaded; camera, day clock, scene, resolution
1600x900 and media quality stay fixed. Both runs submit 100 calls and 1,069,818
triangles per frame, keep simulation unchanged and report zero disjoint events
and zero errors. The source URLs and actual decoded dimensions are recorded.

| Run | Original GPU mean ms | Prepared GPU mean ms | Original p95 ms | Prepared p95 ms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 51.06 | 50.15 | 62.25 | 62.79 |
| 2 | 41.93 | 40.95 | 53.91 | 50.31 |

No frametime regression was observed in these comparisons. These are isolated
measurements on this hardware; the variation between runs is substantial and
they do not establish a universal FPS gain or a zero-cost guarantee on every
GPU. The original and replacement use exactly the same production shader.

## Validation

- Original archive/derived-map hash checks passed.
- 13 existing biome-update, render-quality and render-origin tests passed
  (1,718.1555 ms). No simulation or gameplay code changed.
- Lab regeneration preserves the final profile and the original shader/terrain.
- Build passed; the existing bundle-size warning remains (see `build.txt`).
- itch.io package passed: 575 files, 404,114,154 bytes, 813 relative links,
  20 compressed GLBs; no original GLBs, demo village or superseded ground maps
  are duplicated (see `web-package.txt`).
