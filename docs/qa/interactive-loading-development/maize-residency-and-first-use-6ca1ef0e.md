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
