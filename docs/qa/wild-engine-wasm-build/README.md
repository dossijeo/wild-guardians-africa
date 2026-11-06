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

The build now explicitly retains `setThrew`, using Emscripten's own runtime
implementation rather than a stub. It is part of Emscripten's exception and
setjmp support; no direct use was found in this repository. A local 3.1.64
candidate includes every versioned export with the same WebAssembly kind and
JavaScript-observable function arity, as well as the new dynamic-body exports
and `_initialize`. The compatibility test checks these properties, but does
not establish full Wasm function signatures or external consumer compatibility.

The corrected script run in Git Bash with local Emscripten 3.1.64 produced
the same SHA-256 (`079e6a4057e61ff54636d0b5ab8b43ed1e6ef2f67867442f3f94bebd9b60f821`)
as a separate invocation of the same compiler and flags. This does not
establish reproducibility across toolchains or hosts. A further differential
test saves during a real single-animal raid,
restores the native checkpoint in both modules, and compares 40 subsequent
advances with each other and with an uninterrupted baseline. No physics
checkpoint, full campaign or broad save compatibility is established by that
case.

The existing scripted native campaign audit was run separately against the
versioned module and the candidate with `QA_DAYS=3`, `QA_BIOME=manglares`
and `tools/trees/audit_profile_campaign.mjs`. Both completed three nights;
daily serialized-state, cumulative decision and selected per-tick hashes,
and the final state hash matched for all 1,212 steps. This is the connected
island recipe and the same legal player policy in each run. It does not
exercise Rapier, graphics, full internal native state, other biomes, or a
100-night campaign. The runs overlapped, so their timings are not used as a
performance comparison. To reproduce, set `WILD_ENGINE_SPATIAL_SERVICES_WASM`
to each module in turn and use a separate fresh `QA_OUTPUT` for each.

Do not replace the versioned WASM based on these bounded tests alone. Complete
ABI, deterministic campaign and save comparisons and full toolchain parity
remain to be resolved. No performance benefit or production migration is
claimed by this build correction.
