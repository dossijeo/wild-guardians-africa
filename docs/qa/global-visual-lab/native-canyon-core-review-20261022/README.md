# Native Canyon opaque water core

Enable `visualLab=global-lighting&waterEdges=natural&waterCore=opaque`. Canyon only. The opaque interior writes depth before terrain; the transparent rim keeps the exact existing opacity transition. Both use the same geometry and shore texture. No new render target or dithering. Geometry borrowing is explicit so scene/chunk/horizon disposal releases it only through the original water mesh. Material uniforms remain shared and live; the shore remains the texture owner.

Twelve real captures, seed 712, medium 1280x720, three settled poses day/night. All six shore/core pairs are RGB exact. Additional draw calls/triangles are expected because the same water geometry is submitted for both complementary regions; see captures.json for counters. This proves static image parity, not speedup. Native ABAB cost and streaming validation remain pending. Previous QA benefit does not substitute for these measurements.

Two unit tests pass for Canyon-only opt-in and shared geometry/uniform ownership plus duplicate-attachment prevention. Defaults and other biomes unchanged. Reproduce `node --test tests/water-opaque-core.test.js`; Vite 5190, `node tools/experiments/capture-native-canyon-core-20261022.mjs`, then `python tools/experiments/audit-native-canyon-core-20261022.py`.
