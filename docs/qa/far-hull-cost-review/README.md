# Conservative billboard hull experiment — pending native acceptance

The offline `prepare-impostor-hulls.mjs` tool reads the 44 original day/night atlases and records their SHA-256 hashes. It unions nonzero alpha across all 64 cells and both phases, expands coverage by 16 source pixels for filtering/minification, and creates a convex UV hull. No atlas is rebaked and texture memory does not increase. Hull metadata remains optional; the public manifest is unchanged. Source UVs, bases, IDs, transforms, shaders, lighting and density are unchanged. Buffers are allocated once at the maximum polygon vertex count; QA switches between quad and hull in place with the same attribute/index handles and an explicit draw range.

Estimated removal of rectangular area is only 1–10% with this padding. Hulls generally have 7–14 vertices and 5–12 triangles, versus 4 vertices and 2 triangles for a quad. Extra vertex/primitive work could cost more than the fragment work saved. Seven CPU tests pass, including alpha coverage and hashes of all 44 source phases, ownership and readiness-buffer invariants.

## Initial native counterexample

`readback-initial-day.json` was recorded on branch source `b1c3ddf`: Sabana/media, native mapped far ground, near transition 90–120 m, fog 30–300 m, sky fog palette and soft backdrop. The density path was paused at 13.2 seconds, at camera `[-43.49710893312456,17.708301721455364,191.85039633264967]`.

The synchronous visible RGBA8 framebuffer was read in quad → hull → hull → quad order, after six zero-delta renders per stage. The simulation state remained unchanged and GL reported no error. All stages used 77 draws. Submitted triangles increased from 1,294,332 to 1,303,841 with the hull.

Quad/hull differed at 1,211 pixels (1,314 channels), with maximum channel delta 143. The quad repeat also differed at 14 pixels (maximum 29); the hull repeat differed at one pixel (maximum 2). This result does **not** establish equivalent coverage, nor identify the cause of the differences. There has been no GPU timing trial of the hull candidate. It remains unaccepted and disabled by default.

QA source `88bbfdc` adds preparation/visibility hashes, camera/light state and pixel examples to distinguish changing state from geometry/sampling differences. Day/night, mip, movement, restoration and performance acceptance remain pending.
