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
history and may change later navigation. A 100-night follow-up is needed to
assess sustained behavior after this first divergence.
