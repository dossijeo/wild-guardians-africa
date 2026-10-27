# Water attribute fallback: acceptance not established

Four instrumented real-game runs on the same fixture and hardware, A/B/A/B, completed with 240 advancing frames and drained queues. A restores the per-vertex waterInfo fallback; B skips it only when the fragment texture supplies water coverage. No geometry, density, illumination or texture changes. Source hashes are recorded per run; original reports are archived compressed.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Far attachment CPU ms | 23.445 | 9.755 | 29.055 | 10.795 |
| Main callback P99 ms | 33.520 | 36.790 | 33.300 | 37.005 |
| Presentation P99 ms | 99.720 | 99.805 | 99.760 | 99.705 |
| Attachment LoAF blocking ms | 12.210 | 9.010 | 21.305 | 0.210 |
| Travel plus settling ms | 12480 | 12871 | 12467 | 13169 |

The local saving is reproducible, but overall acceptance is not established: presentation tails do not improve, callback P99 is higher and completion is slower in both B runs. LoAF blocking time is lower, but the duration of the whole containing frame is not consistently lower. Do not equate the callback with all main-thread work: worker delivery runs outside it.

All runs retain 28 shader compiler warnings. This is a diagnostic protocol with synchronous GL correctness checks during quality changes; it cannot establish clean-console acceptance or visual equivalence. Next: isolate normal streaming without those diagnostics and verify pixels under identical rendering state. Do not merge the candidate solely on the local function timing. Existing approved art and near material cache remain unchanged.
