# Reusing resident terrain and props when building an animal profile

Wild Engine retains each loaded chunk's relief, ponds, visible props and
solid props. Before this change, `spatial_build_nav_profile()` called
`populateChunk()` for **every** loaded chunk when a new animal radius was
first used. That regenerated the same relief and scattered the same props
before making the profile-specific raster and sectors. The new
`selectResidentChunkForProfile()` loads the existing resident data for that
step; it falls back to `populateChunk()` if any record is absent. The
profile-specific raster, collision tests and sector graph are still built
normally. Confirmed terrain/prop changes and chunk eviction retain their
existing cache invalidation paths.

## Reproduction and measurements

Baseline: source commit `1f3e86c8` with `spatial-savanna.cpp` restored to
its parent version. Both WASM builds used `tools/build-spatial-savanna-wasm.sh`
and Emscripten 6.0.12 on the same host. The rebuilt baseline SHA-256 is
`7f1bf54171f6a347165498c594807bc5789ea395be49941d64555a03862d4f32`;
the candidate SHA-256 is
`90e0515258273000ab0f5db2d0f0e7cda01ddc666b649799c4113ad76014c27b`.
WASM sizes are 530,785 and 531,234 bytes respectively. The previously
checked-in binary was built by a different toolchain and is deliberately
excluded from the performance comparison.

The frozen [Desierto/123 night-16 entry state](../desert-raid-pressure-audit/desierto123-day16-pre-entry.json.gz)
was probed in A/B/B/A/A/B/B/A order, each in a fresh Node process. Median
first selection fell from **861 to 822 ms** (about 4.5%). All eight runs
selected wall #283 and repeated the same entry on the second query. The
warm selection had no consistent improvement. The baseline first-selection
samples were 872.9, 852.2, 849.4 and 869.2 ms; the candidate samples were
861.5, 817.8, 813.2 and 826.6 ms. This is a cold preparation improvement,
not an A* or movement change. Use `WILD_PROBE_WASM` with
`tools/experiments/probe-frozen-raid-entry-boundary.mjs` to select either
build without swapping the production file.

Matched real campaigns, `WILD_ENGINE_DEFENSE_POLICY=topological`,
`WILD_ENGINE_SPATIAL_ADVICE=1`, strategy `good`, mode `intent-wall`:

| Biome / seed | Nights | Baseline | Candidate | Daily state hashes |
| --- | ---: | ---: | ---: | --- |
| Desierto / 123 | 17 | 47.29 s | 44.87 s | All 17 identical |
| Sabana / 712 | 14 | 69.82 s | 69.70 s | All 14 identical |
| Manglares / 712 | 14 | 84.24 s | 84.33 s | All 14 identical |

A second Desierto baseline run took 45.38 s, so the 2.42 s difference in
the first pair is not a proven campaign-wide speedup. The evidence supports
a repeatable improvement in cold profile preparation with neutral sustained
results in the other two biomes. Economics, crops, RNG-derived decisions and
physical outcomes matched at every recorded nightly boundary.

The differential tool
`tools/experiments/verify-resident-profile-reuse.mjs BASELINE.wasm CANDIDATE.wasm`
compared all six biomes with six movement profiles and two resident chunks.
It removed a prop before building later profiles, then added a settlement,
and compared visual chunk payloads, walkability, sample routes and the saved
spatial state. All six matched. A further 73 directed tests covering terrain,
profile switches, chunk replacement, doors, connectivity and saved worker
access passed.

An earlier variant reused only the height lattice during every call to
`populateChunk()`. It reduced the same-compiler cold checkpoint slightly,
but one Sabana and one Manglares campaign were slower. It was discarded;
the retained change applies only when a new navigation profile consumes
already resident chunks. These measurements do not establish interactive
frame latency or gains for every world size. The remaining cold cost lies in
building each profile's raster and sector graph; that requires separate
profiling before any further algorithmic change.
