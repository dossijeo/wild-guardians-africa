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
and the web build passes.

## Matched native campaign

Two sequential candidate/control and control/candidate pairs used the same
Manglares/712/Mapungubwe `good` policy, legacy labour policy and current
mainline Wild Engine. Each campaign ended in the **same legitimate defeat at
night 11**. All daily simulation facts excluding wall-clock measurements and
the final serialized state are identical. The final state SHA-256 in all four
runs is `0affee6c7c52b711668d59af90543ab318a81d1f39f90b9e6006b34c1773698f`.
The provenance inventory reports exactly one runtime source difference:
`src/simulation/money.js`. A real defeat is not a completed 14-night horizon
or a technical stop.

| Run order | Control `Game.tick` | Candidate `Game.tick` | Reduction |
| --- | ---: | ---: | ---: |
| Candidate then control | 200.31 s | 146.04 s | 27.1% |
| Control then candidate | 198.72 s | 140.34 s | 29.4% |

Bot decision time did not improve: 4.36/4.20 s control against 4.65/4.43 s
candidate. The performance claim is confined to `Game.tick` in this matched
Manglares seed and workload. `manglares11-candidate-control.json` and
`manglares11-control-candidate.json` contain daily measurements, source
identities and state hashes. The four `candidate-*.json.gz` and
`control-*.json.gz` files retain complete source manifests, receipts, daily
rows, reports and terminal states. The first pair requested 14 nights but
ended at night 11; the reverse pair requested 11 nights. Both sets observed
the same 11 nights.

## Memory and remaining checks

The paired 100,000-operation cheap-fraction stress test is an unfavorable
case for the `WeakSet`: median 148.53 ms candidate versus 71.17 ms control.
Post-GC retained heap rose about 197 KiB versus 62 KiB; sampled RSS above
start was about 6.31 MB versus 6.05 MB. Results and all eight process samples
are in `memory-abba.json`. This measures a short isolated Node process, not
the game's maximum resident memory, mobile browser latency or a long farm.
Weak entries are collectible; the in-memory tracking cost still needs longer
observation. The Windows packaging CI check was pending at the time of this
report. Keep the PR in draft until that check and any broader-platform review
complete; do not infer a universal campaign speedup from one biome and seed.
