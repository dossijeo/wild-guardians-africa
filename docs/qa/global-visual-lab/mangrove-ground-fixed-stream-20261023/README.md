# Fixed512 streaming and invalidation validation

2026-10-23. Real renderer, Intel UHD, 720p, medium/day. Camera moved 0 → 144 → 0 metres, settling at each stop. All stops have exactly 25 registered/resident cache targets, 35,209,000 bytes (33.58 MiB). The trip unloads and recreates 30 chunks with no rejected requests or browser errors.

One explicit groundmaskchanged notification replaces exactly one target, preserving the previous target until publication. Replacement peak is 36,617,360 bytes (34.92 MiB). Complete owner teardown releases all 25 textures; states, queue and tracked bytes return to zero. Original material hooks are restored.

Crop-soil texture writes now emit groundmaskchanged only when bytes change, and when restoring the borrowed image on release. The cache subscribes per chunk and unsubscribes on removal. The existing crop-soil feature is River-specific, so this establishes the material invalidation contract; it does not claim a Mangrove planting interaction was exercised. Native chunk replacement already reaches the cache via scene remove/add events. No per-frame scan of engine entities was added.

Eleven existing queue/chunk/crop tests pass. Added assertions cover actual mask notification, unchanged bytes, removal and restoration. Runtime probe dispatches a notification without modifying the image: it proves replacement/resource ownership, not changed-image visual correctness. Streaming waits deliberately exclude continuous-motion frame-time claims.

The harness disposes the cache before its final capture and cadence window; those are original-material restoration evidence, NOT fixed512 performance results. The previous selected-cache benchmarks remain the performance evidence. Pending: continuous streaming generation spikes, low/night integration and actual changed-mask image verification. QA opt-in remains; no production-default promotion yet.
