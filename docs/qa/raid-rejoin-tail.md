# Validate the retained tail of local traffic shortcuts

The fresh Gran Río/Mapungubwe campaign started at `fc3c138` and failed at the
unchanged incursion limit on night 64. Its last completed day was 63. The final
remaining buffalo is retreating with no path; native Navigation finds its
position inside the intact work center. The validated complete failure state
is archived losslessly in `raid-rejoin-tail/state-before.json.gz`, together
with actual provenance and `position-before.json`. The recorded run remains a
failure, not a hundred-night completion.

A regression independently reproduces an unsafe shortcut in the traffic code.
An original bent route goes around a solid building. Two temporarily occupied
waypoints cause a rejoin toward a later waypoint. The old code checked only the
four-meter lookahead, then retained a new straight segment beyond that point
without checking it. That tail could cut through the building. The test fails
on the preceding code with `The unchecked tail of a shortcut must not cross the
building`; the original route's segments are all explicitly checked as valid.

The motion planner now checks the retained tail only when it skips waypoints
and the selected point is beyond the lookahead. If that tail is blocked, it
routes to the full selected waypoint, so every new connector is checked against
native static geometry. It preserves original route/destination, body clearance
and speed. If no safe detour exists, it retains the original route and waits or
uses the existing verified yielding behavior. The normal route does not incur
this extra tail check; the renderer and shader are unchanged.

The regression now passes, including safe resumption of the original bent route
when the two bodies leave. Before/after TAP files are archived. All 401 directed
navigation, traffic, gate, encounter and raid tests pass, as do the opening-state
equivalence, web build and package checks.

The unchecked shortcut is a verified defect consistent with the recorded
inside-building position, but the exact earlier frame of that campaign was not
captured. This is a preventive correction: it does not relocate the already
invalid actor in the archived failure. A fresh continuous hundred-night Gran
Río/Mapungubwe run must verify the outcome and detect any remaining mechanism;
the regression alone does not prove that campaign or the full matrix.
