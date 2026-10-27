# Selective far depth preparation: advance to validation

Four interleaved real-game attributed runs passed the comparator's treatment/source/runtime/fixture/hardware and active-stream checks. Two candidate runs have no GL calls>=10ms, unlike both references.24 existing compiler warnings per run remain; not a clean-console claim.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Main CPU max ms |234.095|48.540|320.845|42.210|
| Main CPU P99 ms |135.540|23.285|112.260|21.940|
| Callback cadence P99 ms |133.355|116.580|166.350|132.975|
| Settled wall seconds |15.153|12.970|14.614|11.483|
| Max LoAF blocking ms |191.340|21.615|272.245|7.055|

Both pairs improve total settled time (14.4%,21.4%) and callback P99. All runs preserve15new chunks and240/240 simulation-advancing movement frames,zero failed/pending final stream jobs. Unlike previous complete-preparation candidate, removing wholly excluded root preparation shows no throughput regression in these pairs.

Decision: retain candidate for broader validation, NOT merge yet. These are two repeats of one historical Volcanes scene with attribution overhead and variable-duration240-frame travel. No claim of all-game fluency. Validate screenshots, context loss/restoration, cancellation, resource ownership and other biomes. No density, shading, simulation or depth-silhouette reduction is intended; verify rather than assume visual equivalence. Prior negative experiments remain archived.
