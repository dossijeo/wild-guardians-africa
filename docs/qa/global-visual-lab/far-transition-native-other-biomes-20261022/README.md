# Remaining four biomes: native smooth transition review

48 real PNG captures (warmup/native, three views, day/night): Gran Rio, Desert, Volcanoes and Grand Canyon. Seed712, 1280x720, medium quality, full Wild Engine-backed far impostors and mountain backgrounds. Native `farTransitions=smooth`, no QA material replacement.

All 24 final captures match the prior QA ordered candidate in draw calls and submitted triangles. 15/24 are RGB exact: Volcanoes 6/6, Canyon 4/6, Desert 3/6, River 2/6. Remaining Desert views differ by 1–3 pixels; Canyon by 10–13 pixels. River also includes the independently adopted distant-water palette change since that QA baseline (307–7331 changed pixels); therefore those four views are not an isolated transition comparison. Do not attribute every changed pixel to one cause. No browser/shader/WebGL errors were recorded.

The Desert retains its approved dune lighting. Volcanoes retain the dark ground and luminous lava. Canyon trees are sparse: compatibility is confirmed, but this scene does not demonstrate a large artistic benefit from smooth transitions. Compare `overview-day.jpg` and `overview-night.jpg`; full images and raw metadata are retained.

Reproduce with `WG_REVIEW_BIOMES=gran-rio,desierto,volcanes,gran-canon` and `WG_REVIEW_OUT=docs/qa/global-visual-lab/far-transition-native-other-biomes-20261022`, then run `node tools/experiments/capture-far-transition-native-20261022.mjs` and `python tools/experiments/audit-far-transition-native-20261022.py`. Vite port5190 required.

This is visual integration evidence, not a new performance benchmark. Native streaming/cleanup validation is separate. Cross-atlas partial overlap and standby ordering remain known limitations. Default remains unchanged.
