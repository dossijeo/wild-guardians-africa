# Single-exit fixture control — repeatability still unproven

Native in-app browser, 2026-10-07, main91382b8d0ab42ede4dbda9efc3ed70a9baa83f23.
Gran Cañón/Mapungubwe, seed712, medium, paid center, five controlled native
animals. No production rendering change or skin-envelope activation.

The actual fixture completed25camera poses with held camera/entity sync and
1600×900 default-framebuffer readback. It enabled the existing QA-only
single-exit environment recipe and rendered twice before paired captures.
Full serialized simulation remained exact. All camera/target deltas in the
paired rows are0. The verdict is `inconclusive-native-not-repeatable`:

| Comparison | Nonzero rows | Maximum changed pixels |
| --- | ---: | ---: |
| Native bounds versus identical native bounds |15/25|87|
| Native bounds versus candidate bounds |15/25|37|

These results do not permit accepting or rejecting candidate bounds from the
pixel differences. No tolerance or pixel mask was applied. readPixels stalls;
this is not a GPU/frametime/mobile performance result.

The flag reports640material assignments, which includes shared references and
unmatched recipes. No per-program matched-replacement telemetry was collected;
do not present this as proof of replacement in every compiled program. The
fixture control as implemented did not produce a repeatable native baseline.
Additional attribution remains necessary before adopting a shader workaround.

The fresh tab's warning/error log is empty. There is no original-shader warning
control in this same tab, so absence cannot establish that this rewrite fixes
the previous ANGLE warning or that the warning caused pixel differences.

`report.json` and `console.json` retain the actual output. The screenshot shows
the scene after restoring the original recipe, rather than either comparison
buffer. The five animal rigs were ready with no new animal programs on initial
appearance; this is one desktop sample, not a physical-mobile acceptance check.

## Reproduction and recovery

```text
/tests/browser/animal-preload.html?biome=gran-canon&prepare=1&plan-reserves=1&skin-envelope=1&skin-culling=1&skin-culling-hold=1&skin-culling-single-exit=1
```

The earlier5173tab661 stayed at loading with43script resources and no observed
models; that server's dependency-cache directory was empty. It was intentionally
closed for recovery, with no completed result. An isolated Vite server with a
private cache on5183 was started. Its first tab662 had repeated navigation/focus
timeouts, then was authoritatively missing from the browser session. It was not
restarted merely because observation timed out. After disappearance, fresh663
loaded203observed resources and completed this report; it was then closed.
The empty cache and browser timeouts are observations, not a proven root cause.
The recovered run's world-loading interval was12097.9ms, excluding site search
and later comparison; no loading-speed improvement is claimed.
