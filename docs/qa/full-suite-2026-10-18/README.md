# Full-suite triage after enclosure integration

On 2026-10-18, `npm test` against merged `main` completed 4,496 tests:
4,434 passed, 6 failed and 56 were skipped (540.4 s). The two
`tests/active-farm.test.js` failures are the already documented historical
100-night victory expectations under the superseded military balance; see
[`current-main-regression-2026-10-17.md`](../active-farm-policy/current-main-regression-2026-10-17.md).
They remain unchanged and are **not** treated as engine failures or silently
weakened.

The other four failures were reproduced and corrected here:

| Failure | Cause | Correction |
| --- | --- | --- |
| `spatial-task-route-cache` | A fractional worker return was legitimately continuing a bounded search on tick two, contradicting the old zero-query assertion. Its tail called `path` directly and repeated one blocked native query. | The native tail uses `workerPath`, which reuses the blocked proof. The test distinguishes ordinary replanning from pending recovery and requires no identical native query on the next tick. |
| Two `sfx-catalog-audit` cases | The generated inventory recorded old source hashes and line numbers after later edits to `main.js`, encounters, game and raids. | Regenerated the inventory. All 126 IDs, original-byte hashes, runtime assignment states and four classification counts are identical to the prior inventory. |
| `vfx-native` provenance | The manifest retained the module SHA-256 from before the merged instanced-upload optimization in PR #93. | Updated only the module hash to the current `vfx-native.js`; the original lab source and atlas hashes remain unchanged. |

The frozen Desierto/983 partial-state probe measured 1,037 native route calls
on the first tick without the worker blocked-proof adapter. With that adapter,
it measured 906 on tick one and 23 on tick two after the correction. All 23
tick-two calls advance an active fractional recovery; none duplicates a
tick-one origin/destination query. The serialized game state is identical to
the control after two ticks. This result does not imply that every worker
route in a full campaign has been benchmarked.

Directed verification: 12/12 worker recovery and task-route tests,
12/12 SFX/VFX catalog and provenance tests, 204/204 playable tests,
`npm run verify:assets`, and the production build all pass. A complete
post-change `npm test` run completed 4,496 tests in 542.5 s: 4,438 passed,
2 failed, and 56 were skipped. Only the two unchanged historical active-farm
victory assertions failed; the four failures addressed here passed in the
full run. The skips include cases requiring separately built and selected
experimental WASM binaries; they are not counted as executed coverage.
`verify:balance` and `verify:plan` also pass. Production balance remains
unchanged.
