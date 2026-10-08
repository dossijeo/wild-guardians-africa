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

## Program-only native resource follow-up

Runtime `b3dd9621`, same archived farm/device/quality, single new context 820,
stationary five-second interval. No concurrent loading-screen GPU context.

| Stage | Live buffer bytes | Buffers | Geometries | Textures | Programs |
|---|---:|---:|---:|---:|---:|
| Before programs | 79,879,812 | 1,448 | 230 | 99 | 70 |
| After programs | 80,424,806 | 1,476 | 234 | 99 | 81 |
| After stationary interval | 80,424,806 | 1,476 | 234 | 99 | 81 |
| After world disposal | 0 | 0 | 0 | 5 | 3 |

Observed interval adds 544,994 bytes (0.52 MiB), substantially less than the
full-draw interval. Pending native preparation can still contribute these
allocations; no claim of zero overhead or isolated causal attribution. Textures
remain 99 during preparation. Lazy bindings initialize 81 programs with zero
unsupported; preparation elapsed 138.2 ms in this instrumented run, not a timing
benchmark. State unchanged/errors empty, no unattributed buffers, cleanup to zero.

This closes one resource observation, not the acceptance gate: run uninstrumented
travel ABBA to check whether reduced shader stalls survive without hidden uploads.
Depth/shadow variants may still stall; resource probes do not establish VRAM/RAM.
The earlier statement of missing native evidence above describes the state when
the candidate was introduced; this follow-up supplies storage evidence only.
# Resident texture preparation interval

Additional stationary resource run on main 3f3ace67 (tab 828): same archived
dense farm/device, await 34 actors, isolated far preparation, resident programs
followed by residentTextures. The texture phase initializes 27 identities in
465.3 ms including per-frame yields and the final GPU fence. Two native calls
take 15.7/20.9 ms; this is instrumentation-specific timing, not a travel benchmark.

Before/after texture phase: tracked buffers remain 80,424,806 bytes / 1476
buffers / 234 geometries / 81 programs. Texture count grows from 99 to 101.
No extra buffer upload is observed in this interval; do not equate that with
physical RAM/VRAM neutrality. Renderer counts do not measure texture storage.
State unchanged, errors empty, unattributed buffer calls zero. Disposal returns
tracked bytes/buffers and geometries to zero; renderer retains five textures and
three programs before context/tab destruction. Tab closed.

`textures-receipt.json` hashes the uncompressed raw report; `verify.mjs` checks
the phase arithmetic, farm/device, fence and cleanup. Separate uninstrumented
ABBA and visual checks are still required before production integration.
### Rigid crate shadow-program resource interval

Native tab 832, source `8726ceeb`, repeats the same stationary dense Gran Río
fixture and awaits all 34 actors. Immediately before/after the no-draw depth
primer, tracked buffer storage stays at 80,424,806 B / 1,476 buffers,
geometries at 234, texture objects at 101. Programs increase from 81 to 82.
The stationary five-second phase retains those counts. Disposal records zero
live tracked bytes/buffers and geometries; five texture objects and three
programs remain before renderer/context destruction, as in the preceding arm.

The raw report, hash receipt and endpoint screenshot are `crate-closed.json.gz`,
`crate-receipt.json` and `crate-final.jpg`. The existing verifier now checks
farm/device identity, interval arithmetic, one-program delta, cancellation-free
completion and cleanup. This measures requested buffer storage and object
counts, excluding physical VRAM/RAM and driver shader caches. Instrumented
frame times are not performance evidence. Fresh uninstrumented AB/BA and
visual/shadow regression remain open before production integration.
