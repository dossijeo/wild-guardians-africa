# Framebuffer repeatability controls — still inconclusive

2026-10-07, main parent `0704919cc174b714152e03609ad8aafea07f3082`.
No production rendering/material change or animal-envelope activation.

Three additional native browser controls investigated why the previous
native-versus-native renders were not pixel-identical. All use the same
Gran Cañón/Mapungubwe seed 712, medium quality, paid work center, five controlled
spawns, five horizontal camera offsets per animal and 1600×900 readback.
Camera/entity-sync snapshots are held during each comparison. Native bounds
are drawn twice before candidate bounds. Pixel differences remain exact;
no tolerance, masking or count-based equivalence is applied.

| Control | Largest native-native difference | Largest native-candidate difference | Verdict |
| --- | ---: | ---: | --- |
| Default framebuffer, GL DITHER disabled | 25 pixels | 21 pixels | Inconclusive |
| Offscreen target, samples 0, normal WorldScene render | 24 pixels | 24 pixels | Inconclusive |
| Offscreen target, samples 0, prepared sky/scene renderer draws | 25 pixels | 23 pixels | Inconclusive |

Each complete report has 25 rows and exact serialized logical-state equality.
These controls do not establish the cause of the differences: disabling
dithering, avoiding multisampling, and skipping repeated WorldScene preparation
are each insufficient to produce exact native controls in these captures.
They do not demonstrate unsafe candidate bounds either. Production visual
acceptance remains outstanding, and the opt-in fixture correctly reports false.

The prepared-draw control preserves the production shaders, scene geometry,
ordinary renderer shadow path and sky, but excludes repeated WorldScene
preparation and auxiliary effect/depth/smoke passes. It requires zero render
origin, checked initially and per pose; it does not validate distant recentering.
Offscreen output is a diagnostic render target, not proof of the final display's
color conversion or antialiasing. readPixels/readRenderTargetPixels stall;
none of the timing fields establish frame/GPU/mobile improvement.

The last console collection contains three shader compiler warnings about
potentially uninitialized `f_environment4`, and no error entries. The tab was
reused across navigations and its log was not reset, so those warnings cannot be
assigned exclusively to the last control. The original GLSL recipe initializes
both samples and returns; the production endpoint adapter adds fully defined
day/night returns. This warning was already documented in
`docs/qa/shader-single-exit/README.md`, with a test-only single-exit alternative.
It does not prove an uninitialized GLSL read or the cause of pixel variability.
That existing alternative still needs a causal repeatability comparison here;
no shader workaround has been adopted from these controls.

## Reproduction

Base URL on an ordinary Vite server:

`/tests/browser/animal-preload.html?biome=gran-canon&prepare=1&plan-reserves=1&skin-envelope=1&skin-culling=1&skin-culling-hold=1`

Append respectively:

- `&skin-culling-no-dither=1`
- `&skin-culling-offscreen=1`
- `&skin-culling-offscreen=1&skin-culling-draw-only=1`

Complete reports are named `no-dither-default-framebuffer.json`,
`offscreen-control.json`, and `prepared-draw-control.json`. `console.json` is
the last run's error/warning collection. `restored-scene.png` shows the original
view restored after the last sweep, not the paired offscreen buffers or five
separately visible animals. Native tab 660 was closed after capture.

The last two defensive changes (per-pose zero-origin guard and restoring an
initially disabled DITHER state) have syntax coverage; these captures used
zero origin throughout and an initially enabled DITHER state. Do not present
those unexercised exception/state branches as native-tested.

The helper passes node syntax checking. Inline-browser verification previously
passed 137 files / 136 scripts during this investigation; final options were
also parsed and exercised by the native Vite browser run.
