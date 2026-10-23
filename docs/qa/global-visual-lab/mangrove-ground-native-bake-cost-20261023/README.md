# Fixed512 bake pass attribution

Same integrated fixed512 continuous path, Intel UHD, 720p, medium/day, diagnostic bake mode. GPU queries enclose only material-cache update, independently of whole-frame queries. CPU includes update admission, render target creation, submission and publication hooks. It excludes subsequent main-scene material compilation/draws, uploads outside update and first-load compiler warmup.

Within 240 recorded frames, 30 generate a target: CPU mean 0.347 ms, p95 0.5, maximum 0.6; GPU mean 0.964 ms, p95 1.345, maximum 1.427. The other 210 have idle update CPU mean 0.011 ms; empty GPU queries are not meaningful workload measurements. Valid timers, no disjoint/discarded/foreign/pending/context errors.

The first diagnostic implementation also recorded 30 query-drain frames tagged frame 240 after the measurement window. Raw data is preserved; bake-summary.json explicitly filters frame < 240, retaining all 30 actual generation frames. The instrument is now bounded to the measurement window. No production renderer changes were made by instrumentation.

The bake pass alone cannot explain the observed 90–130 ms streaming intervals. The original-material control also has large spikes. Next attribution should inspect chunk arrival/preparation, shader compilation and resource transfers; this evidence does not exonerate all downstream costs of enabling a newly cached material. Selected fixed512 architecture and approved green ground appearance remain unchanged.

Reproduce: WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=bake, WG_SAMPLES=240, WG_WARMUP=30 and WG_REVIEW_OUT=<new directory>, using measure-mangrove-ground-hybrid-20261023.mjs. Diagnostic CPU/GPU timings must not be substituted for whole-frame performance.
