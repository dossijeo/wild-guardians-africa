# Streaming source versus visual installation

Intel UHD / 720p / medium/day, integrated fixed512, current mud and water preparation reductions; same 144 m diagnostic, 30 warmup / 240 recorded. Added synchronous spans around chunkStream.build and receive. No runtime scheduling, simulation or navigation changes.

30 build calls: total 1528.7 ms, mean 50.957, p95 71.1, max 80.7. Subsequent receive total 479.6 ms, mean 15.987, max 34.2; this includes installChunk, which averages 15.95 ms. Terrain construction inside install averages 15.46 ms. These inclusive nested spans must not be summed twice. Build and receive are sequential in the no-worker stream callback, explaining a substantial part of the long inter-frame gaps.

Code inspection: createSpatialChunkStream deliberately uses workerFactory:()=>null because its C++ world supplies resident spatial data and synchronous navigation/surface queries. build selects/adds a chunk then extracts chunkPayload. This measurement does not yet split native generation from payload extraction/copying, and does not justify rewriting simulation or moving authoritative state. The existing asynchronous paths must be audited before any architectural change.

Critical conclusion: renderer-only scheduling cannot remove a ~51 ms synchronous source task. Previous attribution to terrain preparation was incomplete. Fixed512 bake (~0.35 ms CPU/~0.96 ms GPU separately measured) and fern registration (~0.28 ms here) are not the dominant measured stalls. Keep visual quality and fixed512; do not keep simplifying them to chase these CPU spikes.

Next: inspect source-generation and payload-extraction costs and existing async/worker support. Restrict any changes to equivalent data delivery/render preparation; preserve simulation, navigation and authoritative terrain behavior. Main untouched and cache remains opt-in while validation is incomplete.

Reproduce with WG_PREP_DETAIL=1, WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=preparation, WG_SAMPLES=240, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>; run measure-mangrove-ground-hybrid-20261023.mjs.
