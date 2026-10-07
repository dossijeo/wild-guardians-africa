# Native simulation CPU profiles from archived farms

2026-10-07, production simulation/navigation source from main `8b7f0f8a`, Node 20.11.0. Three archived day-101 victories are continued through ordinary postgame and paid hiring commands. No changes to terrain, FIFO, collision, movement, growth, balance or history. Each diagnostic executes fifty ticks of 0.1 simulated seconds. The game UI's asynchronous hiring route preparer is not used by this domain-only tool: the first tick includes cold route searches. These are historical saves, not completion evidence for current campaigns.

| Archived case | Living plants / staff | Historical plants / crates | First tick ms | Following 49 ticks median / p95 ms | Path searches |
| --- | --- | --- | --- | --- | --- |
| Manglares / Saheliana | 215 / 18 | 12,201 / 11,602 | 493.92 | 2.86 / 5.27 | 18 |
| Gran Río / Mapungubwe | 557 / 47 | 13,541 / 12,597 | 681.57 | 4.47 / 9.08 | 47 |
| Sabana / Mapungubwe, eight crops | 546 / 46 | 20,443 / 19,436 | 744.43 | 5.60 / 8.05 | 46 |

V8 profile clock ranges contain the measured tick markers. `summary.json` separates the approximate first-tick boundary from later self samples. Terrain/noise/navigation appear prominently during initial route work. Later samples concentrate in `tickScoped` (approximately 39–63%) and its wrapper; this identifies an area to investigate, not the precise inner operation to remove. Source line labels are function entry lines, not proof that one specific loop consumed those samples. Large saved histories and active crop processing must be isolated before changing production iteration.

Concurrent long campaigns and the impostor agent's browser work remained active. These single profiles are diagnostics, not stable A/B benchmark medians, render frametimes, CPU instruction counts, FPS, GPU, RAM, physical-mobile results or an explanation of the live Gran Cañón case. The earlier exploratory runs were replaced after making the CLI support all three inputs; repeated cases retained their exact end-state hashes. No production optimization is claimed or enabled by this change.

Reproduce with `node --cpu-prof --cpu-prof-dir=.cache/late-farm-profile --cpu-prof-name=river.cpuprofile tools/profile_late_farm.mjs .cache/late-farm-profile/river.json intensive-river-rejoin-100`. Supported source names are listed in the tool. Reports retain all tick samples and input/end-state hashes. Compressed raw CPU profiles allow deeper stack review; `summary.json` binds profile/report/source hashes.

Next: distinguish historical scans, live crop work and route work with matched native-state A/B evidence, preserving serialized state and physical delivery behavior. Profile the current Gran Cañón campaign when its terminal snapshot becomes available; do not restart that still-running process just to get a snapshot.
