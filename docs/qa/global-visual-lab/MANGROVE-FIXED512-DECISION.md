# Mangrove ground â€” fixed512 integration decision

## Recommendation

Retain the user's selected fixed512 material cache. It is implemented in the renderer behind `visualLab=global-lighting&groundCache=fixed512`, requiring the existing Mangrove substrate and shoreline recipe. Keep PR #159 draft; no merge to main. Lower-memory/projection alternatives are closed. This report consolidates evidence, not a claim that all global visual work or campaign validation is complete.

## Cause and retained solution

Earlier material ablations identify static composition as the main ground color-pass cost (~7.8â€“8.2 ms). Cache RGBA stores moss-scale blend, moss/soil blend, AO and roughness at 512 plus gutters/mips per resident chunk. Shared color/normal textures, dynamic lighting and shadows remain. No fern density reduction. The retained appearance is green moss with localized mud, NOT the deliberately all-mud invalidation-test screenshot.

The long fixed512 baseline against uncached original recorded whole-GPU gains of 1.59â€“4.35 ms across day/night pairs; see [original long comparison](mangrove-ground-hybrid512-long-20261023/). The final direct comparison rejected the incremental-memory alternative: valid day pairs saved 0.67â€“1.13 ms GPU and 1.24â€“1.26 ms frame time with fixed512; [decision](mangrove-ground-final-512-decision-20261023/README.md). Those results select the shader architecture; they are not new evidence for every subsequent integration change.

## Image and ownership evidence

- [Near/media and elevated/low](mangrove-fixed-near-parity-20261023/README.md), [elevated details](mangrove-fixed-elevated-parity-20261023/README.md): integrated versus selected cache; nighttime images exact, day differs at 10/21 pixels.
- [Mask edit/restoration](mangrove-ground-fixed-mask-20261023/README.md): altered cache restores byte-exactly; synthetic input, not a gameplay planting test.
- [Streaming and teardown](mangrove-ground-fixed-stream-20261023/README.md): 30 unload/reload events, one-target invalidation, complete cache release.
- [Material replacement](mangrove-fixed-material-switch-20261023/README.md): very-low/medium toggles retain 25 targets and bounded live hooks; disposed material references fixed.
- [Post-switch images](mangrove-fixed-quality-images-20261023/README.md): ground crop exact, full-scene differences remain unattributed.
- [Real wall placement](mangrove-fixed-real-wall-20261023/README.md): one legal palisade renders with a new dynamic shadow, without rebaking static ground. Chains, centers and suppression remain untested here.
- [Real crop placement](mangrove-fixed-real-crop-20261023/README.md): normal game command adds a rendered crop without errors or cache growth. Mangrove mask bytes stay unchanged; this is compatibility, not a regeneration test.
- [Extended live stability](mangrove-fixed-live-extended-20261023/README.md): 1,800 frames each from day/night, 25 cache targets and 33.58 MiB stable; uncached controls also show daytime scene-resource growth. Not a leak-free campaign certification.
- [Live smoke](mangrove-fixed-live-smoke-20261023/README.md): ~9.4 s simulation progression and moving workers, no errors.

## Memory and streaming limits

25 targets consume 33.58 MiB, explicitly accepted by the user. Replacement peak measured 34.92 MiB; admission cap 40 MiB. This is cache texture accounting, not total driver VRAM. [Saturation fix](mangrove-fixed-budget-guard-20261023/README.md) reserves one replacement target and rotates deferred requests: up to 28 cached chunks under the cap, with original-material fallback beyond that. A 32-owner regression test proves invalidation progress and teardown; [Real 49-chunk probe](mangrove-fixed-native-capacity-20261023/README.md) also passes: 28 cached/21 original, invalidation and exact restoration at capacity, 38.95 MiB peak, return to 25 targets. Normal-camera artwork checked; all distant mixed-material boundaries are not yet visually certified. Cache generation measured ~0.35 ms CPU and ~0.96 ms GPU per target; first-load compiler cost is not covered by those warm measurements.

Continuous streaming still has large frame spikes. [Source attribution](mangrove-stream-native-split-20261023/README.md) measures native addChunk at 47.53 ms mean versus payload extraction 0.36 ms and graphical installation ~15 ms. This predates/also occurs without cache. Do not weaken the artwork to address synchronous native generation; no engine/navigation rewrite is included here. Local mud lookup and water-distance savings do not constitute a solved p95 problem; ABAB limitations are documented in their reports.

## Remaining acceptance work

[Integrated static-day ABAB](mangrove-integrated-static-abab-20261023/README.md) now passes workload audit: 2.54–2.96 ms GPU and 1.83–2.11 ms whole-frame gains, preserving approved green coverage with slight blend smoothing. [Nighttime ABAB](mangrove-integrated-static-night-20261023/README.md) also passes: 2.40–2.43 ms GPU and 2.40–2.66 ms frame gains, preserving nighttime material appearance. [Low-quality day/night ABAB](mangrove-integrated-low-abab-20261023/README.md) passes all workload checks: 2.33–3.10 ms GPU and 2.56–3.04 ms frame savings, with improved p95 in each pair. These isolate material cost; moving and active-world acceptance remains open. The integrated path still needs longer active-world validation beyond the tested single crop and single wall commands, first-load generation/compilation characterization, and full-scene quality-switch discrepancy attribution. The ideal 20–23 ms whole-GPU target is not established across active and streaming scenarios. Keep these requirements open; do not label Mangrove globally finished or extend the architecture to other biomes solely on current evidence.
