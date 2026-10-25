# Horizon-only depth blur investigation

QA prototype, not a production default. Request: soften the distant world without blurring skybox clouds or stars.

`tools/experiments/horizon-depth-blur.js` preserves the original screen color pipeline, copies the completed framebuffer, then applies a depth-aware nine-tap filter. Empty depth is returned unchanged. Neighbor taps also reject empty depth and closer silhouettes, avoiding sky-color bleed into the horizon. The HTML HUD is not part of the WebGL framebuffer.

The first route uses the existing native depth-capture recipes. Captures and same-frame RGB readbacks confirm **277,320 sky pixels and zero changed sky pixels** in both day and night horizon views, with no WebGL errors. The high gameplay view contains no visible sky, so its zero sky count is not evidence for sky preservation.

## Cost of the first route

Intel UHD 0x9A60 / ANGLE D3D11, 1280×720, medium, paused resident Mangrove campaign, seed 712. ABAB; 30 warm-up frames and 90 valid GPU queries each arm; no disjoint flag. GPU query encloses the complete world draw plus the copy, extra depth pass and filter. Audit readbacks are disabled during timing.

| Arm | GPU mean ms | CPU draw mean ms | draw interval mean ms |
|---|---:|---:|---:|
| Original A1 | 18.457 | 2.752 | 20.345 |
| Blur B1 | 26.016 | 5.631 | 27.999 |
| Original A2 | 18.059 | 2.766 | 20.173 |
| Blur B2 | 25.886 | 5.667 | 27.486 |

This route adds roughly 7.6–7.8 ms GPU and is unsuitable as the default on this hardware. It demonstrates visual masking, not an accepted optimization. Draw intervals are not physical display latency; the scene is paused, not an active streaming benchmark.

## Direct depth reuse

A second route tests WebGL2 depth blitting into a Three-owned render target, restoring the READ framebuffer binding and renderer target afterwards. It never accesses Three private resource registries. The initial depth-only destination generated INVALID_OPERATION (1282) on this backend and retained stale depth. Its screenshots and timings are INVALID for acceptance; retained under `horizon-blur-copy` as negative evidence. A packed depth/stencil destination is being tested separately; it must pass GL and visual checks before timings count.

## Remaining gates

No default enabled yet. Resolve cost and backend compatibility, validate silhouettes during motion, water/transparency, six biomes, quality changes, resizing, context restoration and disposal. Integrate resource preparation with the existing scheduler before release. The final lighting work and complete release objective remain open.

## Packed destination result

The packed DEPTH24_STENCIL8 destination succeeds on this ANGLE D3D11 backend. Same-frame audit: 277,117 sky pixels, zero changed, day and night; no GL or page errors. The minor mask boundary difference versus the extra depth render comes from copying the actual multisampled screen depth instead of rendering a second single-sample mask. This route keeps Three ownership and uses public renderer target/context APIs; only the temporary READ binding changes and is restored.

ABAB complete-draw GPU means: **17.721 / 21.715 / 17.380 / 20.557 ms**. CPU means: **2.822 / 3.022 / 2.812 / 2.919 ms**. Ninety valid queries each arm, no disjoint flags. Additional GPU cost is 3.994 and 3.176 ms, not zero. CPU overhead 0.201 and 0.107 ms. Candidate evidence: `horizon-blur-copy-packed/comparison.html`, captures, `manglares.json`, `manglares-benchmark.json`. Screenshot metrics named calls/triangles in these historical reports describe Three's last pass, not total frame work; do not compare them as whole-frame draw counts.

Estimated new resident color copy + packed depth target/color attachment at 720p: approximately 10.55 MiB, excluding driver storage and any existing effect targets. No default enabled. Need exact resource accounting, motion/silhouette tests and backend fallback before integration. The successful Intel destination format cannot be assumed portable to every browser/GPU.
