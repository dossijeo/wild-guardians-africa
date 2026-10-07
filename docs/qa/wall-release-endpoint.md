# Wall release endpoint

`WallDrawing.up()` previously submitted only samples received by `pointermove`. If `pointerup` carried a later position, the final segment disappeared; without any move event, even a long release displacement became a tap.

Release now updates the drag distance and appends its missing endpoint using the same spacing and capacity limits. An unchanged endpoint adds no duplicate. The last input position follows the final coalesced sample, so an incomplete coalesced list cannot suppress the release endpoint. Cancellation and multi-pointer camera gestures do not append or resolve it.

The production screen-space gesture still performs no terrain queries during drawing. Terrain resolution and construction happen on release. Tests cover screen/world curves, release-only drags, short taps, coalesced input, cancellation, immediate paid construction and the hiring reserve.

Validation: all 41 tests in wall-drawing, wall-gesture-budget, wall-release-feedback and wall-layout passed. After extending the payment test to three release variants (matching, later and no preceding movement), all ten wall-gesture-budget tests passed again. `npm run build` passed with the existing large-bundle warning. These are controlled input/domain tests; they do not establish mobile physical input, render performance or a full first-day walkthrough.
