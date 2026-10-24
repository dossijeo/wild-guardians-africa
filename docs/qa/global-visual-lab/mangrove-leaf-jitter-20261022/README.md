# Mangrove within-cell leaf position experiment

QA-only deterministic jitter amplitude increased from0.25 to0.95 of grid spacing for Mangroves. Candidate cells, geometry, nominal density, wind, shaders and budgets unchanged. Positions stay inside their original cells; existing water/wear/occupancy tests apply at the new position. Actual accepted instance count can change near masks. No production source change.

Twelve native-renderer captures: original/candidate, low quality, three views/day/night at the exposed-soil shoreline192m from the previous base. Seed712, 1280x720, full far impostors/mountains and smooth transitions. No captured errors/overflow. `ground-crop.png` is a1:1 crop, not stretched.

Art assessment: wider jitter disrupts some spacing regularity but opens larger holes and retains the flat, sharply edged leaf-piece appearance over brown soil. It is not sufficient evidence of a meaningful volumetric improvement. Keep the QA variant, do not adopt it as the solution or reject it on performance grounds. Next inspect authored far-leaf shape/normal response and material contrast before increasing density. Preserve the completed water-footprint correctness fix.

workload.json reports actual call/triangle changes; no GPU timing study was justified before establishing a clear artistic benefit. Reproduce using capture-mangrove-leaf-jitter-20261022.mjs; no route touches buildings, simulation or navigation.
