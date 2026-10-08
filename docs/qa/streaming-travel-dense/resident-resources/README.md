# Resident preparation: resource acceptance remains open

Native historical Gran Rio/Suajili dense farm, current runtime `8163f2d0`:
1,257 living crops, 34 workers, media quality. QA-only `residentPrewarm`,
`isolatePreparation` and `resourceProfile`; camera stationary for five seconds.
One graphics context; four CPU campaigns active. No physical-memory measurement.

| Stage | Observed live buffer bytes | Buffers | Geometries | Textures | Programs |
|---|---:|---:|---:|---:|---:|
| Before resident preparation | 79,879,812 | 1,448 | 230 | 99 | 70 |
| After resident preparation | 289,254,708 | 6,871 | 1,009 | 119 | 82 |
| After stationary interval | 289,254,708 | 6,871 | 1,009 | 119 | 82 |
| After world disposal | 0 | 0 | 0 | 5 | 4 |

The preparation interval adds 209,374,896 requested buffer bytes (about 199.7 MiB).
It can include pending native preparation as well as the all-visible resident
draw: no paired control separates their contributions. Nevertheless this run
contradicts an assumption of negligible additional buffer storage. Do not promote
the full resident prewarm on the strength of its shader-stall reduction alone.
Investigate selective program warming without uploading normally hidden models,
growth stages or LODs. Isolated far preparation is a separate candidate.

The existing BufferRequests probe observes actual bufferData requests and
deleteBuffer calls, without polling GL errors. It starts after WorldScene
construction and excludes textures, programs, driver caches, heap and earlier
allocations. Its binding queries perturb timing; GPU timer queries were disabled.
Do not use this report's frame intervals as a performance comparison.

Reported state unchanged/errors empty; disposal observed before tab 819 closed.
No unattributed requests and all tracked buffers deleted. Remaining five textures
and four programs are renderer counts, not proof of a leak or physical release;
their ownership and context-loss accounting remain separate acceptance work.

`node docs/qa/streaming-travel-dense/resident-resources/verify.mjs` verifies archived
hash and reported stage arithmetic. It does not reproduce browser/GPU behavior.

## Next candidate: programs without hidden-geometry uploads

QA fixture parameter `residentPrograms` selects compilation plus lazy program
bindings and a GPU fence, without the all-visible upload draw or shadow-cache
invalidation. It is mutually exclusive with `residentPrewarm`. Three r180 compile
traverses all materials even when meshes are hidden; native lighting visibility
is retained. This is program preparation, not full geometry/texture readiness.
Hidden depth/shadow variants and future chunk programs can still appear later.

Fourteen directed tests pass (resident preparation, program bindings and buffer
probe), and all 148 browser scripts parse. Real GPU resource and travel evidence
for this new candidate is still missing: no optimization or acceptance claim.
Use `resourceProfile` for storage accounting separately from uninstrumented ABBA
travel measurements. Production uses neither resident experiment.
