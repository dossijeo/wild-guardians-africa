# Centre HP repair: isolated navigation candidate

Base main `59ebb8b9`. This candidate changes no purchase, repair, FIFO, damage or worker-speed rule. A paid repair of a centre whose previous status is intact can retain static navigation caches and active route epoch if its exact current footprint matches the navigator's existing obstacle. Restoring a ruined/collapsing centre, moving/changing its footprint or replacing the state still rebuilds navigation. Walls keep their existing rebuild path; gate animation/collision semantics are not changed.

The original paid staffing fixture recorded a 16.113-second headless step at repair completion. Source inspection finds unconditional `nav.setState` there, followed by epoch-sensitive worker replanning. This is a candidate cause, not a measured attribution or a claimed speedup. Production is unchanged until a dense diagnostic and regression review justify integration.

Root ran 15 tests across `center-repair-navigation`, `acceptance-repair-chains` and `navigation-epoch`: all PASS, 1350.4551 ms. Coverage includes physical repair arrival, actual 174-coin payment, retained routes/cache identity, saved epoch/reload, reconstruction, changed footprint, attack cancellation, insufficient funds and duplicate settlement protection. The terrain fixture is flat and prop-free; this is not all-biome or GPU acceptance.

Two initial new-test failures were fixture mistakes: requesting manual repair before hiring allowed the ordinary queue rebuild to remove it; the ledger numerator is a string, not BigInt. The final fixture requests repair after native hiring and checks the native serialized monetary representation. Existing runtime rules were not altered to make the test pass.

Next validation must replay a retained dense legal snapshot, record native arrival/payment and route safety, compare the unchanged-footprint completion with forced original invalidation, and measure CPU timings. No rerun of the complete campaign is authorized by this document.

## Completed dense diagnostic on 447db5db

Single producer PID53756/session11392, actual exit0. It uses the retained legal 212-worker time1 snapshot with current branch runtime, advances ordinary ticks to time233.5, then creates four identical restored checkpoint worlds for A/B/B/A. No extra player command, funds, HP or route injection; A invokes the original navigation rebuild at real repair completion, B uses the candidate. Preparation110799.6633ms is excluded from measured arms. All raw states, report/provenance/status and the read-only audit are [retained unchanged](center-repair-route-preservation/abba-447db5db/).

| Arm | Window CPU ms | Repair-completion tick ms | Path calls | Navigation rebuilds |
| --- | ---: | ---: | ---: | ---: |
| A original | 21161.4263 | 17500.2779 | 125 | 1 |
| B candidate | 3831.9649 | 50.9697 | 12 | 0 |
| B candidate | 3666.2194 | 58.1447 | 12 | 0 |
| A original | 20693.7476 | 17258.3402 | 125 | 1 |

Every arm reaches actual physical repair at time235.25 and pays174 once. Ledger and remaining task IDs match across arms. Within each mode, complete snapshots repeat exactly. Across modes worker positions differ by at most0.1021m due to original replanning; do not call those snapshots identical. A fresh native Navigation finds zero invalid worker endpoints in all four states. This checks endpoints, not every trajectory substep. Three listed producer source hashes remain unchanged. These are cold-navigator headless CPU windows, not GPU, mobile, all-biome performance or whole-game frametime acceptance.

Broadened regression44/44PASS2181.1871ms covers all five cultures' unchanged centre collision footprints, real repair/debits, ruin/reconstruction, queue cancellation, reload and native segment/bounds checks. The candidate still requires integration review/build; this diagnostic does not approve the remaining campaign or Windows loading gates.
