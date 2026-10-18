# V1 military pressure: long-horizon decision record

The design target is a 100-night win that competent management can achieve
without making losses impossible. A narrow win is evidence *for* this target;
it is not a failure to maximize surviving crops or coins. The first five
nights introduce the animals, so the sustained military comparison begins on
night 6.

The frozen V1 recipe changes the animal-count, hit-budget and structural-damage
scales as functions of observed agricultural attraction. It does not change
crop HP, worker or animal movement, attack geometry, economy, wall prices,
virtual-player policy or the introductory nights. All five campaigns below
used the event-driven topological player and the same V1 recipe. The final
three include the route-intent correction merged via PR #114; the first two
precede it, so these five outcomes are design evidence rather than a paired
engine-speed benchmark.

| Biome / seed | Real outcome of 100-night request | Final crops / coins | Verified raid receipts |
| --- | --- | ---: | ---: |
| Gran Río / 123 | Victory after all 100 nights | 23 / 300 | 100 |
| Manglares / 2026 | Economic defeat after night 99 | 0 / 32 | 99 |
| Desierto / 712 | Final center fell during day-93 raid | 0 / 164 | 93 |
| Volcanes / 712 | Economic defeat after night 95 | 0 / 32 | 95 |
| Sabana / 123 | Victory after all 100 nights | 9 / 93 | 100 |

Every listed receipt has zero evidence issues and no coverage loss. A request
that lost before night 100 is a defeat, never a completed 100-night campaign.
The uncorrected Desierto run was separately censored technically on night 79;
the corrected run reproduced all 78 earlier daily state hashes before
resolving the stuck attack intent and reaching its genuine defeat. Complete
reports and nightly ledgers are linked from the [experiment README](README.md).

**Recommendation:** accept V1 as the military-pressure candidate for a
separate production change, retaining current wall prices. These five
biome/seed cases demonstrate two narrow possible wins and three genuine late
losses. They satisfy the qualitative target better than universal victory or
universal defeat. They do **not** estimate a population win probability; Gran
Cañón still needs a long-horizon check, and the observed agricultural-loss
fractions exceed the initial 2–4% calibration hypothesis. That hypothesis is
not a hard cap and should not erase genuine narrow wins. Avoid further tuning
against these particular seeds before independent validation.

The balance experiment remains isolated from production parameters. A
production adoption should apply this exact frozen recipe with versioned save
semantics and ordinary balance, persistence and gameplay regression tests.
