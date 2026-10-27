# Seam material reuse: advance to broader validation

Same sources and repeated route harness hashes, Intel UHD, historical active Manglares medium->low->medium->low, 240 advancing travel frames and 15 chunks each, zero final failed/pending work.

|Metric|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|Settled seconds|20.662|11.537|17.191|9.141|
|Travel seconds|15.975|10.818|15.072|8.794|
|Callback P95 ms|116.35|99.81|116.46|66.53|
|Callback P99 ms|149.70|133.04|149.57|83.19|
|CPU max ms|56.56|52.97|62.99|47.58|

Both pairs favor candidate; no slow GL call in any run, so this sequence does not demonstrate elimination of repeated compiler waits. CPU P99 is mixed. Do not equate callback intervals with exclusive GPU work. Active simulation and publication timing vary with wall time.

Proceed to Volcanes and actual lifecycle/image validation. Not yet accepted globally or merged. Reuse remains opt-in; no shaders, density or geometry counts deliberately changed. Owner tests cover replacement, context event and pending-close semantics, but browser lifecycle still required.
