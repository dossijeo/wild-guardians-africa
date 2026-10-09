# Root review of Desert connectivity PR15

Reviewed PR head `3f2655ec88b059df6191a459de812d6489a25871`, targeting main.
This record is source inspection, not an independent replay or GPU benchmark.

The animal refinement keeps the native coarse sweep on every call. A cached
terrain proof therefore cannot bypass newly introduced solid buildings, props
or gate leaves. Fine sampling is limited to the existing near-limit slope band;
the terrain threshold, footprint checks and water/lava restrictions remain in
the native validator. Cache invalidation includes the navigation epoch, field
identity and the terrain functions used by the proof.

The returning-worker fallback uses the native incremental path iterator and
native worker view. It widens the search corridor from 16 to 32 cells for
fleeing, returning or incapacitated workers, with at most eight active searches
and bounded slices. It does not drain a synchronous search or relax collision.
Existing actor motion, paths and geometry epochs invalidate resumable searches.

The paid-defence regression now compares an animal's movement against the
worker positions that existed immediately before that tick. This follows the
actual animal-before-worker update order. Reciprocal worker movement is still
checked against current animals, and the test requires crossings of old vacated
locations so that the former false-positive scenario remains exercised.

The head's Validate Game check passed in run `37884643790`. Windows build,
executable/installer checks and packaged WebView2 smoke passed in run
`37884643794`; native minimization/restoration was still running when inspected.
Merge approval and root post-merge regressions remain pending that final check.

Original failure records and agent replay evidence remain in the PR. Three
bounded saved-incursion recoveries do not establish responsible hundred-night
campaign acceptance or stable rendering during movement.
