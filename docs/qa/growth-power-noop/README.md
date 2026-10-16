# Growth-power exhausted-tick experiment

This isolated branch tests an exact no-op guard in `consumeGrowthPower`.
Once a spell's stored `consumed` fraction has the same canonical numerator and
denominator as its entitlement, later ticks leave both the spell and daily
account unchanged. The candidate skips the repeated BigInt rational additions.
The guard changes no budget, spell duration, crop growth, settlement, or
saved-state format.

The hypothesis came from the retained 24-night Manglares CPU profile on the
intent-lifecycle branch: `gcd` in monetary rational arithmetic occupied
21.59% of samples. That profile does **not** identify how many of those
samples were exhausted Growth ticks; other exact-power calculations also use
`gcd`.

## Controlled evidence

`tools/experiments/benchmark-growth-power-noop.mjs` alternates the original
implementation and candidate within one process and checks identical final
state hashes. In a synthetic exhausted-spell case, 5,000 calls took 12.76 ms
versus 0.075 ms. With 100 exhausted casts and 2,000 calls, they took 5.80 ms
versus 0.039 ms. These microbenchmarks establish that the guard removes the
intended work, not its frequency or impact in a real campaign. Raw timings
and state hashes are in `microbenchmark.json`.

Four continuous, legal Sabana/712 `good` campaigns of ten nights were then
run sequentially in baseline/candidate/candidate/baseline order using the
same `main` commit `ceef8c82`, WASM SHA-256
`7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`,
and unchanged runner. The baseline agricultural-power source was SHA-256
`a0d1e0557e6c045b772ee414b9d133642786744fe21b2a925b18f8e4568afe3b`;
the candidate was
`4371d1e2821b89ab59b0078633f377ee77df2bcd22747474c258fba2a594bfa0`.

| Run | Total seconds | `Game.tick` seconds | Final state |
| --- | ---: | ---: | --- |
| Baseline 1 | 176.75 | 170.26 | Same hash |
| Candidate 1 | 173.86 | 167.54 | Same hash |
| Candidate 2 | 179.72 | 173.32 | Same hash |
| Baseline 2 | 177.88 | 171.47 | Same hash |

All four completed ten nights and produced final serialized SHA-256
`72173a5e8c5af4c5b8ef3a4ec4cac27a52356d6979e16a7937735ac4046efe13`.
The candidate's mean total time was 0.30% lower and mean `Game.tick` time
0.26% lower. Both differences are smaller than the between-run variation;
there is **no demonstrated sustained speed gain**. These ten-night runs are
performance comparisons, not evidence of long-campaign balance or stability.
The four full per-day reports are retained beside this document.

Twelve agricultural-power tests passed, including an exact-state regression
after entitlement exhaustion. The candidate remains experimental and is not
proposed for integration. Revisit only if later-night profiles establish that
exhausted Growth ticks materially contribute to the sustained bottleneck.
