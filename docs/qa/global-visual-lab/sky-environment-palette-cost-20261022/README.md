# Environment palette frame cost

Run measure-sky-environment-palette-cost-20261022.mjs with WG_REVIEW_BIOMES=gran-rio and Vite5190, then audit-sky-environment-palette-cost-20261022.py. Intel UHD ANGLE D3D11,media,1280x720,seed712,river-west. A/B/A/B fresh pages; both share sky/reflection latitude; B only replaces environment pixel values via worker precalculation. Candidate worker metadata required. Each phase:60 warmup+90 GPU frames, then60 warmup+90 separate cadence frames. 720 valid GPU samples,no disjoint/discard/pending events; state unchanged,no GL errors,all frame camera/draw/triangle signatures match. 70 calls,980730 triangles; renderer counts192 geometries/57 textures. Actual GPU byte residency not measured.

|GPU mean ms|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|Day|13.257|13.489|13.253|14.105|
|Night|14.115|14.085|14.363|14.164|

Day p95:13.961,14.561,14.109,15.909ms. Night p95:14.766,14.793,15.863,15.203ms. CPU means3.97-4.20ms; cadence16.62-16.63ms,display-paced. No speedup claim. Day B is slower by .232/.852ms in these pairs,while night B is slightly faster; preserve these results instead of claiming equal performance from equal shader work. No per-frame shader/sample/geometry/resource additions; only texture contents differ. Additional controlled same-page timing would be needed to isolate this discrepancy from host variation. Keep the modest artistic candidate for broader visual review; do not discard solely on this limited cost sample and do not declare its cost zero.

One-time CPU construction and exact latitude-cache pixel equivalence are documented in ../sky-environment-palette-20261022. Native integration and six-biome validation remain pending.
