# Preserve failed routes when the cache reaches capacity

On main `58a5f819`, one new failed query after 50,000 stored failures cleared
the entire set. Production now evicts only the oldest entry using the existing
persistent FIFO cursor. The set retains its 50,000-entry limit; geometry and
preview invalidations still clear it normally. Exact query keys, search limits,
successful routes, worker/animal permissions and FIFO task selection are unchanged.
Entry limits do not measure heap bytes or prove a RAM improvement.

Two capacity regressions exercise `Navigation.path` with a controlled search
returning failure. Inserting query 50,001 retains recent failures, retries the
evicted oldest one and stays bounded. A real `setState` invalidation permits a
previously failed route to succeed; refilling after clear confirms that the
cursor handles the new set contents. These tests fail under the previous
full-clear policy: running both against the generated previous-policy module
returns the expected exit 1 / two failed tests, including 50,000 expected
entries versus one actual entry after overflow. That intentional baseline failure
is archived separately in `previous-policy-tests.txt.gz`; production tests pass.
These are cache-control evidence, not native A* timings.

31 directed and 52 additional tests pass (83 total). They include epoch/crop
invalidation, exact-query reuse, watering height/approach, reservation ordering,
segments/bounds/neighbors, prepared raid routes and dynamic actor retreat.
Build passes in 14.92 s with the existing large-bundle warning. Web package:
641 files / 377,431,787 bytes, 859 relative links, 20 runtime GLBs and no original
GLB/demo-village/superseded-ground duplicates. [Logs and source bindings](proof.json).
No new full-suite claim follows from these targeted checks.

## Native compatibility check

`node tools/check_failure_cache_canyon.mjs` continues the historical Gran Cañón /
Mapungubwe day-11 hiring checkpoint under current terrain/navigation. Ordinary
paid hiring selects 13 older women (569 → 179), with 148 living crops. The reference
module reverses only the capacity policy to full clear, importing the same current
helpers. Complete serialized state matches after each of 100 ticks of 0.1 s.
Trajectory hash `6a6dd795145445c26ccea0d9f02508a9a53eeccd37f51c879fd6d1195259f49a`.
Both execute 26 path requests and 13 searches; neither stores a failed query.
[Native report](native-canyon.json).

This native continuation **does not exercise overflow**, establish a speedup,
replay the current intensive campaign or prove that its large blocked queue was
caused by the full-clear policy. Capacity behavior is proven separately by the
controlled regressions. The frozen long-run process stays unmodified and active.
Next attribution needs a failing large-farm checkpoint and counts separating
watering-height/stand-point rejection from path-search failures and capacity churn.
It must preserve physical watering/harvesting and task ordering rather than
making unreachable plants grow or teleporting workers.
