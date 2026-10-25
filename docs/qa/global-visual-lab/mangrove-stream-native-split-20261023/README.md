# Native generation versus render payload extraction

Intel UHD, 720p, medium/day, integrated fixed512; identical 144 m streaming diagnostic, 30 warmup / 240 recorded. QA wrappers instrument exposed session.core methods without altering their implementations.

30 new chunks: core.addChunk mean 47.533 ms, p95 59.5, max 63.3, total 1426 ms. core.chunkPayload mean 0.363 ms, max 0.6, total 10.9 ms. selectChunk is below timer resolution (reported 0, not proven cost-free). Complete stream.build mean 47.917 ms; subsequent receive/install mean 15.123 ms.

Thus native synchronous generation, not copying the completed payload, dominates the measured source task. The no-cache control already exhibited long streaming stalls. Moving only payload copies or adding a renderer publication queue cannot remove this synchronous addChunk task. No claim is made that every observed frame spike is explained, nor that renderer preparation is free.

Scope decision: do not rewrite Wild Engine or duplicate its authoritative world as part of the Mangrove material-cache task. Existing createSpatialChunkStream uses the authoritative instance for synchronous terrain/navigation queries; a worker migration requires separate architectural validation of state ownership and consistency. Preserve this limitation in the final cache recommendation. Continue validating selected fixed512 rendering and resource lifecycle rather than chasing these native stalls through more material simplification.

No production changes, no messages to the core conversation, no simulation/navigation modifications. Green ground, vegetation, dynamic illumination and fixed512 resolution remain unchanged. Reproduce with WG_PREP_DETAIL=1, WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=preparation, WG_SAMPLES=240, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>, measure-mangrove-ground-hybrid-20261023.mjs.
