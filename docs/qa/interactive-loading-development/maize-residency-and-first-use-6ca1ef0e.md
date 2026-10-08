# Maize texture-owner retention — native QA candidate

Frozen runtime6ca1ef0e, helper755d2e5f. Four sequential IAB contexts87–90; all explicit disposal/context loss and tab closure confirmed, final inventory empty. Same Sabana/Mapungubwe/media New Game, 1280×720 CSS / 1600×900 drawing buffer. Root/repair workloads idle during these runs. No fresh all-process inventory was taken, so no perfect isolation claim.

## Requested resources (87–88)

Both runs use BufferRequests (binding queries) and TextureRequests. Their frame/time numbers are instrumented and **not performance acceptance measurements**.

| Observation | Control | Retain existing maize owner |
|---|---:|---:|
| Requested-buffer peak | 68,519,166 B | 68,804,552 B |
| Requested buffers at controls | 62,242,476 B | 62,242,476 B |
| Explicit native texture objects at controls | 62 | 64 |
| Requested buffers after disposal | 0 B | 0 B |
| Dummy texture objects after disposal | 5 | 5 |

The existing diorama atlas/normal stores are native IDs4/5. Registration of the original Assets-owned maize samplers keeps these exact stores alive after the local copies disappear. The registration phase has unchanged65texture objects and unchanged54,857,654requested buffer bytes; no second atlas store is created. Control deletes IDs4/5 at handoff; the candidate retains them. Its unused soil store is still released. Final buffer counts are equal, but measured peaks differ by285,386bytes (+0.42%); this run does not attribute that difference to retention or establish physical peak RAM/VRAM neutrality.

Retained maps are2048² sRGB base with12mip levels and1024² RGBA normal with11levels. Four-bytes-per-texel mip arithmetic totals27,962,024nominal bytes. This describes additional final residency of previously present stores, **not physical VRAM, a new upload/allocation or a continuous peak measurement**. New Game intentionally keeps a cache it formerly discarded. Dense-farm/cancel/repeated-owner checks remain required.

## First use without resource probes (89–90)

Both arms additionally use the same QA program-only native crop-shadow precompile (47.8/48.7ms), already validated against the actual native cache key in the earlier81trace. Only the candidate retains maize samplers. No resource probes, renderer wrappers, GL tracing or timer queries run during these observations.

| CPU draw / two-second RAF maximum | Control | Retain maize |
|---|---:|---:|
| First maize draw | 93.8ms | 8.1ms |
| Maize RAF maximum | 83.2ms | 66.6ms |
| First millet draw (other atlas) | 71.3ms | 67.5ms |
| Millet RAF maximum | 83.1ms | 66.5ms |

Each command adds one original crop. Readiness, unchanged logical/save state, intended camera restoration, empty errors/console and explicit cleanup pass in both. This is one AB pair, **not AB/BA, GPU timing or a global fluidity acceptance**. The unused millet atlas is unchanged and still has a first-upload cost. Total initialization10.80/10.28s is likewise not an attributed improvement.

Real PNGs record the final stationary camera. The unobstructed rectangle(0,330)–(1280,720) matches RGB exactly. It shows village/terrain, while the crops are outside this opening camera framing: this proves parity in that visible region, **not crop multiview visual acceptance**. A focused crop comparison is still required. Raw reports and both PNGs are retained without replacement.

The helper remains QA-only; no production flag or asset changes were made. Reverse BA, focused crop/cancel/dense ownership checks, final-source matrix and total performance/memory acceptance remain open before PR.

## Reverse BA and full sequence (91–94)

Source remained frozen at runtime `6ca1ef0e` throughout both sequences. All four new reports were exported before explicit disposal/context loss/tab closure; the author's final browser inventory was empty. Root/repair did not run concurrent GPU or heavy CPU work. No fresh all-process inventory was captured.

Resource A1/B1/B2/A2 contexts are87/88/91/92. Binding probes again invalidate their timing values. Requested-buffer peaks were68,519,166 /68,804,552 /68,562,286 /68,472,406bytes; controls had62,242,476bytes in every arm and disposal released all tracked buffers. World-load texture objects were65/65/64/65, and controls had62/64/63/62. B2's one fewer texture was already present before retention; its cause is not established, and perfect texture-multiset parity is not claimed. Offline comparison of recorded storage signatures identifies the sole B1-only object as one35×35, single-level RGBA8 store (internal format32856), not a maize atlas; every other recorded storage signature matches at world-load. Registration did not change B2's64objects or54,857,654requested-buffer bytes. Existing atlas IDs4/5 survive handoff only in B arms; final dummy texture count is5 in all arms. This reproduces ownership/residency behavior, not physical RAM/VRAM neutrality.

Unprobed first-use A1/B1/B2/A2 contexts are89/90/93/94. Both arms use the identical QA-only shadow-program preparation; only B retains maize originals.

| CPU/RAF proxy | A1 | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| First maize render CPU wall time, ms |93.8|8.1|7.8|71.2|
| Maize two-second RAF maximum, ms |83.2|66.6|50.2|66.4|
| First millet render CPU wall time, ms |71.3|67.5|62.4|73.5|
| Initialization, ms |10,796.3|10,275.9|12,247.2|11,849.9|
| Controls available, ms |14,904.2|14,380.9|16,357.3|15,939.9|
| Whole-loading RAF maximum, ms |99.9|83.1|116.4|99.7|
| Whole-loading intervals above100ms |0|0|1|0|

The targeted maize CPU render stall is smaller in both B arms, with reference drift22.6ms. These are two observations per arm, CPU wall times and RAF callback intervals; no timer-query GPU duration or presented-frame measurement was taken. The other crop's first atlas upload remains costly. B2 still has a116.4ms loading interval. Total initialization shows drift and cannot establish a causal loading improvement or close global fluency acceptance. No candidate has been promoted into production.

Reverse reports: `maize-residency-candidate-ba-6ca1ef0e.json`, `maize-residency-control-ba-6ca1ef0e.json`, `maize-first-use-candidate-ba-6ca1ef0e.json`, `maize-first-use-control-ba-6ca1ef0e.json`. Existing negative/default evidence and initial AB reports remain intact. Focused crop visual QA, dense/cancel/repeated owner checks, broader profiles, final pipeline performance and physical-memory scope remain open.


## Focus-fixture negative control (95)

The first native focus attempt on fixture fd6e9500 failed because the QA camera filter incorrectly assumed transaction IDs were plant entity IDs. Game.plant correctly creates plant-N entities independently. Loading, paid commands and first-use windows completed; only the QA focus reported an error. The raw report maize-focus-negative-fd6e9500.json is retained, with explicit disposal/context loss and tab closure. The fixture now records entity IDs from the actual plants appended by the paid command and uses only those for visual focus, including dense saves. No production or gameplay change was required. Native rerun remains required.
