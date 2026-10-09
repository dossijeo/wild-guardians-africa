# Desert raid connectivity — exact campaign regressions

Original failing terminal states are preserved byte-for-byte inside gzip files. SHA256 and frozen source3324 receipts are in originals.json; status heartbeats are older observations, not the terminal state.

Two independent causes:

- Musgum69 / Etiope73: fleeing workers have legal start/home footprints but their required detour is outside the default 16-cell route corridor. Stationary people subsequently block an exhausted animal under unchanged body-clearance rules. A 32-cell native worker search finds a physical route. Only returning/fleeing/incapacitated workers receive the incremental fallback, after both normal route and narrow slope recovery fail.
- Suajili71: a living lion with 2 attacks repeatedly chooses an approach whose quarter-metre static proof misses a narrow illegal slope peak. The strict actual landing rejects the first movement and the same target is chosen again. Near-limit animal segment proofs now refine to 0.01 m using the same full-footprint terrain predicate; the landing guard remains strict.

The preliminary main795 negative replays retain unchanged actor coordinates after 1 native simulated second. Diagnostic overrides first established causality; production source then independently completes all three raids without overrides. Exact dt 0.1 / dt 1 and partial-save cases pass in tests/desert-raid-connectivity.test.js.

Bounds: 8 pending native return iterators per Navigation; at most 8 popped nodes per request, 4096 slices/attempt (32768 pops), margin 32, 4096 failed exact keys per epoch. Searches preserve worker avoidance views, gate portals, physical solids, fluids, radius and movement speeds. Pending search state is disposable and is reconstructed after reload; no save version/format changes. Animal exact edge cache is capped at 10000 entries and invalidated by Navigation.version. Flat terrain keeps the coarse path; only a sampled footprint peak >= 0.46 invokes near-limit refinement.

Validation: 82 / 82 directed/native checks passed in `tests.log`. All 12 original snapshot variants (dt 0.1 / 1, with / without partial reload) finish the real raid without defeat and advance exactly one day. Includes old Saheliana day 25 / 28, legacy Suajili day 9, traffic and worker slope regressions. The final additional dry-canyon negative and bounds group passes 18 / 18 (`additional-bounds.log`); union totals 83 unique checks. Build exits 0 (`build.log`). Normal native motion enforces bodies/solids throughout; tests also assert no speed boost, hit-budget reset or illegal animal footprints. The previous worker regression asserting animals accepted a forbidden narrow strip now expects rejection: this is the Suajili bug being corrected, not weaker geometry.

Native completion without reload: Musgum 75.8 / 76 s; Etiope 137.7 / 138 s; Suajili 23.2 / 24 s for dt 0.1 / 1. Lion spends its existing 2 hits and then retreats. No reroll, artificial day transition, teleport, relaxed radius, collision, fluid or slope limit.

CPU evidence (`candidate-cpu.json`): full cold replay tick p95 = 6.97 / 36.06 / 17.74 ms and max = 278 / 685 / 961 ms respectively. These include all workers, normal synchronous searches, lazy collision chunks and terrain. The unchanged baseline first ticks are already 798 / 604 / 690 ms (`baseline-main795-cpu-first-second.json`); it never resolves the raid. Their durations differ and are not equivalent-performance trials.

Diagnostic wrappers attribute helper p95: returning-route slices 0.165 / 0.206 / 0.223 ms; maximum 24.9 / 28.6 / 23.2 ms. Animal proof p95 0.039 / 0.074 / 7.78 ms; maximum 11.9 / 23.9 / 42.6 ms, with costly cold lazy-chunk calls explicitly recorded (`candidate-helper-attribution.json`). Instrumentation adds overhead; return completion may include native route reconstruction/smoothing, and outliers also include runtime allocation/GC. We do not assert a specific cause for every return outlier or an improved global frametime.

Reproduce full CPU receipts with `node tools/qa_desert_raid_connectivity.mjs`. No GPU or 100-night campaign claim. This fixes the diagnosed physical deadlocks; normal search/cold initialization costs remain an independent optimization scope.
