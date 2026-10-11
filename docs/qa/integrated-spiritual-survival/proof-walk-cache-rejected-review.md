# Rejected extra walkability cache

A bounded exact-coordinate memo was installed only on the isolated proof's navigator `testWalkable` method. Inherited placement views have distinct WeakMap contexts. Epoch, terrain-field, obstacle-array and suppression-set replacement invalidate results. Cached worker-slope peaks are replayed along with valid/invalid answers. The adapter restores ownership and never changes the production prototype. Geometry must remain immutable within an epoch, matching the native query contract.

The complete retained 123-crop Canyon proof produces exactly the previous reused-component certificate hash. However, both observed runs make 24,820 memo requests and record **zero hits**, 24,820 entries, no evictions and one view context. Lattice query count remains 59,710,638, identical to the preceding candidate. The native integer/fractional caches have already removed these duplicates before `testWalkable` is called. Therefore this additional storage does not avoid native geometry work on this workload.

Observed durations are 6,086.84 and 5,916.03 ms. These are not controlled AB/BA comparisons. A difference from the earlier 7,042.72 ms observation cannot be credited to a cache with no hits. The candidate is rejected for promotion; it consumes extra JS map/string/object memory without measured avoided work. Total RAM was not measured and no production or campaign changes are made.

The first benchmark inherited a template scope string saying only the integer cache differed. Its actual report also contains `walkMemoStats`. The exact initial benchmark source is archived in `proof-walk-cache-initial-v1-source.txt`; the final report corrects the scope to include both adapters. Both raw observations remain intact.

Two functional tests pass for cached true/false values, worker slope peaks, placement-view isolation, native epoch invalidation, capacity, restoration and rejection of custom methods. The first test attempt incorrectly compared serialization across an explicit `Navigation.setState` call, which legitimately advances the persisted navigation epoch. The corrected test verifies no state mutation before that call and compares against the post-epoch state afterward. This fixture assertion failure is not a campaign failure or a defect attributed to the cache.

Further optimization should address the actual unique fractional segment/terrain work and bounded proof execution, rather than enlarging another zero-hit cache. The v105 native campaign remains frozen and live independently.
