# Sabana/712: paired service-site campaign probe

The same experimental JavaScript source and frozen `good`/`intent` campaign inputs requested 14 continuous nights twice. Only the Wild Engine WASM binary changed. Both reports record identical game, raid, and runner source hashes. This is a behavioral comparison, **not** a pure speed benchmark: the daily states diverged on day 1.

| WASM | SHA-256 | Outcome | Last complete day | Cultivos / monedas at that day | Elapsed |
| --- | --- | --- | ---: | ---: | ---: |
| Previous | `d757c2197f98fded1cb42b7759154f1bd95a532504da9539c2e8ade17a9f47b6` | Technical error: unfinished day-13 raid | 12 | 54 / 428 | 233.28 s |
| Alternate crop service sites | `291b8ab66366c4cc066ccad4ea7b4bd85d704f8fa895294d90ae727516be3ce1` | Completed all 14 nights; no terminal defeat | 14 | 16 / 295 | 248.63 s |

The corrected run verified all 14 raids with zero observer issues and ended at the day-15 dawn with one operational center. The old run did **not** complete its requested horizon. Its day-13 error snapshot has 15 animals marked `gone` and one buffalo (`animal-12273`) still `retreating`, with zero hits remaining, `path: null`, and exit target `exit-animal-12273`. It remained at approximately `(76.54, 14)` rather than reaching its exit. The campaign runner rejected the unfinished real incursion; it did not count a technical timeout as a defeat or completed night.

This probe cannot establish that the crop-service-site change directly fixes the buffalo retreat: the campaigns diverged from day 1 and produced different world states. It does show that the candidate survives this seed and horizon without a reported raid problem, whereas the previous binary exposes a separate retreat failure in its trajectory. The old partial state is retained for a directed reproduction of that failure. Do not present the 248.63-versus-233.28-second elapsed times as a speed comparison because one run stopped early.

The Gran Cañón/123 paired run remains negative survival evidence for the same change: see [its report](../service-sites-canyon123/README.md). Together, these two seeds support continued technical validation, not a general survival claim or a merge of draft PR #53.

Reproduction command, changing only `WILD_ENGINE_SPATIAL_SERVICES_WASM` and `WILD_ENGINE_NATIVE_ROUTE_WASM` to one of the archived CI binaries:

```text
node tools/experiments/run-native-intent-campaign.mjs 14 sabana 712 good OUTPUT.json intent
```

Raw reports: [previous](old.json.gz), [alternate](alt.json.gz), and [previous failure state](old-partial-state.json.gz). The reports include exact input hashes, parameters, daily hashes, finances, and native planning counters.
