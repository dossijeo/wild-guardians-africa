# Native opt-in volcanic deposits

Enable `visualLab=global-lighting&volcanicRock=layered&volcanicDeposits=broad`. The existing rock recipe supplies ash masking; the option modifies its distribution, albedo and height weighting only. BiomeGround gates to volcanoes, AfricanToon applies after the existing ash/rock patches and includes a distinct material program cache key. Defaults and other biomes remain unchanged. No additional geometry, passes, textures or samples.

Reproduce: `node tools/experiments/capture-volcano-ash-native-parity-20261022.mjs`, Vite port 5190. Observation-only world hook, no shader replacement routes. Seed 712/media/1280x720, three views day/night. All six native captures are RGB pixel-identical to the QA deposits pilot; camera/time/draw calls/triangles match, no captured errors. Option prerequisites, disabled-patch identity and missing-anchor failure checked with Node assertions.

Prior QA Intel UHD ABAB showed no consistent GPU difference (-.130 to +.039 ms), night CPU +.200/+.378 ms with paced cadence ~16.63 ms. This parity run is not a fresh performance benchmark. QA low-profile seed913 review also retained material separation. Native continuous visual movement, streaming and broader seed validation remain pending; opt-in availability does not mean the global artistic goal is complete.
