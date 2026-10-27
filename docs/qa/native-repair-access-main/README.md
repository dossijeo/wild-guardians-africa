# Native worker access for wall repairs

This branch extracts the repair-access and continuous-route connector fix from
the experimental balance branch without its military pressure, wall price or
economy candidates. It applies on `main` commit
`f198ae97f92f64f52057b437a9901010db5daafc`. The WASM was rebuilt from
the combined source using Emscripten in WSL rather than copied from the older
balance branch. Its SHA-256 is
`439cd62a92ea247bd91d0216ac6722623e27c4621253e1f90393dc9b69b24276`.

The existing repair check searched full worker routes, applied a speculative
wall preview, and searched again to ensure a repair would not isolate workers.
For this frozen Sabana day-15 state it made 25 route requests and one preview.
The new check asks Wild Engine for worker connectivity under a read-only wall
overlay. It retains full-route and preview fallbacks when the answer is
inconclusive. A local connector fallback also handles a physically legal
fractional worker position whose four floor/ceil grid cells are all blocked.

The same state, code, compiled WASM and machine were used in separate-process
A/B/B/A/B/A order (`A` forces the historical full-route fallback). Only the
repair planning interval is timed; loading the state and resident sectors is
excluded. Both modes returned `safe` with no wall or gate updates.

| Mode | Repair milliseconds | Full routes | Wall previews |
| --- | ---: | ---: | ---: |
| Full route A | 936.9, 954.7, 973.8 | 25 each | 1 each |
| Native access B | 12.8, 12.7, 12.1 | 0 | 0 |

The median fell from 954.7 to 12.7 ms in this one repair snapshot. This is a
local decision-cost result, not a campaign-speed claim. The route connector
can legitimately alter a worker's subsequent route when the old planner
incorrectly found none. It does not change movement physics or the balance.

Reproduce after building the WASM:

```powershell
$env:WILD_ENGINE_REPAIR_LEGACY='1'
node tools/experiments/profile-repair-access.mjs tests/fixtures/sabana712-day15-repair-overlap.json.gz
$env:WILD_ENGINE_REPAIR_LEGACY='0'
node tools/experiments/profile-repair-access.mjs tests/fixtures/sabana712-day15-repair-overlap.json.gz
```

Validation on this branch: 16/16 directed repair, native-route and VFX tests
with `WILD_ENGINE_NATIVE_ROUTE_WASM` set to the rebuilt binary; 204/204
playable tests; production build. The earlier experimental campaign and
multi-biome measurements remain in
[`game-tick-repair-access-diagnosis.md`](../military-wall-balance-search/game-tick-repair-access-diagnosis.md).
The separate day-15 native task-batch spike is not solved by this change.
