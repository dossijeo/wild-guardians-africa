# Shared geometric leaf reverses — policy 3 visual pilot

Native IAB tab 833, branch source `80eb9303`, renders the same mature maize in
four arms: original DoubleSide, cloned original DoubleSide control, Blender
leaf-reduced geometry DoubleSide, and that derivative with shared reverse
indices and three FrontSide material groups. Original AfricanToon, crop
textures and growth shader are used. Shadow DoubleSide is isolated explicitly.
The run exported successfully, reported owner cleanup without errors and lost
its context; the tab was subsequently confirmed terminal through visible
status and closed. Four long-running CPU campaigns were live; no GPU timings
were collected.

Root inspected `comparison.png`. The derivative remains recognizably maize,
retaining leaves, ears and general shape, with no obvious disappearing part or
gross deformation in this single mature view. Contour/detail differences are
visible on comparison, but do not automatically reject this candidate under
the user's policy of 8 October. This is a provisional visual assessment of
one view, not an accredited human review or approval in actual gameplay.

The unchanged original control had zero RGB error and identical alpha. The
candidate's numeric pixel/color/silhouette diagnostics are retained in the raw
report for locating defects, without automatic rejection or relabeling old
results. Candidate geometry reports 6,903 vertices and 4,932 triangles with
shared live growth attributes; this does not prove all growth/bridge contracts.

Before promotion, inspect other angles and real gameplay scale, validate all
growth stages and transitions, materials/UV/animation, shadows and stability,
then measure dense-farm net GPU benefit and resource cost. No production asset
or material changed, and no PR was approved from this pilot.

`report.json.gz` retains the exact exported report. `receipt.json` hashes the
raw report and comparison image. The source branch owns the reproducible
Blender derivative and fixture; main archives evidence only.
