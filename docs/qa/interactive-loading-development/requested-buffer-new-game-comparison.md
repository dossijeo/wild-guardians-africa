# Native requested-buffer ownership: New Game

This is a resource diagnostic, **not a performance benchmark**. The buffer probe calls binding queries, which can perturb scheduling. It observes `bufferData` storage after `WorldScene` construction and replacement/deletion; it excludes earlier allocations, texture storage, shader programs, driver caches, physical VRAM, workers and total process RAM.

## Sources and procedure

Feature source `3a14523b`, `tests/browser/interactive-loading-resource-run.html?biome=sabana&culture=mapungubwe&measurement=1`, port 5290, tab 69. Control production source **frozen `cdb822f5`** in a separate Git archive, port 5292, tab 70. Both Sabana/Mapungubwe, seed 712, quality media, native 1280×720 viewport, same exact final camera arrays. The control executes the archived native world/far/visible readiness recipe without the diorama or cinematic. Resource probes use the same `BufferRequests` helper, installed immediately after renderer construction. Only one GPU context was active at a time; background historical CPU campaigns were not stopped. Their load prevents claims of a fully isolated environment.

The checked-in `tests/browser/interactive-loading-baseline-resource-run.html` reproduces the control against an archived cdb822f5 source/public/node_modules tree; copy it and `buffer-requests.js` into that archive's `tests/browser`. The New Game recipe remains the recorded control. After the recording, the fixture additionally gained an optional `save=dense` path, logical-state assertion and concise status text; that path has not been exercised by tab 70. It is QA only, with no production import.

## Results

| Observed metric | Feature | Control |
| --- | ---: | ---: |
| Peak simultaneously requested buffer storage | 68,562,286 B | 58,729,036 B |
| Final visible world live buffer storage | 62,242,476 B | 58,239,480 B |
| Geometries at final visible world sample | 176 | 161 |
| Texture objects at final visible world sample | 67 | 55 |
| Live tracked buffers after dispose | 0 | 0 |
| Live requested bytes after dispose | 0 | 0 |
| Unattributed buffer requests | 0 | 0 |

Feature peak is **9,833,250 B / 16.74% above this control** (about 9.38 MiB). The diorama-interactive sample accounts for 6,227,918 B of live requested storage. World-load, far-ready and reveal-prepared samples are 54,857,654 / 64,928,926 / 68,472,406 B respectively. Disposing the diorama and restoring the gameplay camera lowers the live sample to 62,242,476 B. Thus the overlap and wider prepared reveal have a measurable cost; this is not evidence of memory neutrality.

The diorama uses the native maize stages/morph bridges with a fixed 18-instance limit and releases its local crop geometry/materials on handoff. Shared source GLB/textures belong to the world asset collection, and their lifetime is longer. The extra texture objects require further attribution; a texture count is not texture bytes and is not physical VRAM. No full-resident forced-visibility warming is added by this feature.

Sampled JavaScript heap reached 307,167,420 B in the feature versus a maximum recorded control sample of 281,347,671 B. These are differently timed snapshots, without controlled garbage collection or worker-heap coverage. They cannot establish peak total RAM or a causal RAM delta. The worker decoder sample in the feature recorded a peak of two active requests and 2,505,500 transferred bytes; this also does not measure decoded bitmap/GPU residency.

Both reports finish without rendering errors, with explicit disposal, context loss and tab closure. Feature verified readiness, exact camera restoration and logical-state preservation. The control's New Game recording verifies readiness/error-free rendering and the same final camera; its newly added logical-state assertion was not present in that recorded run.

## Evidence and open gates

- `resources-new-game-3a14523b.json`: full feature report, including disposal.
- `resources-main-cdb822f5.json`: full archived-control report, including disposal.
- Dense Continue resource coverage, repeated lifecycle ownership, attribution of additional world/reveal storage and texture objects remain open.
- Final matched timing ABBA must run without buffer binding probes. These timings and frame summaries must not be used to approve performance.
- Actual total RAM/VRAM neutrality is **not established**. No PR or production promotion follows this resource diagnostic alone.
