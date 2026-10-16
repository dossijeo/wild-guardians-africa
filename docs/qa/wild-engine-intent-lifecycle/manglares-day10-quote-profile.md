# Manglares day-ten wall quote: current-source CPU profile

The sustained Manglares/712 campaign on `a3392cd4` reported two physical
`quoteWallChain` calls taking 147.53 s on day ten. A second run requested
ten nights with the same seed, policy and WASM, but started Node with
`--cpu-prof`. Its ten daily serialized-state hashes matched the first ten
hashes of the unprofiled 14-night report. The profiler raised the measured
day-ten quote time to 219.83 s, so the two wall-clock values are not an A/B
speed comparison; the call stacks identify where the CPU work occurred.

The profile contains 395,167 sampled stacks. The `quoteWallChain` subtree
contains 223,295 samples, of which 223,241 belong to `planNewWallGates`.
Three `restoreRemovedProps` branches under that gate planner contain
**214,945 samples (96.3% of the quote subtree)**. The main branches are
candidate-door hosting (120,085 samples), preserving worker access
(86,135) and the initial enclosure preview (8,725). Each branch spends
virtually all its samples in the JS-to-WASM call. This identifies the
restoration operation rather than wall-stroke generation or ordinary
`wallPlacement` as the dominant cost in this frozen case.

The current source explains the amplification:

1. `planNewWallGates` asks `withWallPreview` to test candidate doors and
   preserve worker routes.
2. Each preview can change the set of suppressed natural props and then
   restore the preceding set.
3. `spatial_restore_removed_props` accepts the complete set and calls
   `refreshRemovedPropChunks(nullptr)`.
4. With a null changed prop, that function visits **every loaded chunk for
   every navigation profile**, regenerates the prop occupancy and commits
   its sectors. Repeating this for door candidates scales with resident
   world size, even when only a few prop records differ.

This is a source-and-profile diagnosis, not a validated optimization. A
candidate fix is to compare the old and replacement prop-key sets in C++,
identify the spatial footprint of keys in their symmetric difference, and
refresh only the loaded chunks intersecting those footprints. It must still
restore visual props, navigation rasters, sector borders and the selected
chunk correctly. A conservative global fallback remains appropriate when
the affected footprint cannot be bounded safely. Before adoption, compare
current and candidate WASM on the frozen quote, every navigation profile,
cross-chunk props, automatic doors, repeated speculative previews and
actual paid construction; demand identical plans, routes, connectivity and
state hashes. Then compare the full day and sustained campaigns, not just
the isolated C++ call. PR #54 remains unmerged with the intent planner.

The complete ten-night report is `manglares10-quote-profile.json.gz`
(uncompressed SHA-256
`eaeed6de271baf7344d0eedcfc89a57a8a9f9a5dc9750605cdc98f1bb67c39fb`).
The raw V8 profile is `CPU.20261016.164342.28516.0.001.cpuprofile.gz`
(uncompressed SHA-256
`1fbb317a704f71e80348804e93dc271066858a41f7fc74db89530feea2edc791`).
The command used the same environment variables and runner arguments as
[`manglares14-event-defense.md`](manglares14-event-defense.md), replacing
`node` with `node --cpu-prof --cpu-prof-dir=docs/qa/wild-engine-intent-lifecycle`
and requesting ten nights.
