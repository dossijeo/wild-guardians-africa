# Positive static animal certificate reuse

The user-requested embargo on 100-night campaigns remains active. This change is experimental QA policy infrastructure only, not production collision, damage, economy or simulation rules.

`nativePerimeterReusedCandidateV2` separates its static animal enclosure certificate from worker-service validation. A WeakMap retains at most one positive static certificate per proof view. All worker-service checks execute on every invocation, even when the previous overall result rejected worker access. Negative animal certificates are not cached. Returned diagnostics are cloned to prevent caller mutations.

The exact signature includes the proposal, bounds/outline, navigation epoch, obstacle geometry, structures, villages/culture, suppression, living crop identifiers/positions/species/centre associations and terrain configuration. Field identity, height-cache identity and relevant terrain/navigation method identities are checked separately. Added, removed, moved or destroyed crops, damage/geometry/proposal changes, terrain replacement/configuration changes and changed adapters invalidate reuse. Worker positions are excluded from the static certificate because the independent worker validation still runs.

## Evidence

40 tests passed across the cache, native integrated proof, native paid Canyon completion and exact terrain tile tests. This includes fourteen explicit invalidation cases, clone isolation, no reuse of negative proofs, `cache:false`, and an integration test that certifies a real fixture, removes its workers, then requires `worker-passage-not-observable` despite the retained animal certificate.

The same stopped v111 snapshot used in the previous diagnosis was measured again. `v111-stopped-contour-static-cached-final.json` records explicit source hashes for the experimental modules as well as original-campaign source differences. First call: 11,054.64 ms; repeated call: **3.52 ms**, versus 11,719.62 ms for the previous uncached integrated candidate's repeated call.

`compare-static-contour-cache.mjs` and `v111-static-cache-exact-comparison.json` verify exact equality of every physical certificate field and worker result, excluding only `terrainTileDiagnostics`, which measures work actually executed. The first new proof matches the previous cold proof; the warm proof retains that exact certificate and performs the current worker check. Pose/component counters in a retained certificate describe its original certification, not newly executed checks. State serialization remains unchanged.

An initial whole-object comparison intentionally failed because it compared terrain execution counters as if they were physical outcomes (624 requests in the cached call versus about 78 million in the original first call). The final comparison excludes **only** that named execution-diagnostic object; it does not remove target, worker, route, pose or physical-certificate fields.

These are isolated sequential cold/warm observations, not statistical ABBA acceptance or a complete-day measurement. The first certification remains expensive, and new crops/harvests or geometry changes can invalidate reuse. A short native progression test must measure that invalidation frequency and total runtime before any new long campaign is considered. This evidence does not establish acceptable whole-campaign performance, successful worker navigation or campaign victory.
