# Fixed-camera planting-region candidate

Reproduce: `node tools/experiments/capture-loading-plant-region-20261022.mjs` (Vite port 5190).

Presentation-only QA. Original maize meshes, spacing, initial four plants and fixed per-aspect camera are preserved. The candidate restricts additional planting to a conservative projected envelope inside both 1280x720 and 390x844 views, evaluated at orbit -10/0/+10 degrees. Projection cameras are built once; checks run only on planting attempts, not each render frame. Original nearby-placement search is reused with the additional predicate. Neither simulation nor world planting is modified.

240 deterministic gesture-location queries through plantNearby produce eight plants. Capacity remains 18; this is the result of this sequence and available visible area, not a mathematical maximum. Later rejected attempts do not move the camera. Before/after camera, zoom 1 and FOV 40 are identical. All plants are fully mature (progress 1, mature true). Twelve real screenshots cover both formats, day/night and orbit endpoints/centre, with parallel rays, peripheral haze and existing QA garden/shadows. No GL or page errors. Six cached-shadow draws and 44154 triangles per frame. This is not a performance comparison against eighteen plants and no GPU savings are claimed.

Inspection of portrait centre/endpoints and landscape centre shows the additional plants inside the image without camera retreat. Three original plants fail the intentionally conservative box predicate; they are preserved and fit the inspected rendered frames. Thus the predicate is not evidence of a full-geometry visibility guarantee. Intermediate orbit angles, other viewport ratios, arbitrary gestures and resize behaviour require further validation before integration.

The fixture hides planting help at the end but leaves the illustrated parchment blank. A real region-full UI state still needs implementation. Overlay intentionally remains in loading state (99 percent) while plant growth is fully mature. These are QA captures, not native loading-flow screenshots.

Retain candidate direction: constrain the interactive garden to the view, never solve overflow by zooming away. This is not yet promoted to production; historical auto-framing is rejected by user direction. No main changes.
