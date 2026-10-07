# Crop history CPU diagnostic

Current production domain on main `b8cfe48e`, Node 20.11.0. Historical Sabana / Mapungubwe day-101 victory has 546 live plants, 19,897 dead crop records and 46 ordinarily paid older women. Native terrain, camera-entry bounds and navigation are retained. Five initial ticks execute cold hiring routes before each measured continuation. Four calibration runs precede eight measured runs in A/B/B/A then B/A/A/B order, with 100 ticks of 0.1 simulated seconds per run.

Arm A retains all crop records. Arm B temporarily excludes dead crops from **all** domain consumers and restores the original ordered array before serializing. It does not delete ledger, crates or events. Dead records remain byte-identical and all twelve complete end-state hashes match (`938cc44398b064eb0a094187a96b78676b95837655291a26571f8ab57d2dc0d7`). This is a diagnostic transformation for one bounded continuation, not a permitted production save change or proof of general semantic equivalence.

Measured per-run median CPU times:

| Arm | Four run medians, ms | Median of run medians, ms |
| --- | --- | --- |
| Full history | 1.750, 1.970, 1.665, 1.978 | 1.860 |
| Live only | 1.227, 1.199, 1.171, 1.233 | 1.213 |

The initial full-history calibration median was 5.677 ms, much larger than later full-history measurements. Excluding those calibration runs avoids attributing the warmup difference to history removal. One live-only run nevertheless has p95 9.547 ms; distributions remain noisy with concurrent campaigns and browser work. This is neither a stable render benchmark nor a GPU/mobile/FPS gain. It isolates the aggregate cost of crop history access, not one specific growth loop, and does not represent current Gran Cañón.

Next implementation should retain serialized history and use an active-crop index with lifecycle invalidation. Verify planting, harvest pickup (including delivery after death), animal destruction, restore, array replacement, queue rebuild and FIFO before adopting it. Compare the complete state against unmodified production, including new births and deaths, rather than relying only on this static historical case. No production source is changed or feature enabled here.

Reproduce with `node tools/compare_crop_history.mjs OUTPUT.json`. `report.json` contains every timing sample; `receipt.json` binds tool/domain/report source hashes. The older archived input hash is recorded in the report.
