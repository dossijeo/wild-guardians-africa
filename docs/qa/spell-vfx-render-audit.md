# Spell VFX lifetime and sprite upload audit

The headless native campaign does not instantiate Three.js or spell VFX, so a
growing `Game.tick` cost in that runner cannot be caused by leaked render
effects. The browser renderer is a separate performance concern.

`AgricultureVfx` and `ShieldVfx` key effects by active spell/event ID and call
`NativeVfx.dispose()` when an ID leaves the desired set. Disposal removes the
scene object, releases its geometry and materials, and removes the native
effect from `VfxLibrary.instances`. A regression test exercises 48 concurrent
agriculture spells and verifies all three counts return to zero on expiry.

Sprites and rigid particles already use `InstancedBufferGeometry` within each
effect. The sprite packer previously allocated a full 760-instance (76,000
byte) array on every `prepare()`, copied it into an existing persistent GPU
buffer, and flagged the whole buffer for upload. It now packs directly into
that buffer and marks only the live instance range for upload. This does not
alter particle simulation, sorting, shader uniforms or draw calls.

Run `node tools/experiments/benchmark-vfx-pack.mjs` to compare allocation and
reuse with ABBA order after warmup. On Windows x64, Node 20.11.0, i7-11800H,
base commit `3db39044`, 120 sprites and 3,000 preparations per lot, the two
allocation lots took 224.4 and 216.6 ms; reuse took 104.8 and 100.5 ms.
Checksums matched. Each reuse lot avoids 228 MB of transient typed-array
allocation. These are packer timings, **not** measured full-frame or GPU gains.

Cross-effect batching remains a separate rendering change. Each effect has
its own transform, age, lighting and depth-sorted transparent sprites; joining
them into one draw call would require per-instance effect data and a visual
comparison in WebGL. That change is not justified by a headless `Game.tick`
profile. Measure browser draw submissions and GPU/frame time with many
simultaneous spells before changing the effect shader contract.

The reproducible WebGL submission fixture is
`tests/browser/spell-vfx-load.html`. In Chrome headless with SwiftShader,
ABBA lots of 0/48/48/0 simultaneous agriculture spells yielded 0/144/144/0
draw calls, 0/144/144/0 renderer geometries and no WebGL errors. This confirms
three submissions per effect and complete geometry cleanup. The fixture uses a
white atlas texel for submission accounting; it is **not** a pixel comparison.
Chrome's virtual-time run returned zero-valued CPU timings, so those timings
are deliberately excluded from the conclusion. Cross-effect batching has a
measurable draw-call opportunity, but still needs a real-clock GPU/frame
comparison and shader/visual validation before adoption.
