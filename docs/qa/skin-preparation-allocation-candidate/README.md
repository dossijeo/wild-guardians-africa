# Cold skin-envelope preparation — allocation candidate rejected

The opt-in weighted envelope is prepared once during WorldScene.load, which
awaits warming all five species. Subsequent reserve rigs reuse its geometry
cache. Ordinary gameplay still has this envelope pilot disabled.

`cold-cache.json` measures the first preparation and immediate cache lookup for
all five exact deployed Meshopt GLBs. Cold preparation takes 86–178 ms; cache
lookup takes 0.02–0.35 ms in this Node sample. This is neither a mobile timing
nor a general warm-start estimate; JIT/background load affects measurements.

An allocation candidate reuses one influence Map and one weighted Vector3
across vertices. `candidate.mjs` archives that exact rejected helper. The paired
tool forces new geometry identities, excludes cloning from timing, alternates
order, discards two warmups and retains six samples per mode/species. All 40
comparisons produce identical boxes, group intervals, weights and bone indices.

`comparison.json` records hashes and every timing. Median decreases in four
species, but rhino increases slightly; candidate maxima increase in hyena,
lion and rhino. This small noisy sample does not establish lower tail latency
or phone benefit. **The candidate is not retained in runtime code.** The final
helper remains the defda0e weighted-group implementation, not the archived
candidate. No GPU/frame improvement is claimed.

To reproduce, save defda0e's `src/rendering/skin-envelope.js` as a temporary
module under the repository, temporarily install the archived candidate at
that runtime path and run:

`node tools/check_skin_preparation.mjs BASELINE_MODULE OUTPUT.json`

Restore the runtime helper afterwards. `tools/check_skin_envelopes.mjs` now also
records cold/cache preparation costs when reproducing its vertex checks.
Further reduction of cold preparation needs stronger integrated evidence;
cached lookup and the existing startup loading screen do not establish that
the mobile loading experience is acceptable.
