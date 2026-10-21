# Event integration: experimental status

Wild Engine already subscribes to confirmed events through observeGameEvents.
The renderer must not drain intentChanges independently of its current consumer.
Streaming onData supplies a separate lifecycle boundary for chunk data.

The initial persistent adapter removes matrix rebuilding but still scans metadata.
The event lifecycle variant retires source memory on chunk removal and mesh
 disposal (including partial resident-prop replacement). Its A/B/A/B has exact
images and draw counts, reducing registry CPU from 0.054-0.064 to 0.005-0.006 ms.
Total frame cadence does not consistently improve.

The engine variant captures 40-byte native prop records synchronously at the
chunk payload boundary. The Engine pointer is transient: selection and memory
growth can invalidate it. A bulk snapshot is retained per installed chunk and
copied once into independent renderer WASM memory. Native code filters by slot
and suppressed IDs and constructs Float32 matrices. It does not traverse JS
instance records for this operation. Population mismatch is a hard error.

Tests cover matrix parity with Three.js, suppression, stable ordering, memory
growth, disposal, and partial slot replacement without JS record access. Signed
zeros are numerically equivalent; all nonzero Float32 entries match exactly.
The native suppression lookup remains linear and needs realistic stress testing.

## Completed Engine-packed comparison

engine-abab/summary.json passes exact day/night pixels and per-frame camera,
draw-call and triangle equality: 1440 GPU samples, 2880 cadence frames.
Group CPU drops in all four paired blocks by approximately 8-15%. Total render
CPU also drops, but cadence changes sign between repetitions:

- Day: 17.877 to 18.120 ms; 18.384 to 18.094 ms.
- Night: 17.597 to 17.814 ms; 18.753 to 17.967 ms.

This does not establish a consistent full-frame gain. Candidate input preparation
remains 0.125-0.136 ms. LOD/fade metadata checks and grouping still execute in JS.
Direct packed registration alone has not removed this hot-path cost.
The earlier smoke run had six night pixels differing by one channel level;
this did not recur in the full comparison, but its cause remains unproven.

Reproduce with WR_ORDER=combined,engine,combined,engine and
WR_OUT=docs/qa/wild-renderer/engine-abab, then run measure-wild-renderer.mjs
and audit-wild-renderer.py with --engine.

## Outstanding work

This connects streaming lifecycle data, not every simulation event. Live world
changes, dense scenes, complete event invalidation, CPU memory accounting and
end-to-end benefit still need validation. Shadows, LOD and obstruction retain
existing JavaScript representations. No adoption recommendation or GLES emission
variant is justified yet. No production simulation/navigation code was changed.

## Confirmed-event subscription and dense follow-up

The independent `engine-events` variant subscribes to observeGameEvents. It
reads the initial suppressed identities once, then processes only newly appended
identities at event delivery. Unrelated events do not revisit old records.
Native batch registration consumes the cached compact integers. Tests cover
partial replacement following PlacementCommitted and disposal of the observer.
This does not yet move all render grouping or LOD/fade invalidation into WASM.
No game performance result is claimed for this additional variant yet.

The first engine-dense-abab series is invalid for performance attribution:
four frames differ in draw/triangle counts across three blocks, and the final
day screenshots differ at nine pixels (maximum channel delta 28). Night pixels
match exactly. No mismatched frame is removed from the data. Dense warmup was
only 60 frames of a 180-frame camera loop; the follow-up engine-dense-warm-abab
uses a full 180-frame warmup. This is a protocol correction to test, not a proven
explanation of the mismatches. That run is still pending.

The full-camera warmup did not establish dense equivalence. Differences recur
at camera phase 105-106, including between repetitions of the original adapter.
The completed engine-dense-warm-abab is therefore also excluded. A separate
renderBufferDirect trace now records object identities and actual draw-count
contributions around frames 100-110. Trace-run timings are explicitly ineligible
for performance claims. The protocol must identify the divergent objects before
another performance comparison is meaningful.

