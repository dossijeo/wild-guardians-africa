# Gran Rio streaming spikes: attribution and batch control

Decision: keep the current review recipe unchanged. Existing batch eviction reduces native work, but this A/B/A/B does not establish a reliable whole-frame improvement. No renderer, material, density, simulation or navigation implementation changed. Only the QA completion check was corrected.

## Attribution

The instrumented current-recipe run reports syncChunks maximum 29.810 ms (stage 0 maximum 30.070 ms), versus graphical installation maximum 0.885 ms per chunk and preparation slice maximum 2.010 ms. Native individual removals total about 53.15 ms across 13 calls. Renderer frame maximum is 55.170 ms; presentation maximum 100.085 ms. No monitored WebGL call exceeded 20 ms. This does not exclude GPU queue pressure, unmonitored calls or smaller driver stalls; instrumentation has overhead and is not an uninstrumented control. Native worker compute averages 36.207 ms outside the main thread, not a 36 ms main-thread block.

Existing batch eviction refreshes surviving navigation boundary sectors once per batch. Prior Canyon evidence was positive, while Mangrove evidence was mixed (wild-engine-pthreads matrix reports). The new hypothesis was specifically whether it reduces the observed current Gran Rio syncChunks spike. No new native implementation was introduced.

## Rejected initial series and QA correction

Initial order b1/a3/b2/a4 is retained in gran-rio-eviction-*.json. b1 and a4 returned farSettled=false: a standby impostor preparation resumed between the first empty-queue observation and GPU query collection. The strict summary validator rejected these runs. Do not use their completion latency as accepted evidence.

The harness now requires 12 consecutive idle frames, then checks far preparation again after collecting GPU queries. It does not disable standby preparation or change the work being rendered. Original measurements are not overwritten. Repeated comparisons use fresh gran-rio-eviction-settled-* files.

## Corrected A/B/A/B

Intel UHD 0x9A60 ANGLE D3D11, Chrome, 1280x720 media. Same populated frozen fixture, current review recipe, pthreads, Global Frame Scheduler, retained programs; 60 warm frames, 180 camera travel frames on X over approximately 144 m, then stable settlement. A=single eviction, B=batch. Detailed attribution disabled in all four comparison runs.

| Run | Authored mean ms | P95 ms | P99 ms | Max ms | Travel + settle ms | Native eviction total ms | GPU mean ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 30.576 | 50.115 | 66.570 | 83.305 | 6651.060 | 52.105 | 20.973 |
| B1 | 31.132 | 50.065 | 66.595 | 66.715 | 5919.790 | 33.530 | 22.329 |
| A2 | 31.502 | 66.360 | 66.660 | 83.060 | 5986.300 | 53.540 | 22.883 |
| B2 | 31.318 | 66.405 | 83.270 | 83.470 | 5986.670 | 38.360 | 22.350 |

All four settled, created 15 graphical chunks, ended with 27 native chunks and 16 MiB WASM capacity. Resident prop/sector counts match. Sector update counters differ intentionally (1216 single / 1184 batch): they measure work performed, not final world contents. GPU timers supported and non-disjoint; no unexpected browser errors, existing X4000 warnings retained. GPU means include variable settling and pipeline bubbles; they do not demonstrate shader efficiency. CPU render includes draw, and must not be added to it.

Final RGB MAE is 0.000510 / 0.000429 channel levels on a 0-255 scale; maximum differences 13/9. The A2/B2 final images were directly inspected and preserve coverage, soil, shadows and shoreline. Pixel statistics and settled views do not prove every intermediate frame or active-world correctness.

A1 has longer settling; the first pair's latency benefit is not repeated in the second pair. Authored-frame averages and P95 are essentially unchanged. The second batch P99 is worse. Do not adopt on the isolated native-call saving. Batch remains available for further independently justified investigation; no density reduction is warranted.

## Reproduction and limitations

Use the environment in GRAN-RIO-CURRENT-COST.md, changing WG_CHUNK_EVICTION to single/batch/single/batch and WG_THREAD_REPORT to fresh paths. The corrected harness requires stable settling. Run python tools/experiments/summarize-river-eviction-cost.py on the retained files to validate matched conditions/inventories, GPU validity, unchanged simulation time and final pixels. Nine retention/options tests and node --check pass. These are paused daytime observations, not six-biome or active-simulation acceptance.

Next work should retain the art and avoid another batch-eviction tuning loop without new evidence. The native boundary maintenance spike remains identified; changing its algorithm would require a separate correctness investigation rather than a visual-quality shortcut.
