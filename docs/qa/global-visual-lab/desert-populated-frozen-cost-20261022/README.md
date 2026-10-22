# Populated Desert: reproducible profile comparison

Pre-game QA pause fixes unequal transient state. Saved elapsed119.99999999999746 retained exactly. Strengthened audit passes: same-quality repetitions have identical workers, chunk keys, origin, target, object count, geometry/texture counts and draw/triangle workloads throughout GPU and cadence samples. 720 valid GPU samples; no recorded query failures or GL/page errors. Intel UHD device identity in summary.json. Seed712,1280×720, full backgrounds, selected closure recipe, medium/low/medium/low.

|Profile|Phase|GPU mean / p95 ms|CPU render mean / p95 ms|
|---|---|---|---|
|media|day|18.933 / 22.056|4.906 / 6.500|
|media|night|19.551 / 23.685|4.782 / 5.900|
|baja|day|14.222 / 15.921|4.132 / 5.100|
|baja|night|16.740 / 19.151|3.682 / 5.200|
|media|day|16.648 / 19.568|4.290 / 5.400|
|media|night|20.433 / 25.590|4.421 / 5.900|
|baja|day|13.431 / 15.239|4.039 / 5.300|
|baja|night|14.876 / 17.261|3.691 / 4.700|

Day GPU reduction medium→low:4.711ms and3.217ms. Night:2.811ms and5.557ms. CPU render means also lower in these samples. GPU queries and cadence captured separately; do not add their means or claim active-game FPS. All effects remain enabled; snapshot has no arbitrary pre-pause footsteps. Resident scene, paused simulation, fixed camera; streaming costs, moving actors and advanced-campaign load excluded.

Workload day: media102calls/566949tri, baja61/311296. Night: media100/572338, baja62/319347. Low intentionally changes shadows and LOD: this is a quality/cost tradeoff, not an equivalent-image renderer optimization. Preserve medium as artistic reference and approved Desert shadow richness. Low is a measured fallback candidate for this scene, pending matching visual review. Do not declare biome globally complete from this benchmark.

Reproduce measure-desert-populated-frozen-20261022.mjs then audit-desert-populated-frozen-20261022.py. Raw benchmarks, summary and strengthened script are authoritative; earlier populated-cost/settled-cost runs remain invalid for profile recommendation.