A QA mutation helper is prepared to issue three real crop commands against the
dense fixture, preserving placement validation and publishing real CropPlaced
events. It records affected and retained source registrations. Its initial execution was pending at that point; verified results follow below.

## Draw-level evidence for dense mismatch

The diagnostic original-adapter night GPU/cadence traces diverge at frames
105-106. The extra draws include a 2401-vertex terrain mesh (4608 triangles),
water/prop meshes at world origins (240,0,0) and (240,0,-48), and increased
native_merged_assets instance counts. This identifies streamed chunk contents,
not an actor animation or merely a changed counter. A complete warmup cannot
stabilize data that the moving residency window subsequently evicts/reloads.

Next comparison must distinguish a fixed-residency rendering workload from
streaming latency under moving residency. Neither metric substitutes for the
other. Existing dense results remain excluded from CPU/GPU speedup claims.

## Verified real crop events

engine-event-mutations-verified/engine-events-mutations.json records three real
plant commands in a peaceful daytime stress fixture (animals removed for this
command test; UI pauses restored synchronously afterward). Each command passes
normal placement and purchase validation and emits CropPlaced.

The first stronger check exposed stale renderer data: the suppression Set had
changed contents without changing identity, so syncResidentProps skipped its
refresh. The event variant now explicitly invalidates propSuppressionSource
when new suppression records arrive. This change is QA-only; stable renderer
code is not altered.

After the correction, every command retires exactly one registered batch and
retains 172 others. Checks confirm the navigation suppression view is updated
and no registered batch retains any newly suppressed ID. Chunk packed data is
reused; suppression records copied into native scratch total 12, 24 and 36 bytes
respectively (the cumulative suppression list is still copied on registration).
These command timings are single-run diagnostics, not an FPS benchmark.
The earlier engine-event-mutations output lacked the stale-record check and must
not be used as correctness evidence.

## Fixed residency result

fixed-dense-events-abab uses the same 49 resident chunks in every variant and
zero chunk creations during both measurement passes. All 960 GPU frames and
1440 cadence frames have equal camera/draw/triangle sequences. This isolates
renderer preparation from the previously identified residency timing difference.
It is a larger fixed workload, not a replacement measurement of normal streaming.

Exact image equivalence still fails: three daytime pixels differ (maximum
channel delta 26) and fifteen nighttime pixels differ (maximum delta 37).
The cause is not established. The strict auditor therefore keeps this run
invalid for a performance claim; no tolerance was relaxed to make it pass.

Even as exploratory timings, results are inconsistent: day render CPU changes
15.242->14.426 and 14.558->12.854 ms, but night changes 12.544->15.503 and
13.125->12.801 ms. GPU means span 34.310-43.502 ms. No robust end-to-end gain
has been established. Eight targeted tests pass, including real-event adapter
logic and native matrix equivalence; these do not prove visual parity of the
whole dense renderer.

Current recommendation: retain Three.js/WebGL2 and keep Wild Renderer as an
experimental module. Do not implement the conditional GLES submission variant
or integrate this prototype into the production renderer on this evidence.
The event invalidation and packed-memory approach is viable and removes work,
but the remaining JS grouping/LOD/fade metadata checks and GPU load prevent a
clear end-to-end conclusion. Streaming latency quantification and the remaining
pixel discrepancy are explicit limitations, not successful validations.

## Independent image repeatability

The capture harness now stores one screenshot per block and records its path;
previous series retained only the final screenshot for each variant/phase.
Their exact-image claims therefore applied to those retained images, not every
individual repetition. The auditor reports capture-history availability and
checks every pair when individual captures exist.

dense-image-repeatability contains two fresh pages per variant, day and night,
with no benchmark measurements. Original/original differences are 4 daytime
pixels (max delta 31) and 1 nighttime pixel (max delta 4). Event/event differences
are 7 daytime pixels (max delta 12) and 6 nighttime pixels (max delta 1). One
original/event nighttime pair is exactly equal. This demonstrates baseline
image non-repeatability; it does not prove that every cross-variant difference
has the same cause. No performance threshold or pixel tolerance was relaxed.
The existing recommendation to retain the production renderer is unchanged.
