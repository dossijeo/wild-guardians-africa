# Local crop soil: A/B/A/B cost

Original/candidate/original/candidate,media,seed712,1280×720,Intel UHD/full backgrounds. Pre-game pause preserves saved120s state. Strengthened audit passes identical worker state,chunks,origin,target,resources and calls/triangles across all variants/phases;720 valid GPU queries, no query failures/page/GL errors. Separate CPU cadence measurement,60 warmup+90 measured samples each. Resident paused scene, no streaming/event-update cost measured.

GPU mean ms original→candidate:
- Day19.330→23.250; repeat19.337→21.142 (+3.920,+1.805).
- Night22.473→22.111; repeat21.841→22.773 (-.362,+.932).

CPU means mixed (summary.json). Daytime increase appears in both repetitions; no causal per-pass attribution yet. Candidate expands pixels entering existing soil texture branch but unchanged geometry does not establish negligible cost. Keep visual candidate for optimization/review, not selected yet; do not discard solely for cost or claim gameplay FPS improvement. Cost of real event-driven mask updates remains unmeasured.

Reproduce measure-river-crop-soil-20261022.mjs and audit-river-crop-soil-cost-20261022.py. Capture evidence ../gran-rio-crop-soil-20261022. Lifecycle prototype is isolated and not part of this timing.
