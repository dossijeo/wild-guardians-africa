# Retaining routes while planting: dense full workday

Unchanged production Game and navigation versus the QA no-crop-epoch candidate, using the historical native Sabana/Musgum farm. Both arms pay for 112 older women and ten ordinary millet replants on verified clear ground, one every 30 simulated seconds during daylight (0–270). Each completes 6000 real 0.1-second ticks to the next dawn. Three cold restore windows compare 30 complete states per arm; the first includes a replant. No speed, terrain, budget, task order or growth override. Postgame produces no raids in this test.

| Result | Production | Candidate |
| --- | ---: | ---: |
| Physically delivered crates during workday | 205 | 201 |
| Physically picked crops | 199 | 195 |
| Water tasks satisfied | 1015 | 1000 |
| Newly mature crops | 373 | 366 |
| Final coins | 475892 | 475180 |
| Final living crops | 1154 | 1158 |
| Sampled valid-to-invalid active worker transitions | 5 | 2 |

All 143 actors are home at the 480-second checkpoint in each arm. Native economy/crate audits pass. Both finish day 102 with only the mandatory hiring pause, no defeat and no raid. This is an untimed functional comparison: the candidate changes task timing and yields four fewer deliveries / 712 fewer coins that day. It is not state-equivalent to production and the earlier short CPU experiment cannot be presented as a free, identical-work optimization.

The two candidate invalid transitions occur at tick 2 for the same legacy fleeing workers as production. Production additionally enters invalid endpoints in three working routes later in the day. These are point observations every 0.1 seconds, excluding already-invalid origins and home actors; they do not establish continuous terrain clearance. Retaining epochs does not repair those terrain defects. Navigation guard validation remains a separate task.

Two failed harness attempts are preserved with their original runners, reports and full states. The first tried planting after night began; Game correctly rejected the command. The second completed the production workday but used request IDs outside the existing intensive audit's naming convention. Only the QA daytime schedule and IDs were corrected, without changing the native audit or gameplay. The final terminal session 34350 exited 0 after completing both arms; sessions 90446 and 50406 exited 1.

This native dense case complements the [six early openings](../early-campaigns/README.md), but does not prove all cultures, all biome combinations, 100-night difficulty, GPU/mobile performance or safe production integration. No runtime/asset promotion accompanies this archive.

Run `node docs/qa/crop-route-epoch-experiment/dense-workday/verify.mjs` to check archived hashes, state snapshots and native financial/physical-crate invariants. It verifies recorded results and does not rerun simulation or independently re-execute the cold comparisons. The source farm, original Game/Nav and candidate are bound to adjacent archives; the runner, biome profile and audit are preserved here.
