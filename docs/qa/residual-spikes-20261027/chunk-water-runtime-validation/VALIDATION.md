# Incremental chunk water: runtime quality and context checks

Both sequential browser runs completed successfully on the candidate injected into the existing scene route. See provenance hashes and compressed raw reports; production source was not changed.

- Quality: low / medium / low completed with positive draw calls. The simulation advanced for all 240 travel frames, no paused frames, 15 new chunks, no stream failures and an empty queue at completion.
- Context loss/restoration: authoritative snapshot unchanged, pthread backend retained, 92 old program references abandoned, 36 retained after recovery, 77 draw calls and clean GL recovery verified by the runtime case. Simulation was deliberately paused for snapshot equality.
- Candidate exposure was only one call and one yield in each run. These checks establish coexistence, not cancellation of an in-flight water job at the instant of a quality/context change. Module lifecycle tests cover cancellation separately; real overlap coverage remains outstanding.
- Logs contain 28 / 30 shader compiler warning messages about potentially uninitialized environment/AfricanToon variables. There were no other captured error messages. These warnings are retained, not silently classified as a clean console; this run does not establish their origin.
- Quality transition wall times were 495 / 599 / 2482 ms. The last includes 1872 ms waiting for chunks. These are elapsed waits with ongoing presentation, not synchronous CPU blocks. Maximum observed transition frame intervals were 61.87 / 56.99 / 95.93 ms. No A/B performance conclusion follows from these functional runs.

## Reproduction

Use isolated Vite on port 5220 with the source revisions/hashes listed in each provenance file, then run `node tools/experiments/run-chunk-water-runtime-validation.mjs` and `node tools/experiments/summarize-chunk-water-runtime-validation.mjs`.

The canonical harness had pre-existing local edits: its exact bytes are archived as `canonical-harness.mjs.gz`, without staging or altering the original file. In an isolated checkout, unpack that archive to `tools/experiments/check-spatial-thread-game.mjs` before reproduction. The runner generates and deletes a sibling wrapper, preserving relative imports. Raw reports and execution logs are archived with gzip.

## Decision

Continue validation of the water candidate; do not merge it into main yet. Remaining acceptance includes real in-flight invalidation, night and construction coverage. The earlier ABAB supports lower maximum water preparation units and better tail delivery, but did not establish a general presentation P95/P99 improvement. Other measured regional attachment and mud geometry spikes remain unresolved.
