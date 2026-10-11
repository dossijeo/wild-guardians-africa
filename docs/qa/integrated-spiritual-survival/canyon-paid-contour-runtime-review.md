# Paid Canyon contour: native daytime and first night

The retained seed-712 eight-crop paid perimeter was advanced using native `Game.tick`, with original terrain, workers, queues, wages, crop growth and delivery values. No crop was marked watered or mature by the probe. The input snapshot remains byte-identical.

## Daytime and passive reload

The one older female worker travels 176.04 metres over the five-minute day, satisfies water tasks for all eight original plants (16 water events), harvests and physically delivers eight crates. Income is exactly 88 coins, from `deliver:` ledger entries. Cash rises from 290 to 378. The automatic gate reaches `gateOpen=1`. A save/reload at second 150 round-trips exactly and the day finishes normally. Full per-second worker/gate traces and native events are retained.

The original crops are all harvested by second 300; there are zero living plants at night. Thus the first archived night validates structural attack/entry, but cannot demonstrate protection of crops. This limitation is explicitly retained, rather than describing an empty farm as protected agriculture.

## Fresh paid crops at night

A separate reproducible variant executes eight real plant commands at second 299 on the original harvested positions. It pays 40 coins and ends daylight with eight living seedlings and 338 coins. It does not move crops, reset growth, grant coins or alter the night plan.

The night driver uses the production entry preparer with the real Node worker transport, original RNG and native attacks. No shield is cast. One warthog approaches the paid perimeter and consumes two hits on a wall, reducing that piece from 100 to 60 HP, then retreats with zero remaining hits. The raid ends and dawn reaches day 2 normally. Both logical hits are structural; no crops are destroyed and all eight living seedlings remain. The worker's tasks, gate state and native animal positions are recorded.

| Functional observation | Result |
|---|---:|
| Real delivered crates | 8 |
| Actual delivery income | 88 coins |
| Paid replacement seedlings | 8 / 40 coins |
| Cash before planted night | 338 coins |
| Warthog hits used | 2 |
| Hits intercepted by wall | 2 |
| Damaged wall | 100 → 60 HP |
| Crops alive after night | 8 |
| Native raid completion | Yes |

This proves the small paid fixture supports actual work, an animated gate, entry, wall contact and retreat. It is not a multi-night balance comparison, a universal perimeter proof, a GPU/CPU benchmark, a repair payment test or a human activity metric. The introduction's normal damage safeguards remain active. A native no-wall control and later species/wave coverage are still required before interpreting economic advantage or promoting the candidate into campaigns.

Artifacts: `native-paid-canyon-worker-day-v1`, `native-paid-canyon-night-v1` (empty harvested farm), `native-paid-canyon-worker-replant-v1`, and `native-paid-canyon-planted-night-v1`, each with JSON report and gzip state. Technical observation errors are recorded separately from native defeats; none occurred here. The active v105 campaign's imported sources and parameters remain unchanged.
