# Next-wave entry readiness (candidate only)

Base: `0f4cccfb`. This change only selects and prepares an already-defined next wave. It does not spawn actors, consume the queue, change the clock/RNG, update simulation state, or implement the scheduler/save contract. No campaign, renderer, GPU, CI, or production acceptance is claimed.

`raid.pendingWavePlan` is eligible with `index >= 1`, finite nonnegative `at`, `done === false`, 1–16 known species and matching actor descriptors, and only when every preceding actor is `gone`. Index 0 belongs to the initial night plan. Preparation may run before `at`; the eventual scheduler alone controls spawning. Result/postgame states are excluded.

Wave-only keys append the raid ID, wave index and current worker ID/position/status/incapacitation. Existing no-raid key bytes are unchanged. Geometry epoch, operational structures, camera, bounds and RNG retain their existing invalidation rules. Worker requests copy current workers, plants and geometry but exclude the former raid/actors. Deep descriptor validation belongs to the simulation owner. A delayed reply never installs when these inputs change. This is preparation through the existing worker, with no additional worker or render loop.

Continuous worker movement can invalidate replies continuously. The preparer keeps its existing one outstanding request behavior and waits for an obsolete reply before posting a replacement. Therefore these tests establish ownership and physical safety, not deadline readiness or guaranteed eventual adoption. Unavailable workers retain the existing fallback; no clock freeze or fallback redesign is introduced here.

Verification commands (separate CPU-only invocations):

```
node --test tests/raid-wave-entry-readiness.test.js
node --test tests/raid-entry-preparer.test.js
node --test tests/raid-entry-residency.test.js
```

Final new suite: 18/18 PASS, 9013.0081 ms. Existing preparer: 15/15 PASS, 6041.7208 ms. Residency: 5/5 PASS, 706.4209 ms. Durations describe local CPU test invocations, not frame time or comparative performance.

The new suite computes a complete 16-warthog cohort on the genuine opening terrain, verifies native body radii, pair separation and reversible entry/escape segments, exact state/RNG and reload identity, and exact sparse residency pins. A separate mixed five-species test restores the retained paid closed enclosure (`centre 800 + crop 5 + walls 170 + hire 30`, balance 495), uses real terrain/profile and an inside camera, then verifies the production exterior connectivity certificate plus reversible physical escape. Pending raid metadata is a controlled readiness fixture; no wave is spawned and this is not a campaign or attack-completion test.

Negative attempts remain byte-preserved:

- `initial-fixture-negative.tap`: worker fixture incorrectly assumed opening people existed; corrected to a controlled explicit person ID, with no production change.
- `wave-tests-final.tap`: the additional enclosure fixture omitted the native biome profile. Corrected fixture uses the actual profile.
- `paid-enclosure-tests.tap`: an individual straight-ray exterior witness failed. That witness is explicitly only sufficient, not necessary; production validates the whole connectivity graph. The final fixture asserts the canonical `exteriorGroupWitness` and preserves direct walkability/reversible escape checks. The failed straight-ray expectation remains recorded, not relabeled.
- Earlier positive `wave-tests.tap` and `wave-tests-certified.tap` remain distinct from the final 18-case source.

The receipt hashes source, input and logs, and verifies `raids.js`, `game.js`, and `snapshots.js` remain byte-identical to the base. This does not implement or prove full wave lifecycle, damage/pressure integration, entry deadlines, physical attacks, or 100-night balance.
