# Current combined profile — initial Sabana camera

Source cff48c53, media/Mapungubwe, 1280×720 viewport and1600×900 world buffer. Native shaders and shadows retained; all candidate layers enabled. Small-tree90–120m and large-tree200–240m profile with reduced near color radius1 and exact resident terrain. A disables far representation and restores native color residency; atlas/bank resources remain allocated in this comparison, so A is not never-enabled memory.

ABBA120 samples each: GPU medians21.387187 /19.950468 /20.033384 /21.304192ms. Draws59/52/52/59; triangles960014/729892/729892/960014. All480 timer samples valid, no disjoint/discard/foreign query/context loss. Simulation unchanged, errors empty, GL0. A1/A2 and B1/B2 draw contexts (camera,target,chunks,bounds,lightVP,shadow state) match exactly. Submitted resources/hashes are retained in raw data; context agreement does not prove framebuffer equality.

This initial pose shows a local GPU reduction around6%. It does not overturn earlier negative220m poses, establish universal FPS improvement or isolate each layer's cost. CPU/frame distributions remain noisy with two parent long-running campaigns (49032/39340) in the background; parent tests/builds/benchmarks and GPU scenes were stopped during measurement. Active renderer counters after measurement165 geometries/55 textures are not driver RAM.

The user accepted proportionate sprite overhead; this comparison documents the combined shorter-near profile rather than hiding the older negative results. Visual dither, matte distant water and simple backdrop silhouette remain iteration items recorded in six-biome route receipts.
