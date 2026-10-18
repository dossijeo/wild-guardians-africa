# Repair access beside a ruined automatic gate

An authentic Sabana/123 V1-pressure campaign spent 72.32 seconds in
`Game.tick` on day 83. A repeat from the same opening matched all 83 nightly
serialized state hashes and spent 72.53 seconds. A V8 profile of another
hash-identical run attributed most of the day to `planRepairAccess`: the
native repair check fell through to repeated `withWallStatePreview` calls and
physical routes. Profile paths are inclusive and overlap.

The frozen first-fallback state is
[`sabana123-day83-repair-near-gate-unknown.json.gz`](../../tests/fixtures/sabana123-day83-repair-near-gate-unknown.json.gz).
The ruined automatic gate is `structure-1655`. Before the hypothetical
repair, all 11 required worker/center access witnesses are `found`. With the
gate restored, 10 remain `found` and `worker-85017`, standing about 0.6 m
from it, is `unknown`; none is `blocked`. The previous implementation tried
58 wall-state previews and 11 physical routes, took 31.78 seconds on this
state, then returned `unknown`.

The focused change returns `unknown` directly when an existing ruined gate
has a nearby worker with inconclusive access and no access witness is known
blocked. This does not certify protection or permit an unsafe repair. It
avoids speculative alternate-gate previews that cannot establish a valid
connector for a worker at the repaired gate. Other walls retain the existing
alternate-gate search. On the frozen state, the result remained `unknown`
and took 10.67 ms with no preview or physical-route calls. Moving the worker
to a reachable position made the same repair `safe` in 12.36 ms. An actual
restoration in the directed test left all worker access witnesses `found`.

Run the regression with the checked-in WASM binary:

```sh
WILD_ENGINE_NATIVE_ROUTE_WASM=src/world/hierarchical-wasm/spatial-savanna.wasm \
  node --test tests/spatial-repair-access.test.js
```

The directed WASM suite passes all eight cases, including a non-gate wall
that really does need an additional automatic gate. The full campaign
comparison is tracked separately from this frozen-state test because loading
a save resets native-derived residency and cannot reproduce the original
sequence of repair decisions by itself.

An uninterrupted 83-night replay of the corrected build matched the
reference's nightly serialized hashes through night 82. On night 83,
`Game.tick` fell from 72.32 s to 6.88 s (90.5% less), while the night-83
state diverged. The original and corrected runs both spent 76 coins on
repairs that day; the corrected run finished with 41 rather than 40 living
crops and 563 rather than 585 coins. This is a real trajectory change, so
the 90.5% figure is a same-opening campaign comparison, not a claim of
strictly identical simulation. The frozen first fallback returns the same
`unknown` in both builds; skipping previews changes native-derived session
history and may change later navigation.

The 100-night follow-up exposed a consequential divergence. The reference
won night 100 with 83 coins and no living crops. The optimized run lost at
the beginning of day 97 with 30 coins and no living crops. Its cumulative
`Game.tick` time through 96 nights was 727.00 s, against 1,497.14 s across
the reference's 100 nights; this is **not** a like-for-like final-horizon
speedup. Late individual ticks show a clear repair-path improvement (night
90: 3.47 s versus 119.23 s), but the earlier defeat fails the gameplay
acceptance criterion. Keep this branch experimental until the first
behavioral divergence is explained and physical and strategic outcomes are
checked. The difference must not be presented as a semantics-preserving
optimization.

There is a concrete potential source of the divergence: each legacy
`withWallStatePreview()` calls `walls.sync()` for a provisional wall set and
again to restore the confirmed set. Both calls can advance the wall mirror's
topology revision, even though the preview purchases nothing. Those
revisions can cause active routes to be reconsidered later. The new
regression asserts that the fast inconclusive quote leaves `routeStamp()`
unchanged. A read-only live trace of the original implementation reproduced
all 83 nightly hashes (day-83 `Game.tick`: 72.95 s) and recorded both quotes
for `structure-1655`: at 89.5 s and 156.1 s, each returned
`{status: 'unknown', updates: []}`. The optimized branch returns the same
result on the exact first-call frozen state; the second optimized live result
has not been instrumented independently. The old trace rules out a
successful legacy repair at either call. Avoiding provisional wall syncs and
their topology-revision changes is the likely cause of the changed campaign;
a route-level trace would identify the first changed worker assignment or
movement exactly.

## First divergence in a continuous day-83 replay

The trace harness added to `run-native-intent-campaign.mjs` records workers and
native route revisions on a chosen day without asking for any new paths. Two
83-night Sabana/123 V1-pressure/topological-policy runs used the same WASM
(`b1c0f180...10d1f88809be8`) and balance adapter. Source `79141853` was the
reference; `f3f449b1` differed in runtime code only by the focused repair
guard. Their nightly serialized hashes matched for nights 1–82. Each day-83
trace contains 526 ticks:

- [Original worker trace](repair-access-near-gate-baseline-day83-worker-trace.jsonl.gz)
  (uncompressed SHA-256 `06c8cc47b06070b5759e370b936da5cfaa1a58db1676c777411d7ef94c814db1`).
- [Fast-quote worker trace](repair-access-near-gate-optimized-day83-worker-trace.jsonl.gz)
  (uncompressed SHA-256
  `dc7afbe95ebbd5792b5ba0931486180516c30e0105d792704e1e6b7ea39896e0`).

At simulated time 89 s the worker snapshots and wall revision were identical.
At the next tick (time 90 s), immediately after the first inconclusive repair
quote, the reference wall revision jumped from 536 to 652; the fast quote
kept it at 536. The **116** extra revisions match 58 provisional previews
with a wall sync and restoration each. The first worker movement divergence
occurred in that same tick: `worker-85018` was at z=4.8906 in the reference
versus z=4.7826 in the fast run. `worker-85019` had already switched from
carrying a crate to walking toward harvest task `task-85150` in the reference,
while still carrying in the fast run. Both reached that harvest action by the
following tick, but the reference action had progressed 0.3 simulated seconds
further. The first live-crop-count difference followed at time 94 s (59 versus
60). This establishes that speculative quote revisions caused the **first**
route and movement divergence, not a different repair approval. It does not
prove that every later economic or military difference has this single cause.

The trace runs were concurrent and instrumented, so their 89.56 s versus
7.10 s day-83 `Game.tick` times are not a controlled speed comparison. The
earlier isolated 72.32 s versus 6.88 s result remains the performance
reference. The per-tick trace's `money` field was accidentally read from a
nonexistent top-level property and is null; the harness now reads the ledger
balance for future runs. Nightly reports still record 585 versus 563 coins at
the end of day 83. The gameplay-regression hold on this PR remains in force.

To compare the archived traces, decompress both `.jsonl.gz` files and run:

```sh
node tools/experiments/compare-worker-traces.mjs baseline.jsonl optimized.jsonl
```
