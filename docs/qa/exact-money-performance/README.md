# Exact rational addition experiment

This branch changes arithmetic only. It does not change prices, budgets,
rounding, production, damage or policies. PR #54 remains a separate stacked
Wild Engine experiment and is not a dependency of this work.

The existing Manglares native-intent 24-night CPU profile sampled about 336
seconds in the recursive `gcd` function. Roughly 132 seconds can be directly
attributed to `add()` under `consumeGrowthPower()`; deeper recursive stacks
obscure some caller attribution. This is a CPU sample, not a measurement of
whole-campaign savings. The day-11 Manglares growth account used in the
second benchmark was extracted without modification from the frozen state
named in `manglares-day11-growth-operand.json`.

For two canonical rationals, addition can first divide by the gcd of their
denominators. Any remaining factor to remove from the numerator divides that
shared gcd, so the second gcd need not involve the full, growing denominator.
`rational()` and the arithmetic results mark their in-memory objects as
canonical in a `WeakSet`. Parsed saves and manually constructed fractions are
unmarked and take the original full-reduction path. Their first result is
canonical and can use the faster path on subsequent operations. Serialization
still produces exactly the same `{n,d}` strings.

The reproducible benchmark runs reference/candidate in an alternating ABBA
order after warmup, four samples per variant. Run:

```powershell
node tools/experiments/benchmark-money-add.mjs
```

On Node v20.11.0 in this host, the source hashes and medians were:

| Workload | Original cross-product | Candidate | Exact output |
| --- | ---: | ---: | --- |
| 200 distinct denominators | 74.05 ms | 6.38 ms | Equal |
| 1,000 additions to restored day-11 growth account | 338.36 ms | 26.02 ms | Equal |

The benchmark before changing `add()` used source SHA-256
`17d50a3f28b7db202a9a80b57a53d4f312ad35593191bacff0e47f823e15708d`.
An intermediate variant that still reduced against the full resulting
denominator measured 76.85 and 76.51 ms for the first workload: merely
dividing the shared denominator did not help. The selected candidate source
SHA-256 is
`28b4f21c6fc897e2d2efdde6cc24e21e22f8ebbb3fe2adc2d2bf0e51694ccb0c`.

The focused money and agricultural-power tests pass 15/15, including signed
and non-reduced inputs, an exact saved growth operand, and a serialization
boundary. The release-gate suite passes 191/191 with the new tests included,
and the web build passes. The microbenchmark demonstrates a hot-operation improvement, not yet
the total effect on `Game.tick`, a sustained campaign, memory use or mobile
latency. Those remain acceptance checks before integration.
