# Decision: retain the existing shadow cache

Four completed interleaved runs, same fixture/harness/runtime/hardware, Intel UHD at 1280x720 medium. Comparator provenance checks passed. A uses the existing cache, B bypasses snapshot comparisons while still drawing shadows. Production policy was never changed.

| Metric (ms unless count) | A1 | B1 | A2 | B2 |
| --- | ---: | ---: | ---: | ---: |
| CPU render P50 | 7.775 | 7.050 | 7.835 | 6.585 |
| CPU render P95 | 15.155 | 14.280 | 15.215 | 12.975 |
| CPU render P99 | 21.110 | 21.355 | 20.875 | 18.440 |
| GPU P95 | 25.082 | 25.425 | 25.194 | 25.193 |
| Presentation P99 | 50.000 | 50.040 | 50.030 | 50.025 |
| Presentation maximum | 83.255 | 116.630 | 99.635 | 83.215 |
| Presentation intervals >50ms | 60 | 77 | 76 | 68 |
| Cache hits | 2 | 0 | 1 | 0 |

Bypass saves typical CPU time, but the complete presentation result does not consistently improve. Do not promote bypass or implement adaptive probing solely from these results. Retain the existing cache and prioritize remaining spikes. This does not prove cache bookkeeping is free or that every workload behaves identically.

All runs completed without reported errors or shader compilation waits. Active simulation/asynchronous residency differ: unique chunks in the second sweep were40/33/39/34. Thus GPU/workload differences cannot be attributed solely to cache policy. CPU scope excludes simulation/UI and asynchronous preparation; GPU query scope excludes preparation outside World.render. Detailed scope is in each summary. Threshold counts near refresh quantization are noisy.

Inspected A1/B1 shield-1 captures: approved dense fern coverage, ground and tree roots remain, with no obvious loss of shadows. Final framing differs slightly, so this is not pixel-exact equivalence or validation of every camera.

Reproduce with tools/experiments/run-shadow-bypass-abab.mjs using a new WG_SHADOW_ABAB_OUT. Analyze via compare-release-border-abab.mjs <directory> shadow-bypass. Raw JSON is archived as raid-ui.json.gz with decompressed SHA256 in raw-data.json; decompress to raid-ui.json for the comparator. Summaries/provenance/comparison are retained. No additional production change is adopted.

## Where the largest CPU frame occurs
All four largest World.render frames occur at instrumented frame1 or2, before the first camera sweep. Harness inspection shows an abrupt QA camera relocation after instrumentation starts, followed by a one-second wait. This can combine residency, far transitions and draw preparation in that frame; it is not evidence of a sustained-camera-motion stall. setup-attribution.json reports setup and post-first-sweep separately without removing any sample from the primary comparison. Future spike attribution must distinguish user-visible startup/teleport work from continuous movement. This observation does not turn the bypass result into an accepted optimization.
