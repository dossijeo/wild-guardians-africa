# Current native four-impact check

Branch is fully up to date with fetched main (714 ahead, zero behind); PR217 open, CLEAN and MERGEABLE at inspection. No merge performed.

Actual guardian-combat browser run with lightingReview=1, default hyena, benchPhysicsMany. Full report: native-four-impact-current.json. Four commands issued at 0 / 0.647 / 1.342 / 2.086 simulation seconds, max one Guardian, three active physical ragdolls plus one baked fallback, all four recovered, zero final down states and no captured errors. Simulation ran 16.047 s across 368 visible frames; no hidden frames. Fixture resets attack cooldowns, so this is concurrency/recovery validation, not balance or normal cadence acceptance. Audio context was not activated: audio events are traces only, not played sound validation.

Measured diagnostic frame mean 46.90 ms, p95 66.69, p99 99.61, maximum 199.54 ms. Physics total p95 14.06 ms and maximum 53.59 ms; recovery-follow p95 8.58 ms, maximum 11.20 ms. These remain meaningful costs. This single unpaired run does not establish a regression or satisfactory fluidity, and baseline engine diagnosis remains assigned elsewhere. No full continuous visual inspection/recording was performed in this run; the report proves state/sequence invariants and records timings, not artistic acceptance of each fall.
