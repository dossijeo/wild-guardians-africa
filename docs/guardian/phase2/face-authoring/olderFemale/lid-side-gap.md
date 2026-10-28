# Opposite-profile lid gap: rejected contour trials

## Root cause found: generated rim color, not uncovered eye

The geometric-gap interpretation below is superseded. A visible double-click pick in the fixture selected ActorFacialLids face 10616, vertices 6083/6087/6089, ahead of the underlying eye. Its COLOR_0 values were approximately (0.456, 0.449, 0.456), explaining the gray/white strip. See seam-investigation/white-rim-pick.json. The fixture now exposes these surface picks in its visible status for future diagnosis.

Double-sided rendering and a temporary 50 mm rim did not remove the strip; both were rejected. Return to v4 geometry. A color-x clamp alone also failed. v9 uses a reviewed skin reference at atlas coordinate (350,405) and repairs neutral gray generated lid colors after the rim is joined. The final Blender color pass repaired 831 corner values using linear skin color (0.39676,0.11954,0.03560). It touches only the generated lid object's colors, preserves its fold shading where valid, and does not edit the original skin images or geometry. Atlas output now resolves an absolute path to avoid Blender writing relative renders under C:/test-results.

v9 Blender and GLB were generated, then received the experimental edge-frame transfer. Runtime full and half closure were inspected in the formerly failing profile under left raking light. The broad white strip is gone (seam-investigation/lids-v9-full.png); a tiny pink edge fleck remains and needs inspection. No claim of complete facial acceptance or gameplay installation. Test artifacts are test-results/olderFemale-lids-v9.blend, .glb and -surface.glb; reproduce using eyelid-profile-v9.json and the same v4 source/animation inputs. Python compilation and fixture JavaScript syntax checks passed.

## Historical rejected hypotheses

The full-blink white strip found during the edge-frame experiment remains unresolved. Neither trial below is installed; the committed expressive-candidate.blend/GLB stay unchanged.

- v5: widened R 10%, extended upper/lower bounds 2 px, rim 26 mm. Browser opposite profile with full blink and mouth 0.85 still showed the original gap. This changed the wrong contour for the visible problem.
- v6: restored R; widened L 16%, extended upper/lower bounds 2 px, rim 26 mm. Browser same profile showed a wider gap (seam-investigation/lids-v6-rejected.png). Reject.

Both were generated with add_actor_eyelids.py using the committed expressive Blend, --replace-existing --export-glb and the original olderFemale GLB as --source-glb. Outputs are ignored test-results/olderFemale-lids-v5 and -v6. Normal-frame transfer was applied separately to -surface.glb; no missing source correspondences, and other binary data stayed unchanged during that transfer.

The fitted forward clearance for L grows from 10.27 mm (unchanged L in v5) to 14.07 mm in v6. Thus widening the contour also changes the fitted depth envelope; it is not a clean isolated coverage fix. Increasing width must not be repeated blindly. Next inspect the lateral boundary in geometry, including the source eye, fitted shell and rear rim attachment, then correct depth/attachment rather than approving these variants. Partial-blink acceptance was not reached because full closure already failed.
