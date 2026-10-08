# First native crop: control and attribution

Runtime feature `08fe1462` frozen throughout both contexts; branch HEAD `6fc70017` adds only non-imported QA/candidates. Control serves archived main `cdb822f5` through port5292; feature serves port5290. Sabana/Mapungubwe, seed712, medium; actual CSS viewport1280×720 and world drawing buffer1600×900. Four historical CPU campaigns41320/41304/49032/48904 inventoried before control, never stopped. Root/FrontSide did not open other GPU contexts during these two sequential runs.

## Unprobed control78

A normal paid centre, then one normal paid maize and millet. No resource probes, GL wrappers, additional queries or loading diorama.

| First plant | Command wall ms | First world draw wall ms | Two-second RAF max ms | RAF >100ms |
|---|---:|---:|---:|---:|
| Maize | 0.8 | 178.1 | 182.7 | 1 |
| Millet | 0.5 | 77.4 | 100.0 | 0 |

This reproduces an expensive first crop in the pre-feature control. It does not prove no regression or a feature improvement: single runs are not AB/BA, and cache/driver drift is not controlled. RAF intervals and wall-clock draw duration are scheduling/CPU observations, not timer-query GPU duration or proof of presented frames.

## Feature trace79 (attribution, not acceptance timing)

The opt-in tracer forwards the existing native GL calls once, records wall time and adds no queries. Its overhead and changed driver timing prohibit performance comparison against the unprobed control or earlier feature77.

Maize draw275.1ms includes a252.5ms `renderBufferDirect` for `maiz_01_brote`, `MeshDepthMaterial`, recipe `bioma-growth-depth-v3-opaque`. Nested observations include getProgramInfoLog22.9ms, getShaderInfoLog52.3/6.7ms, getProgramParameter41.4ms, texSubImage2D126.7ms. These are nested segments, never add them to the draw duration. The subsequent color draw is8.9ms with a7ms texture submission.

Millet draw98.4ms includes depth render84.7ms and texSubImage2D84.1ms. The trace did not capture image dimensions/GL texture identity, so the upload cannot yet be conclusively assigned to a particular atlas; source inspection and a targeted metadata follow-up are required. No shader-failure checks are disabled.

The control changes the conclusion: first-use cost predates this feature. Nevertheless, the count0 upload deferral still requires controlled first-use preparation and the feature responsiveness gate remains open. Native shadow-target recipes differ from color/world-depth recipes; warmup must prepare actual variants without promoting all hidden geometry or duplicating textures.

Both reports have errors[], disposed=true and contextLost=true. Tabs78/79 closed; browser2 inventory empty before returning the GPU window to root. Full reports retain raw frames, LongTasks and diagnostics, including LongTask starts slightly before command measurement due to the input event task. No negative evidence is discarded.
