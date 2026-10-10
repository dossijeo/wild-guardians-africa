# Centre HP repair: isolated navigation candidate

Base main `59ebb8b9`. This candidate changes no purchase, repair, FIFO, damage or worker-speed rule. A paid repair of a centre whose previous status is intact can retain static navigation caches and active route epoch if its exact current footprint matches the navigator's existing obstacle. Restoring a ruined/collapsing centre, moving/changing its footprint or replacing the state still rebuilds navigation. Walls keep their existing rebuild path; gate animation/collision semantics are not changed.

The original paid staffing fixture recorded a 16.113-second headless step at repair completion. Source inspection finds unconditional `nav.setState` there, followed by epoch-sensitive worker replanning. This is a candidate cause, not a measured attribution or a claimed speedup. Production is unchanged until a dense diagnostic and regression review justify integration.

Root ran 15 tests across `center-repair-navigation`, `acceptance-repair-chains` and `navigation-epoch`: all PASS, 1350.4551 ms. Coverage includes physical repair arrival, actual 174-coin payment, retained routes/cache identity, saved epoch/reload, reconstruction, changed footprint, attack cancellation, insufficient funds and duplicate settlement protection. The terrain fixture is flat and prop-free; this is not all-biome or GPU acceptance.

Two initial new-test failures were fixture mistakes: requesting manual repair before hiring allowed the ordinary queue rebuild to remove it; the ledger numerator is a string, not BigInt. The final fixture requests repair after native hiring and checks the native serialized monetary representation. Existing runtime rules were not altered to make the test pass.

Next validation must replay a retained dense legal snapshot, record native arrival/payment and route safety, compare the unchanged-footprint completion with forced original invalidation, and measure CPU timings. No rerun of the complete campaign is authorized by this document.
