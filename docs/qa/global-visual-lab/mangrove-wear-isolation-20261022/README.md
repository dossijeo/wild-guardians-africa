# Wear-growth isolation

Diagnostic only: retain accepted roots, water/occupancy/path exclusions and original geometry; replace only the shader wear growth factor with one. Leaves become full-sized at accepted roots near wear boundaries. No source runtime change.

12 captures with identical camera/target/time/origin/calls/triangles to reviewed-profile-20261022, seed 712, media, full far backgrounds; no captured errors. Normal day inspected: leaf-covered patches expand locally and some sharp boundaries become more obvious. Removing the taper is not an artistic fix and is not selected. It does show wear taper affects patch outlines, but root exclusion and other causes remain unisolated.

Inspected native ground mask generation in spatial-savanna.cpp: settlement wear combines radial clearing with two approximately world-axis-aligned paths, sampled on a 1.5m mask lattice. These intentional exclusions must not be erased or warped into paths. No engine changes. The visual question remains how to soften the leaf-side boundary without reducing density throughout the covered region.

Reproduce with capture-mangrove-wear-isolation-20261022.mjs and compare-mangrove-wear-isolation-20261022.py. Original left in pairs. No benchmark or biome-completion claim.
