# Sabana background seam: isolated defect and finer proxy candidate

Found in current low-quality active motion (edf74541e), at the 20-second midpoint. A straight, striped vertical wall is visible behind the trees in both day/night images. It is easier to see at full resolution than in contact sheets. This is an unresolved continuity defect, not a grass density problem.

The existing diagnostic was parameterized with WG_DIAGNOSTIC_MOTION_FILE and a biome mismatch guard. Using the actual recorded camera/target, a frozen populated world and time 170, it renders before / seam hidden / restored. With the seam hidden, the exact wall becomes a blue opening. Near queues are empty and no renderer errors are recorded. The native/coarse-ground bridge is therefore covering a real height mismatch; removing it is not a solution.

Step32 versus step16 uses identical camera, target, near bounds, origin and chunk sets (insertion order differs). Both use current recipe, 720p, baja. The diagnostic override changes only the regional graphical proxy spacing, not authoritative terrain, original models, vegetation density or materials.

| Surface data | step32 | step16 |
| --- | ---: | ---: |
| Ground triangles | 5002 | 9376 |
| Bridge triangles | 2098 | 2012 |
| Maximum bridge height delta, all edges (m) | 1.721434 | 1.179688 |
| Ground + bridge attribute/index bytes | 308976 | 463872 |

The visible central wall becomes a much thinner residual line in the step16 image. Full-resolution step16 and the enlarged paired crop were inspected. Added geometry: 4288 triangles, 154896 bytes (~151 KiB of arrays, not total VRAM). No GPU timing was collected in these captures. Do not infer that this is free or already adopted.

Control restore: step32 before/restored RGB identical. Step16 differs in four pixels at [307,366,311,371], outside the inspected boundary; max channel difference102, whole-frame MAE0.000158/255. The boundary crop itself is identical before/restored. Preserve this small residual rather than asserting full byte equality.

Artifacts: sabana-seam-isolation contains original and seam-hidden renders; sabana-seam-step16 contains the finer candidate and step-comparison.png (step32 above, step16 below). Crops enlarge source pixels without relighting or generation. Both diagnostic.json files retain geometry details, effective URL and source reference.

Decision: retain step16 as a QA candidate only. Next required evidence is same-pose GPU A/B/A/B plus day/night motion with the finer proxy. sabana-seam-cost-pose.json freezes the comparison view. No change to the current review recipe or normal game defaults in this pass. Do not generalize the volcanic result without measuring Sabana.

Reproduce diagnosis using WG_CURRENT_REVIEW=1, WG_FIXTURE_BIOME=sabana, WG_COVER_QUALITY=baja, WG_DIAGNOSTIC_MOTION_FILE=docs/qa/global-visual-lab/current-review-20261025/sabana-current-motion-low/active-play.json, fresh WG_REVIEW_OUT, and WG_DIAGNOSTIC_GROUND_STEP=32 or16; run tools/experiments/diagnose-volcanic-ground-seam.mjs. The historical filename is retained for prior reports. Source syntax check passed; real renderer completed both captures.
