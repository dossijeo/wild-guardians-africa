# Shared geometry priority: roundtrip negative

Control7900 remains frozen in its own worktree. This variant is OFF and alters only shared-worker scheduling/telemetry, not simulation, economy, time or raid deadline behavior.

The first actual Node test retained its7s diagnostic observation timeout:1PASS/1FAIL, with disposal in finally. This is not a hang claim. The exact first test and runtime source bytes were copied before adding a separate30s observation. No runtime budget was increased. The30s diagnostic completed2/2 tests, with the same runtime and canonical geometry/entry/RNG-state checks, but demonstrates a substantial total-cost regression. Completion under a longer observation is not performance acceptance.

| Observation | Run1 | Run2 | Run3 |
|---|---:|---:|---:|
| Overall elapsed ms |11800.61|11815.95|12195.52|
| Entry queue wait ms |9.08|11.29|10.40|
| Entry computation ms, without complete graph |525.54|666.66|940.13|
| Geometry iterator computation ms |533.91|513.55|544.01|
| Maximum indivisible step ms |6.08|9.55|11.98|
| Maximum slice ms |7.47|9.75|13.17|
| Geometry slices |732|725|730|

Each generator completed89220steps without restart, but731/724/729host resume roundtrips and zero-delay timers expanded wall time to almost12seconds. Per-step diagnostic rows also enlarged reply JSON proxies to5.57MB and host packing to78–90ms. The old whole-job control had elapsed1.04–1.39s and entry waits751–1003ms. These are CPU descriptive runs, not ABBA or browser/frame measurements. Entry priority improved, but the overall regression makes this design unsuitable for promotion.

All original negative warmth bytes remain untouched in the control archive. This variant's newly prioritized entry executes before a complete geometry graph is available, so it repeats native geometry work in its private navigator. No partial cache was adopted. Full physical traversal remains pending for this intermediate variant; do not claim validation merely from advanced protocol parity.

Next narrow design: acknowledge first genuine geometry yield once, then continue locally inside the same Worker event loop. Keep the host's background geometry identity separate from its active entry job; a geometry completion cannot release or adopt a newer entry. Worker-local arbitration enforces two entries before a geometry slice. Aggregate counts/max/histograms replace89k per-step rows during measurement; a detailed diagnostic should remain separately labeled. No deadline semantics change, second Worker or fake asynchronous wrapper is proposed.
