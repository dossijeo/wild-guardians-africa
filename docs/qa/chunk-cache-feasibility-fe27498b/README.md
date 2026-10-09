# Separate procedural chunk cache: feasibility experiment

Base runtime: `fe27498b1242f816eb87fba99655dcd80a25ef70`. Experimental tools were uncommitted during measurement; their exact hashes are in `receipt.json`. No production cache, save-format change or camera movement is enabled.

## Method

Six native biomes, Mapungubwe only, seed 712, standard medium region of 25 chunks around the native camera eye. Three ABBA rounds per biome (six samples per arm). A builds native chunks and transfers owned buffers with structuredClone. B reads warm local files, inflates gzip, decodes the experimental binary format and performs the same structured transfer. Every batch is compared against all original arrays and descriptors outside the timing; the serialized logical world must remain unchanged.

Initial world readiness currently requires a minimum of nine chunks, not necessarily these 25. These are isolated batch CPU timings, not complete world-loading timings. Real worker scheduling can overlap asset preparation. No measured saving may be added directly to the loading-screen benchmark.

## Measurements

| Biome | Raw MB | Gzip MB | Encode/compress/write ms | Generate + transfer ms | Warm restore + transfer ms | Batch saving ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sabana | 13.85 | 2.65 | 701.8 | 1037.9 | 190.7 | 847.2 |
| gran-rio | 13.24 | 2.42 | 447.4 | 1065.8 | 158.7 | 907.2 |
| manglares | 14.53 | 2.08 | 496.1 | 959.1 | 162.6 | 796.4 |
| volcanes | 13.59 | 2.54 | 442.3 | 964.1 | 152.3 | 811.7 |
| gran-canon | 12.77 | 3.41 | 433.9 | 466.5 | 117.0 | 349.5 |
| desierto | 12.68 | 2.21 | 397.3 | 784.8 | 121.3 | 663.4 |

MB uses decimal bytes. Means are from the six samples per arm. Persistence is a single aggregate measurement for 25 chunks, not an ABBA mean or a save-time measurement.

## Integrity and limitations

All six sampled native regions passed exact chunk parity and unchanged logical state. The codec owns three separate buffers, preserving worker-transfer ownership; tests cover Node Buffer input, repeat decode, detach behavior, corruption, truncation and generation-key invalidation. The initial failed experiment is retained: Buffer.slice shared backing storage and caused duplicate transferable buffers; the corrected decoder copies each section into its own allocation.

The fingerprint includes configuration, profile and all world/rendering source hashes. This is deliberately conservative, not a finalized production invalidation scheme. JSON descriptors have only been proved compatible with these sampled native regions; arbitrary non-finite values or signed-zero metadata are outside this evidence. The checksum detects accidental corruption, not malicious data.

Not measured: cold storage, browser IndexedDB, quota/eviction, real worker IPC, GPU uploads, shader compilation, GLB loading, total initialization time or peak memory. Memory entries are post-batch process samples. Gzip uses Node default level 6; browser compression performance is unmeasured. The 150 generated payloads remain ignored local artifacts; hashes and paths are retained in the report, and the generator reproduces their content.

## Decision

The separate cache is a plausible optimization: approximately 2.08-3.41 MB per standard 25-chunk region and 0.35-0.91 seconds less isolated CPU batch work here. This does not yet justify a production rollout or a whole-loading performance claim. A future candidate must measure real Continue Game critical-path time, bounded storage and asynchronous read/write costs; fall back to native generation for stale, missing or corrupt entries. Keep current vegetation suppressions and navigation applied from logical state at installation. Do not embed these render buffers into the authoritative save or restore obsolete gameplay state.

## Reproduce

```powershell
node --test tests/chunk-cache-codec.test.js
node tools/benchmark_chunk_cache.mjs .cache/chunk-cache-reproduction
```

Archived gzip files retain the original report and raw logs. `receipt.json` hashes their uncompressed contents and the experimental source. This report is feasibility evidence only; no browser visual acceptance is claimed.
