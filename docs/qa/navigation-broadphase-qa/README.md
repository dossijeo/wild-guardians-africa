# Navigation point-index experiment

This is an isolated CPU experiment based on balance candidate `5980e3be`, **not** an accepted production or 100-night speedup. The existing navigation obstacle index was previously used for segment broad-phase queries, while `testWalkable` scanned every obstacle. The experiment applies the same conservative, ordered candidate index to point walkability and builds an index for the hypothetical obstacles in `nativePerimeterProof`. If the index is absent or stale, the existing full CPU scan remains the fallback. It does not change terrain, fluid, collision narrow phase, path ordering or balance.

The read-only benchmark `node tools/experiments/benchmark-navigation-index-proof.mjs <source-worktree>` replays the retained, funded day-7 Sabana perimeter from `day7-funded-state.json.gz` (snapshot SHA-256 `022fdfd29597a4fc445bea6af5a1b0c6c0f41dbc804d9e04f533fbbf4559a5a3`). It quotes 45 proposed pieces and one update, then executes the complete native hypothetical proof in a fresh process. Baseline is worktree `codex/campaign-unfunded-geometry-guard`; candidate is this branch. Both produce the same valid proof SHA-256 `03fac22a61bccd0309e82e41332c903c5c2c434abfd15b20074467028dd40c40` and unchanged serialized state SHA-256 `465cec8b3e97703ec132ab3e435f2e054ae47e69d88044d9872a5f42c137311c`.

| Fresh-process order | Baseline CPU | Indexed CPU |
| --- | ---: | ---: |
| A/B/B/A, first pass | 2,532.8 / 2,378.9 ms | 2,240.8 / 2,299.0 ms |
| A/B/B/A, second pass | 2,323.7 / 2,359.1 ms | 2,224.3 / 2,247.8 ms |

These are local wall-clock measurements while a native campaign was running, not controlled whole-campaign benchmarks. The improvement in this specific proof is roughly 5–8%, with noise; it is not a drastic reduction and does not establish that complete 100-night campaigns are feasible. The earlier standalone service-proof benchmark still costs about 3.2–3.4 seconds for the 123-crop input because that helper constructs its own unindexed proposed view; it is not evidence of a full-policy speedup.

Directed validation: 1,000 seeded point queries across 90 rotated walls and gates match the original full scan exactly, including worker permissions and three body radii. The broader navigation and reused-perimeter checks pass 29/29, and the Vite build passes. More real snapshots, especially dense late-game farms and all biomes, plus an end-to-end timed campaign would be required before integration. No production branch is changed by this experiment.
