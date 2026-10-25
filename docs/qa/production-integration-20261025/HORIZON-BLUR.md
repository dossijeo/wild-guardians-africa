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


## Integrated candidate (2026-10-25)

The later candidate is now enabled in the experimental branch for medium/high, disabled with resources released on low. Earlier “not enabled” statements above describe earlier stages, not current status. `src/rendering/horizon-focus.js` uses one color+packed-depth target and one combined blit, with early discard for sky and foreground. It does not rerender world depth. Near focus follows camera target distance; Desert/Canyon use a smaller radius. Nominal additional storage is 7,372,800 bytes at 720p (7.03 MiB), excluding driver overhead. Shader compilation and initial allocation happen during world preparation. Unsupported depth copy disables the effect while preserving the original frame. Other GPU/backend compatibility remains unproven.

Selective fused prototype ABAB GPU means: **19.401 / 21.701 / 19.108 / 22.529 ms**; CPU draw means **2.999 / 2.986 / 2.917 / 3.017 ms**. This adds approximately **2.30–3.42 ms GPU**, not a free effect. These are paused-scene complete-draw timings, not active streaming acceptance. The intermediate fused and interleaved experiments had substantial timing drift and do not establish a reliable speed advantage; their raw reports are retained.

The integrated module passed controlled real-renderer tests for all six biomes: day/night; normal, horizon and elevated cameras; low/medium quality changes; resize. Mangrove also passed actual WebGL context loss/restoration, with no reported GL/page errors. All 22 targeted lifecycle/quality/render-origin/submission tests pass. The packed-copy prototype's same-frame audit found 277,117 sky pixels unchanged in both day and night. Integrated captures are in `horizon-focus-integrated/comparison.html`; these captures do not by themselves prove active-motion stability or compatibility on other hardware.

Still open before release: camera-motion/streaming performance and silhouettes, broader distribution validation, the pending lighting changes, and full release acceptance. This is not a declaration that the merge objective is complete.
