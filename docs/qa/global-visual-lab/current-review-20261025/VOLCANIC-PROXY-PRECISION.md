# Volcanic far terrain precision: diagnostic result

2026-10-25. The diagnostic no longer invokes initial loading depth warmup after moving an already loaded world. It waits for ordinary regional streaming to settle instead. This avoids the previously observed selected-program-disposed cancellation in these two runs; it does not prove that the lifecycle issue is fixed in production. The earlier failure is retained.

Matched seed 712, 720p, low quality, paused world, identical camera/target, near bounds, render origin and installed chunk keys. Both have zero console errors, final GL error zero and settled chunk queues. groundStep is changed only through a QA response route in the diagnostic; the normal game still uses 32. Both screenshots were inspected.

| Ground step | Maximum bridge height gap | Ground + bridge triangles | Attribute/index bytes |
|---|---:|---:|---:|
| 32 | 1.721434 | 6058 | 270264 |
| 16 | 1.179688 | 10360 | 426000 |

Step 16 reduces the conspicuous central vertical strip in the inspected daytime view, while retaining a nonzero height discrepancy elsewhere. Additional buffers: 155736 bytes, approximately 152 KiB. This is array payload, not a measurement of driver allocation or total VRAM. No extra draw call is required by the geometry density change, but GPU cost and generation latency have not been benchmarked.

Recommendation: retain step 16 as a candidate, not the default. Validate moving cameras, night and other boundary locations, and measure end-to-end CPU/GPU cost before adoption. Do not remove the edge bridge: the previous isolation test proved that doing so opens a sky gap. The approved lava/materials and all authoritative world geometry remain unchanged.

Artifacts: volcanes-ground-step-comparison.jpg/json; volcanes-seam-step32-streamed/ and volcanes-seam-step16-streamed/ contain full A/B/A bridge-isolation captures and exact geometry measurements. Reproduce with diagnose-volcanic-ground-seam.mjs and WG_DIAGNOSTIC_GROUND_STEP=32 or 16, using the environment documented in volcanes-seam-isolation/README.md. This is not an A/B/A/B performance benchmark.
