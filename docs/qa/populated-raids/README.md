# First incursions in populated paid farms

Six first-day runs on main 6ffc0ef use ordinary intensive reinvestment commands,
seed 712, Mapungubwe, paid crops and six older female workers. No money, time,
group, RNG, movement or damage is overridden. The observer hook returns
undefined and captures the native night trigger before its spawn RNG draw;
ordinary synchronous selection still executes. Each run reaches dawn and passes
the ledger, physical delivery and save audits. Snapshots include the original
introductory night plan, not a forced five-species group.

| Biome | Living crops before spawn | Physical deliveries in the day | Prepared first-update median CPU |
| --- | ---: | ---: | ---: |
| Sabana | 66 | 43 | 99.18 ms |
| Gran Río | 66 | 43 | 79.22 ms |
| Manglares | 66 | 43 | 1.02 ms |
| Volcanes | 66 | 43 | 90.32 ms |
| Gran Cañón | 58 | 27 | 12.74 ms |
| Desierto | 57 | 16 | 0.90 ms |

Every `routes-*.json` alternates four reference/prepared repetitions, using
the saved native plan including introductory hit budgets. All complete game
states match at each of twenty real Game ticks of 1/60 second. The corresponding
biome JSON stores the exact pre-spawn snapshot and the completed first-day
report with input provenance. `summary.json` records input hashes and the
unchanged capture tool hash.

These measurements reveal remaining route cost in populated farms. Sabana,
Gran Río and Volcanes still take roughly 80–100 ms for the first prepared
update. In Volcanes the reference first update is 11.27 ms while prepared is
90.32 ms: navigation work warmed during synchronous entry is deferred to the
first target search when preparation runs separately. Total spawn plus twenty
updates improves in this trial, but the prepared path is not uniformly cheap.
These parallel Node runs competed with the isolated long campaign and are not
GPU/mobile frame-time measurements. This remaining work must be addressed.

`browser-desierto.json/png` loads the naturally reached 57-crop, six-worker
snapshot into production WorldScene at very-low quality. The fixture's camera
and resident bounds define its diagnostic entry view. A native module worker
prepares the unchanged state; one prepared result is used, spawn takes 1 ms,
and a real CropHit occurs after 5.15 simulated seconds. The balance stays 299,
no error is recorded, and the largest Game tick during that replay is 29.8 ms.
This is a loaded-snapshot replay with no audio/HUD or physical phone, not
continuous player interaction, full campaign balance or perceptual acceptance.

The isolated c86e64b matrix currently has two completed hundred-night cases
(Sabana/Mapungubwe and Sabana/Saheliana). Its remaining children were confirmed
live. That older snapshot predates the new entry selection and cannot prove
hundred-night balance of this change.

Reproduce with new output names:

```
node tools/capture_populated_raid.mjs desierto mapungubwe NEW_CAPTURE.json
node tools/benchmark_raid_first_routes.mjs NEW_CAPTURE.json NEW_ROUTES.json 4
```

The native browser replay is
`tests/browser/populated-raid.html?biome=desierto`.
