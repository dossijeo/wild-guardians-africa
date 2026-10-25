# Populated Volcanoes profile benchmark: provisional

Run WG_FIXTURE_BIOME=volcanes node tools/experiments/measure-biome-populated-resident-20261022.mjs then python tools/experiments/audit-biome-populated-resident-20261022.py volcanes. Intel UHD/ANGLE D3D11,1280x720,seed712,same native populated fixture. All25 ground masks initialized before timing. Media/baja/media/baja,day/night,60warmup+90samples per GPU/cadence pass;720GPU samples recorded.

Strict audit fails repeated-medium resource equality:335 versus334 geometries,110textures both. Low308geometries/108textures repeats exactly. Draw workload repeats exactly within each profile: medium day103calls/603243triangles,night98/622861;low day99/506659,night95/530976. Difference is one resident geometry, not fewer drawn triangles; cause not isolated. Do not claim completed controlled-resource benchmark or final profile recommendation from these timings. Raw results retained; audit intentionally remains red.

Paused simulation, fixed camera/material clock,resident scene with syncChunks suspended. Excludes gameplay/world updates/streaming. Quality profiles differ visually. Preserve selected art while investigating allocation history; do not reduce quality to force a passing result. Matching medium/low visual pairs are recorded separately in volcanes-populated-low-20261022.
