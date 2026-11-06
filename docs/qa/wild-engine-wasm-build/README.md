# Standalone Wild Engine WASM build

The build script passes `--no-entry` to Emscripten rather than passing
`--no-entry` only to the linker. The Emscripten driver then produces a
standalone reactor exporting `_initialize`, which `createSpatialWorld`
calls before using the engine. The worker's standalone bootstrap also calls
this export. It initializes the C++ global containers.

With the previous `-Wl,--no-entry` and the local Windows Emscripten 3.1.64
toolchain, the output had no `_initialize`. Inserting dynamic bodies reached a
hash-table rehash with uninitialized container state and failed with
`RuntimeError: unreachable`. This is a build/runtime initialization defect,
not evidence that the swept-disc algorithm itself was incorrect.

The regression test `tests/spatial-dynamic-bodies.test.js` explicitly checks
for `_initialize` and exercises more than 64 bodies, including the spatial
index transition. Set `WILD_ENGINE_SPATIAL_SERVICES_WASM` to a freshly built
standalone candidate to run it. Set `WILD_ENGINE_BASE_WASM` to another build
with the dynamic-body ABI to also run the existing detour differential test.
`tests/spatial-wasm-build-compatibility.test.js` compares terrain payloads
and wall connectivity and routes in three biomes against the versioned WASM.

Local results for a candidate built from current source with the revised
entry flag: 13 dynamic-body tests passed with the previous dynamic-services
candidate as the differential baseline; the three-biome terrain and route
comparison against the versioned WASM also passed. A deterministic Worker
authority comparison matched snapshots and ordered events for 30 advance
commands through a real single-animal raid. These are bounded tests, not full
campaign or save compatibility validation.

Do not replace the versioned WASM based on these tests alone. The local
candidate adds the dynamic-body exports and `_initialize`, but lacks the
versioned module's `setThrew` export. The repository has no direct reference
to that export, but its external ABI compatibility has not been established.
Toolchain parity, repeatable build output, complete ABI compatibility and
deterministic campaign/save comparisons remain to be resolved. No performance
benefit or production migration is claimed by this build correction.
