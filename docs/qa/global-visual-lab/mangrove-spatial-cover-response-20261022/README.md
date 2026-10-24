# Mangrove spatial size response QA

Builds on native-range coverage size response0.10..0.96. At cached tile construction, replaces unused Mangrove meso/moisture pigment input with deterministic0.65*noise(worldXZ*0.19,seed^9581)+0.35*noise(worldXZ*0.71,seed^9517). Vertex growth multiplies0.25+0.75*this value. Mangrove pigment already overrides that channel, so color logic unchanged. No new texture samples, instances or draw calls; adds tile-generation CPU noise and vertex arithmetic, costs not yet benchmarked.

Twelve day/night matched poses preserve camera/time/calls/triangles, no recorded errors. Normal day inspected: lower contrast leaf islands and better substrate continuity, but smaller leaves reveal regular module spacing. Retain as QA candidate, not a completed fix; do not promote until placement regularity, close views and motion are checked. Prior wide-jitter-only variant enlarged holes, so do not blindly reuse it or increase density. Original native recipe, water, moss, engine masks and exclusions unchanged.

Reproduce: node tools/experiments/capture-mangrove-spatial-cover-response-20261022.mjs with Vite5190. Compare reviewed-profile-20261022 and mangrove-native-cover-response-20261022. These are artistic variants, not equivalent-image performance optimizations.
