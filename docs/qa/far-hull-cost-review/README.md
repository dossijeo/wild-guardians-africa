# Conservative billboard hull experiment — pending native acceptance

The offline `prepare-impostor-hulls.mjs` tool reads the 44 original day/night atlases and records their SHA-256 hashes. It unions nonzero alpha across all 64 cells and both phases, expands coverage by 16 source pixels for filtering/minification, and creates a convex UV hull. No atlas is rebaked and texture memory does not increase. Hull metadata remains optional; the public manifest is unchanged. Source UVs, bases, IDs, transforms, shaders, lighting and density are unchanged. Buffers are allocated once at the maximum polygon vertex count; QA switches between quad and hull in place with the same attribute/index handles and an explicit draw range.

Estimated removal of rectangular area is only 1–10% with this padding. Hulls generally have 7–14 vertices and 5–12 triangles, versus 4 vertices and 2 triangles for a quad. Extra vertex/primitive work could cost more than the fragment work saved. Seven CPU tests pass, including alpha coverage and hashes of all 44 source phases, ownership and readiness-buffer invariants.

## Initial native counterexample

`readback-initial-day.json` was recorded on branch source `b1c3ddf`: Sabana/media, native mapped far ground, near transition 90–120 m, fog 30–300 m, sky fog palette and soft backdrop. The density path was paused at 13.2 seconds, at camera `[-43.49710893312456,17.708301721455364,191.85039633264967]`.

The synchronous visible RGBA8 framebuffer was read in quad → hull → hull → quad order, after six zero-delta renders per stage. The simulation state remained unchanged and GL reported no error. All stages used 77 draws. Submitted triangles increased from 1,294,332 to 1,303,841 with the hull.

Quad/hull differed at 1,211 pixels (1,314 channels), with maximum channel delta 143. The quad repeat also differed at 14 pixels (maximum 29); the hull repeat differed at one pixel (maximum 2). This result does **not** establish equivalent coverage, nor identify the cause of the differences. There has been no GPU timing trial of the hull candidate. It remains unaccepted and disabled by default.

QA source `88bbfdc` adds preparation/visibility hashes, camera/light state and pixel examples to distinguish changing state from geometry/sampling differences. Day/night, mip, movement, restoration and performance acceptance remain pending.

## Repetition and isolated cost trial

Source `7b9b828` includes origin/main `e14695a`, including the view-independent shadow cache. Same paused camera and options as above. Camera view/projection, light matrices, origin, day/night, preparation buffer hashes, native visibility hashes and draw counts matched between four readback stages. The visible framebuffer has four samples and antialiasing remains enabled. Quad/hull differed at 1,233 pixels: 44 deltas >2, 19 >8, 11 >32, maximum 143. Quad/quad control differed at 11 pixels (maximum 29); hull/hull at 37 pixels (maximum 58). These controls prevent attributing every color difference to the geometry change. No geometry coverage or visual acceptance is asserted. Full state/readback in `readback-expanded-7b9b828.json.gz`.

An isolated quad/hull/hull/quad diagnostic followed in the same pose, all species/atlases/materials and far ground retained. All 480 GPU queries returned, no disjoint/hidden/GL/render errors, simulation unchanged. GPU p50: 38.903437 / 37.362343 / 36.742187 / 39.359427 ms; p95: 58.443489 / 57.911978 / 56.708957 / 57.276041 ms. A endpoints drift 1.2%; B stages are locally ~4–7% lower than A endpoints. Draws are 78 in every stage; triangles rise 1,293,842 → 1,303,351 (+9,509). This is a local GPU result, not a global FPS claim or visual acceptance. CPU p95 is 276–340 ms; three parent campaign processes remained background work. Parent had no active 3D scene, benchmark or build during this window. Native framebuffer/readback and GPU trial remain separately attributed; no exact-pixel equivalence has been established. Full trial in `cost-7b9b828.json.gz`. Hull is still optional and disabled in the public manifest; night, motion, mips and restored context remain unaccepted.
