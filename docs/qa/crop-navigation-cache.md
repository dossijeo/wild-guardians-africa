# Navigation cache reuse for crop placement

Planting on ground that was already cleared does not add a navigation obstacle. Previously every paid planting called `Navigation.setState()`, rebuilding the obstacle index and clearing static walkability and segment caches.

`syncCropPlacement()` retains those caches only when the state object is unchanged and placement removes no props. It still advances the navigation version exactly as before, preserving worker route replanning and save semantics. Removing vegetation, replacing a loaded state, constructing walls, and all other existing `setState()` callers continue to invalidate normally. Rendering and suppression data are unchanged.

Four native-world regression cases cover paid empty-ground planting, actual prop suppression and reload, a paid wall crossing a previously cached clear segment, and replacement of the loaded state. The existing twelve-plant opening golden remains unchanged (`acc0e8e9699de4bce79b2297ad71db4cf743fe09d68f47e3f2876b5b07ecca9f`).

The [recorded comparison](crop-navigation-cache-benchmark.json) runs three full days of the original Sabana/Mapungubwe intensive policy, seed 712, with ordinary commands and an independent physical-delivery/economy audit. It compares the former full-rebuild behavior against cache reuse in the same process. Both produced 232 planted crops, 151 delivered crates, 359 coins, and exactly the same complete serialized state SHA-256: `2e3a31cb41bb301079b641a135810973ea9715ca05ec0dd3c7272ee66716358d`.

Full navigation rebuilds decreased from 254 to 22; all 232 tested plant placements removed no props. The measured 26.55 s versus 17.64 s are single sequential CPU samples while other campaigns and tests were running. They are not stable median timings, GPU frametime, mobile FPS, or proof for every biome and seed.

Reproduce with `node tools/benchmark_crop_navigation.mjs` (writes `test-results/crop-navigation-benchmark.json`), or pass an output filename as the first argument. The reference implementation is temporarily restored through the navigator prototype and always cleaned up in `finally`; neither simulation inputs nor gameplay rules are overridden.

Final local validation of the runtime change: `npm test` completed with 1771 passing tests, zero failures, cancellations or skips (866160.0675 ms). `npm run build` passed. `npm run test:web-package` passed with 580 files, 406799546 bytes, 816 relative links and 20 optimized runtime GLBs. The four focused navigation cases also passed independently. These checks do not replace rendered mobile performance measurements or the remaining campaign matrix.
