# Mixed species head-on trial

Added optional peerSpecies to the existing fixture. It validates the species against ANIMAL_ACTIONS, uses that species navigation radius and checks initial separation against both actor radii. The report records both species. No production behavior changes.

Recorded installed hyena and rhino in real Attack/Game.tick, daylight at the existing flat site. Both complete physical recovery and resume walking, errors empty and finalDownCount zero. One-second frames inspected. During falling/rolling the actors are very close and partially occlude one another; this view does not certify skin-level nonpenetration. Requires closer contact diagnostics before accepting collision quality. Silent capture, no audio acceptance or paired performance conclusion.

## Instrumented recovery repeat

Reran with peerContacts=1 (hyena-rhino-contacts.json), no video recording. 135 trace samples, including 30 pair samples while at least one actor was recovering: no negative articulated collider distances and no intersection of full deformed-mesh AABBs. This supports separation at those sampled recovery instants only. The diagnostic deliberately excludes pairs where neither actor is recovering, so initial falling/rolling contact is not certified. Both actors completed recovery, errors empty. Full-skin scans add diagnostic overhead; do not use its frametimes as production performance.

## Falling and rolling instrumentation

Added opt-in peerFalls=1 to extend existing diagnostics beyond recovery; default behavior remains unchanged. Repeated real mixed-species collision, with 61 pair samples over falling/rolling/recovery: no negative collider contact distances. There are 36 intersecting full-mesh AABB samples. AABB overlap is only a candidate, not a mesh penetration; ornaments and limbs enlarge those boxes. Do not infer skin-level clearance from collider clearance. Both recover, errors empty. No production physics edits made on this evidence. Raw trace and compact summary are in hyena-rhino-falling-contacts.json and hyena-rhino-falling-summary.json.
