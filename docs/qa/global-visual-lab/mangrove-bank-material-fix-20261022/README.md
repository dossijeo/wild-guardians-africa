# Mangrove sediment hook ownership correction

Natural edges introduced per-surface owned water materials, but prepareMangroveBank still patched the shared fluid material before selecting the owned one. It now receives the material actually used by the resident mesh. Land moss, shoreline masks, source silhouettes and simulation are unchanged. Without natural edges the existing shared-material path is preserved.

Twelve real captures, medium 1280x720, seed 712, three poses day/night. Each comparison has equal camera/time/draw calls/triangles and no browser/WebGL errors. Only 69–306 pixels change per view, mean RGB error below 0.000245: the sediment hook affects a narrow edge and does not solve the overly uniform interior. Do not present this fix as a major visual improvement. The approved land moss is retained.

A test verifies that an explicit owned material receives the sediment shader and vertex attribute while the shared source remains untouched. GPU timing after restoring this shader is not yet measured. Its narrow gated region remains the existing recipe, with no new texture lookup or geometry.

Reproduce `node --test tests/mangrove-bank-material.test.js`; Vite 5190, `node tools/experiments/capture-mangrove-bank-material-fix-20261022.mjs`, then `python tools/experiments/audit-mangrove-bank-material-fix-20261022.py`. The before arm patches the shared source as the old integration did. Next return to broad, subtle water-body pigment variation without disturbing moss or adding noisy fine detail.
