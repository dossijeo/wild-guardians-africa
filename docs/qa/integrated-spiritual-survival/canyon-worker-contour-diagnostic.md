# Canyon rejected-contour worker route diagnosis

The retained playable day-six snapshot from v97 was probed against rejected refined shoreline candidates 5 and 7. Both had passed the preceding native animal-service enclosure checks but failed `native-worker-route-blocked`. No candidate is approved, bought or promoted by this diagnostic.

For each candidate the diagnostic recreates the exact native wall quote, verifying piece count and cost, and evaluates three navigation views: the original farm, quoted obstacles, and quoted obstacles with quoted prop suppression. Candidate 5 contains 56 pieces for 560 coins; its suppression list is empty. All views have a body-valid start for each of ten live workers and the centre service point.

In both candidates, `worker-2161` (currently `fleeing`, at approximately -13.57, 57.32) cannot obtain a bounded route to the first living crop's exact centre, even in the original unmodified farm. The other nine workers and the centre service origin can obtain that route in all three views. Thus this particular failed query is not introduced by the proposed contour. A bounded failure still does not prove global inaccessibility.

The expanded v2 probe uses the existing native `wateringRoute` and verifies `canWaterFrom` for every returned service destination. All ten workers and the centre service origin obtain valid watering routes to that same crop in all three views, for both candidates: 66 successful watering-route checks in total. This supports replacing the crop-centre-only worker check with an actual service-route proof; it does not justify ignoring obstacles or accepting a route-less worker. Access to all crops, deliveries, gate operation and paid defense remain separate gates.

Raw v1 (centre queries only), v2 and candidate-7 v2 outputs are retained with input hashes and their tool/source hashes. The native serialized snapshot is unchanged in every successful diagnostic. The probe checks existing output refusal and exact contour/snapshot correspondence. It records a limited relevant-source hash set, not a full historical-source replay claim. CPU times were obtained while a separate native campaign was running and are not controlled performance benchmarks.

An initial isolated diagnostic attempt failed its unchanged-state assertion before output: constructing an already initialized opening-world navigator and then attaching the retained snapshot incremented its in-memory navigation epoch. This was a diagnostic setup error, not campaign movement or a perimeter failure; the retained input was never written. The tool now constructs a fresh native `Navigation` directly from the recorded biome profile, preserving the saved epoch, and keeps the unchanged-state assertion active.

No imported campaign module has been changed while v105 is live. After that campaign is terminal, a service-based proof candidate should be implemented with positive and negative worker-access regressions and rechecked against animal enclosure, gate access and real paid construction before another Canyon campaign.

## All-crop service extension

The v3 candidate-5 diagnostic additionally checks every living crop from its associated centre service point, followed by a native route from its watering destination to the nearest authored centre delivery edge. All 123 living crops have both routes in the original view, quoted-obstacle view and quoted-obstacle-plus-suppression view: 369 successful outgoing and 369 return queries. These are static routes, not executed watering, harvesting or crate income; dynamic gates, motion and paid defense still require native campaign evidence. The serialized snapshot remains unchanged. The concurrent CPU observation (about two seconds) is diagnostic, not controlled performance acceptance.

Two native regression tests pass: the retained worker's crop-centre query fails in both original/proposed views while its valid watering service succeeds, and all 123 proposed-contour crop service/return routes succeed; a separate solid-footprint negative case rejects watering and leaves the snapshot unchanged. They establish the service-query regression without changing the live campaign or approving a contour.

The broader first run passed 14/15 checks and exposed a stale terrain-mutation fixture in `watering-approach.test.js`: it changed canyon/fluid fields in place while only clearing integer/segment/failed-path caches, leaving the exact fractional cache at the previous topology epoch. The fixture now advances `nav.version` when it changes terrain, matching the production invalidation contract. The previously failing solids/fluid/slope check passes in isolation. No production cache or navigation behavior was altered to make that assertion pass.

The corrected complete three-file regression passes 15/15 tests, including inaccessible plateau dormancy, reload, four worker profiles, positive enclosure certificates and blocked service routes.
