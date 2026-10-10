# Owned exterior-graph preparation candidate (not production-ready)

Base main `9f0f65ed`; previous candidate `3285c621`. No balance, terrain, camera, radius, target reservation, game-clock, actor, price or damage change. Branch codex/raid-exterior-entry only. Prior v2 files and historical negatives remain byte-exact; their source receipts remain tied to their original commits.

## Ownership and physical inputs

The existing computeRaidEntry/raid-entry-worker now returns the complete exterior regions for every real actor radius, alongside successful-query warmth. The graph input key contains the navigation epoch, seed/biome/culture/terrain version, navigation config/profile, settlement site/village geometry, structure geometry/material/gate/operational membership, suppression and active shield geometry. HP magnitude, positive shield duration, camera and clocks do not change this key. The entry key additionally retains the original camera/bounds/group/RNG/operational checks. The isolated navigator also reconstructs the actual request config, not merely assumed defaults.

Every request has a preparer owner, monotonic job token, exact request snapshot proof and owned worker/terrain-field identities. Complete results from the in-process compute function are privately branded and deeply frozen; arbitrary cloned/key-shaped replies do not qualify. Browser replies must originate from the native MessageEvent of this preparer's genuine owned Worker. The createWorker integration factory is trusted host code; this is a provenance contract, not a sandbox against hostile JavaScript which rewrites application modules. The native browser-event branch has not yet been exercised by these Node tests: that remains a QA gate.

Adoption first verifies origin, owner, token, snapshot, current physical key, field identity, finite successful-query warmth and all polygon/radius limits. It validates all radii before installing anything. Limits:8 radii,4,096 polygons,50,000 finite vertices,16 MB exact proof; warmth retains the native 8 chunk / 5,000 walk / 10,000 segment / 128 path / 20,000 point limits, plus a 500,000 node / depth 16 finite transport inspection. Installed region copies are private and immutable. Cache ownership is navigator+physical key+field; at most8keys/8 radii per navigator. Resource-pressure/peak-memory acceptance for worst-case farms is still open.

Only after ownership checks can warmth enter the navigator. The independent spawn predicate still verifies exact whole-group counts, finite valid active bounds, exterior bodies, native walkability, radiusSum+1 separation and both escape directions. Arbitrary nav.preparedRaidEntry hooks do not inject warmth at spawn. Camera-only obsolescence may install a complete current physical graph but cannot provide its old entry. Physical-key/field changes, wrong proof/owner, cancellation, disposal, worker failure and late token replies cannot install stale/partial results. Abandoned worker work may still complete in the worker; logical cancellation rejects it, not a claim that underlying CPU execution is interrupted.

## Frozen CPU evidence

Receipt adoption-v3-receipt.json covers 339 runtime/content/test sources and 11 original payloads. Verifier: node tools/audit_raid_exterior_adoption.mjs. Tests are CPU-only; no renderer/GPU/CI/campaign/production acceptance.

Final suites:17 ownership/adoption cases (13+4 disjoint name filters),15 existing preparer cases (six biome direct/prepared full-state parity),9 existing exterior geometry/native cases,2 advanced controls,1 group of 12 physical fixture:44 distinct cases passed. Original shell exits and commands are in the receipt.

The advanced retained paid farm has 103 walls and 865 living crops. Final single CPU observation: key 0.6033 ms, request 6.8076 ms, private compute 313.5197 ms, adoption 5.2282 ms, prepared spawn 4.5298 ms, main exterior-graph builds 0. Earlier observation is preserved too (not ABBA/statistical benchmarking). Geometry key 38,777 bytes; JSON reply 388,826 bytes. In-process private navigator models computation/ownership mechanics; it does not prove browser worker scheduling, native event delivery or rendering frametimes. Construction of requests and finite adoption validation are measurable work, not free.

The worker-unavailable control still executes direct main-thread spawn: 203.535 ms and 1 cold exterior-graph build in the final sample (earlier 253.2722 ms preserved). This is an explicitly FAILED performance gate, not an accepted fallback. No raid is silently suppressed by this candidate; existing synchronous fallback semantics remain unchanged.

The paid Sabana/Saheliana seed 712 enclosure has 17 real modules with native automatic gate and one ordinary paid crop. A fixture-supplied12 mixed-species plan does not change production raid count parameters. Owned preparation selected exterior separated bodies, matched the entire direct post-spawn state/RNG, and ordinary Game.tick(.25) carried all 12 actors through real reserved attacks to their exact physical exits across save/reload. Raw initial/final snapshots are retained: 4 real structure/logical hits,43 unused strikes,12 gone/exact exits; ledger unchanged. This is one narrow navigation fixture, not horde risk, campaign, natural-boundary fullmatrix or balance acceptance.

The first physical observer failed because copied actor samples stopped before the tick which clears the raid. Its raw log and original source remain in the archive. The corrected observer holds actual native actor references before that final tick; it did not weaken gone/exact-exit/ledger/hit assertions. Final initial snapshot SHA 20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376; final SHA 7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416.

## Open gates

No promotion/PR. Unprepared/worker-unavailable/late geometry changes still take a cold synchronous path. Native browser worker transport/event authority, advanced dynamic memory/per-frame costs, broadened group12 physical natural-boundary coverage and current main integration remain pending. See fallback-proposal-v3.md before changing scheduling or clock semantics.
