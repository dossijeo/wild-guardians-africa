# Shared Multiply physical delivery acceptance

Two historical agriculture acceptance tests still expected unlimited full-strength Multiply: a male millet crate worth 26.4, delivering 27 coins. Current frozen shared-power rules keep the ordinary male millet yield at 13.2, attach an exact pending bonus separately, and liquidate that bonus only on physical delivery.

The independent first-request oracle uses budget 132 and request 11: `132 * 11 / (132 + 11) = 132/13`. This is not a new power configuration. With no earlier liquidation, ten whole bonus coins are paid and the remaining fraction remains in the day's exact account. The ordinary 13.2 coins round up to fourteen, yielding one real ledger payment of 24. The bonus is not multiplied again by the worker profile.

Both tests now verify the original base yield, exact pending entitlement, expiry persistence, physical pickup and delivery, ten additional coins, settled status, a single ledger entry and no second payment after reload. No production economic, magic or worker code changed.

The original focused run fails both tests at `13.2 != 26.4` (15 unrelated cases skipped). After updating the obsolete unlimited-power expectations, the complete agriculture acceptance and shared-power suites pass all 28 tests with no skips. Original and final raw outputs are preserved as gzip files. This is functional accounting evidence, not approval of military balance or the full repository suite.

The active v4 campaign and historical baseline remain unchanged. These test corrections belong to the next frozen integration, alongside the independently documented committed-target fix.
