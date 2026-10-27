# Gran Cañón/712 defended campaign, 19 October 2026

This is a second-biome check of the current production balance and Wild Engine,
not a balance change. It uses Mapungubwe, the `good` virtual-player strategy,
native intentions and wall plans, continuous Wild Engine, and the event-driven
topological defense policy. The source checkout was `a87467a6` (the
documentation-only PR #138 head, subsequently merged into `main` as
`f022d5dc`); the
campaign runner SHA-256 was
`745a77d05768a992ffe5c30853227a4415dbace813f393edf0ae4d02000b7b91`
and the production WASM SHA-256 was
`674bdf018817e1fa75e5181525faa3f516b90b9072af844fdc08e64fdcbf6b9c`.

Reproduce with:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 30 712 report-30.json topological
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 100 712 report-100.json topological
```

| Requested horizon | Actual result | Verified raids | Crops alive | Cash | Crop raid losses | Wall hits | `Game.tick` | Decisions | Wall time |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 | Active after night 30 | 30/30 | 51 | 995 | 24 | 506 | 92.3 s | 17.0 s | 144.0 s |
| 100 | Defeat after night 79 | 79/79 | 0 | 11 | 159 | 1,792 | 226.2 s | 42.3 s | 351.8 s |

The 30-night and 100-night requests produced identical crops-alive, cash,
crop-loss, and planting-count records for their first 30 nights. The full
long-run report is
[`gran-canon-712-79-nights.json.gz`](gran-canon-712-79-nights.json.gz).
Its uncompressed JSON SHA-256 is
`8daa09c0505218cff5a99027178df70f5d48c57ef1f7da79b693a9d3f7646c11`.
The report contains all nightly metrics and raid receipts; `raidEvidenceStatus`
is `verified` with no issues.

The farm had 48 living crops and 639 coins after night 60. It first fell below
ten crops on night 70, reached zero after night 78, and dawn 79 ended in an
economic defeat with 11 coins. The game's `dawnMinimum` requires a hiring
reserve and seed money when no crops or crates remain, so this was a normal
loss rather than an engine crash. The run bought 28 wall pieces for 280 coins;
wall hits and structure ruin events continued through night 77.

Average `Game.tick` cost was 3.09 s/night for nights 1–30, 3.37 s for 31–60,
and 1.72 s for 61–79 as the active farm shrank. The late collapse is a balance
and virtual-player-management observation, not evidence of time-dependent CPU
growth. In comparison, the same current engine and defense policy reached a
[narrow Sabana/123 victory](../defended-campaign-regression-2026-10-18/README.md)
at night 100 with one crop and 66 coins. These two seeds do not establish a
victory probability or justify changing production military parameters alone.
