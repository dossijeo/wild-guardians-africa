# Live urgency counts without filtered arrays

The movement urgency query now counts eligible employees and queued tasks
directly. It retains the strict tasks-per-worker threshold, all four profile
shift endings, contract expiry and excluded statuses. Assigned tasks continue
to count, as before. The query does not cache counts: earlier workers can finish
tasks or leave during the same synchronous update pass.

`benchmark.json` compares the exact `urgentWork` source from main `523e950`
with the candidate. Five hundred deterministic varied states, each queried
before and after task removal/worker departure, produce 20,282 equal decisions.
The original source is extracted and executed with the same balance and profile
dependencies. State remains unchanged by queries.

Twenty-four alternating pairs per CPU case exclude four warmups:

| Employees / tasks / centers | Baseline median | Candidate median | Baseline p95 | Candidate p95 |
| --- | ---: | ---: | ---: | ---: |
| 4 / 8 / 1, 500 sweeps | 1.294 ms | 0.875 ms | 1.731 ms | 3.003 ms |
| 140 / 1600 / 1, 12 sweeps | 91.808 ms | 64.390 ms | 159.590 ms | 89.882 ms |
| 140 / 1600 / 5, 12 sweeps | 57.914 ms | 54.941 ms | 80.078 ms | 75.940 ms |

These are repeated urgency-query batches, not individual frames. Small-case
tails are worse in this sample; no uniform tail-latency improvement is claimed.
Two existing long campaign processes were running in the background. There is
no measured allocation-byte, GPU, full-game frametime or physical phone result.
The code eliminates the two filtered result arrays on active queries and the
temporary status-list expression; CPU medians alone do not prove less GC time.

## Integrated behavior

Both domain runs use the existing paid stress setup: 32 crops, eight hired
workers, explicit 10,000-coin QA credit, and five controlled attacking species.
The baseline loader substitutes only the original locomotion module, keeping
all other modules current. Both complete 1630 simulation ticks, use 146 searches,
have identical event counts and full serialized trajectory SHA256:

`fa022a98f3125d777e4ad082cf167a2b2462e1d14d9062d94ac4ffa680f6e5e0`

The raid finishes at 163 simulated seconds; the deliberately damaged center
ends ruined, with no domain defeat. This validates unchanged urgency/movement,
queue and settlement behavior in that fixture, not responsible 100-night
survival, natural encounter distribution or rendered animation acceptance.
The baseline and candidate integrated runs were concurrent; their wall/CPU
timings must not be used as a paired performance comparison.

Locomotion, first-task and acceptance worker-chain tests pass. Build passes
with the existing bundle-size warning.

Reproduce from repository root:

```powershell
node tools/benchmark_urgent_work.mjs OUTPUT.json
node --experimental-loader ./docs/qa/urgency-live-counts/urgency-reference-loader.mjs tools/check_integrated_load.mjs --trace --warm-navigation
node tools/check_integrated_load.mjs --trace --warm-navigation
```

The loader/source copies preserve the exercised baseline. `integrated-*.jsonl`
include progress lines followed by the complete report; neither file is one
standalone JSON document.
