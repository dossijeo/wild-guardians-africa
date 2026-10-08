# Static attribute ownership across group resizes

Production baseline: `1a1e43f7`. **QA candidate only**, installed in the native
animal-preload fixture with `reuse-group-static=1`; gameplay remains unchanged.
The candidate transfers private immutable static BufferAttribute identities to
the replacement color group, while retiring visibility/instance buffers and
VAOs. It falls back to normal disposal when array identity/layout changes.
Prototype attributes and shadow groups are not shared or transferred.

Gran Río / Musgum / high quality / seed712 / controlled buffalo appearance,
1280×720 drawing buffer. Paid centre, no crops/hiring, no simulation ticks or
contact: this is an appearance allocation experiment, not a dense-farm benchmark.

| Run | First render bufferData | Second render bufferData | Instrumented CPU ms (first / second) |
| --- | ---: | ---: | ---: |
| Original A1 | 171 | 0 | 41.9 / 18.5 |
| Candidate B1 | 121 | 0 | 40.4 / 21.1 |
| Candidate B2 | 121 | 0 | 42.6 / 17.3 |
| Original A2 | 171 | 0 | 44.3 / 17.4 |

The matched runs reduce first-render bufferData calls by50 (29.2%), with59
bufferSubData calls unchanged. Active matrices, coverage, capacities, layouts,
flags, renderer draw statistics and geometry/texture counts match exactly in
both recorded frames across every pair. This demonstrates less redundant
buffer submission, **not a proven CPU/GPU time or FPS improvement**. Inclusive
CPU times include observers, and two runs per arm are insufficient for that claim.
Runs were sequential; A2 was repeated after a turn-boundary tab loss. There
were also two excluded candidate runs at802×1609: the viewport override was
lost when opening a new tab. Their metadata is retained as invalid setup evidence;
their81 bufferData calls must not be compared with the1280×720 baseline.

Full drawing-buffer RGBA comparisons are not bit exact. Original/original
changes17 pixels (maximum RGB delta87/255); candidate/candidate changes7
(maximum22). Cross-arm pairs change3–21 of921,600 pixels, maximum5–87;
all alpha values match and the largest mean RGB absolute difference is
0.0002413 on the0–255 scale. This is small and comparable to the repeat controls,
but the source of residual variation is unproven. These results do not establish
all-biome visual acceptance or bit-exact equivalence.

Actual Three.js/WebGL lifecycle test: isolated box groups with count sequence
8,9,17,4,8,9,4. Each capacity change requires6 bufferData calls in the original,
2 in the candidate. Five transfers succeed. Both paths finish with0 observed
live buffers/bytes and0 renderer geometries; gl.getError() is0. Lifetime counters
are cumulative across the two arms. They cover requested buffers only, not
physical GPU memory, textures/programs or implicit context-loss release.
Unit tests additionally cover final retirement, changed-source fallback, shadow
ownership, failed packing, and matching matrices/coverage. Existing17 directed
tests passed; a final focused12-test run and browser-script syntax also passed.

Next gate before production adoption: implement a narrow resize-only transfer
in the base class to avoid the QA subclass's per-prepare scope allocation, then
validate native scenes and resource lifetime again and measure repeated CPU/GPU
behavior. This receipt does not activate the candidate in production.

Reproduce native reports at `/tests/browser/animal-preload.html?biome=gran-rio&culture=musgum&quality=alta&attack-species=buffalo&timing=1&appearance-profile=1&groups-profile=1&capture-groups=1`
with/without `&reuse-group-static=1`. Create a blank tab, set viewport1280×720,
then navigate; verify the reported drawingBuffer. Run the lifecycle fixture at
`/tests/browser/asset-group-resize-lifecycle.html`. Decompress the four report
files and run `node tools/compare_asset_group_resize.mjs <directory>` to recreate
pixel/draw comparisons and extract PNGs. Source hashes and exact source snapshots
are retained with raw reports. No repaired/FrontSide models were promoted here.
