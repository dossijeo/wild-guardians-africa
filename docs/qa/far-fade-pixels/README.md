# GPU pixel verification of the far fade

The isolated native transition fixture now exposes an optional distance-fade checkbox and validated `fade-start` / `fade-end` query parameters. Defaults preserve prior captures: the checkbox is off, and the configured native-style interval is 280–330 m. The proof uses 100–140 m to keep the tree large enough to measure and prevent full fog from masquerading as successful disappearance. The shader is the same as the regional adapter.

Reproduce at `tests/browser/far-native-transition.html?atlas-lod=2&atlas-elevation=8&fade-start=100&fade-end=140`, prepare GPU, then capture full/faded/background representations at distances 100, 120 and 140. Full and faded use the impostor representation; the background excludes the tree. All nine captures retain the same day view, ready resources, no runtime errors and WebGL error 0. The console capture is empty.

- Start: full and faded world pixels are exactly equal (5,202 non-background pixels).
- Midpoint: faded RGB difference energy against the background is 51.71% of the unfaded reference; it remains visibly partial.
- End: faded world pixels are exactly equal to the background. The unfaded control still contributes 2,746 pixels, proving that fog alone did not erase the tree.

MSAA resolves subpixel dither coverage into partially covered pixels. At the midpoint, 3,184 pixels remain nonzero versus 3,229 in the unfaded reference. Consequently, nonzero pixel count and strict binary-mask subset are unsuitable coverage assertions. The verifier retains exact endpoint equality and checks the midpoint using total absolute RGB difference energy, a screen-image diagnostic rather than a physical opacity measurement.

The unfaded 120 m capture also exactly matches the earlier LOD2 impostor reference outside the QA panel. This verifies that moving dither rejection before sampling preserved the rendered image for this controlled case. It does not establish equivalence for all angles, hardware, shading derivatives or moving cameras.

Run `python tools/check_far_fade_pixels.py docs/qa/far-fade-pixels --reference docs/qa/far-prelit-lod2-elevation8/comparison/impostor.png` to verify report invariants and images and regenerate summary.json. Ordinary gameplay remains unchanged. Full production-distance horizon composition, moving-camera fades and other lighting phases remain pending.
