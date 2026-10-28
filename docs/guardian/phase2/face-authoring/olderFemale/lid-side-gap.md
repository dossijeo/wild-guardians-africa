# Opposite-profile lid gap: rejected contour trials

The full-blink white strip found during the edge-frame experiment remains unresolved. Neither trial below is installed; the committed expressive-candidate.blend/GLB stay unchanged.

- v5: widened R 10%, extended upper/lower bounds 2 px, rim 26 mm. Browser opposite profile with full blink and mouth 0.85 still showed the original gap. This changed the wrong contour for the visible problem.
- v6: restored R; widened L 16%, extended upper/lower bounds 2 px, rim 26 mm. Browser same profile showed a wider gap (seam-investigation/lids-v6-rejected.png). Reject.

Both were generated with add_actor_eyelids.py using the committed expressive Blend, --replace-existing --export-glb and the original olderFemale GLB as --source-glb. Outputs are ignored test-results/olderFemale-lids-v5 and -v6. Normal-frame transfer was applied separately to -surface.glb; no missing source correspondences, and other binary data stayed unchanged during that transfer.

The fitted forward clearance for L grows from 10.27 mm (unchanged L in v5) to 14.07 mm in v6. Thus widening the contour also changes the fitted depth envelope; it is not a clean isolated coverage fix. Increasing width must not be repeated blindly. Next inspect the lateral boundary in geometry, including the source eye, fitted shell and rear rim attachment, then correct depth/attachment rather than approving these variants. Partial-blink acceptance was not reached because full closure already failed.
