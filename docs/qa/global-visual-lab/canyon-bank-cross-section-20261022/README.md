# Canyon bank cross-section diagnosis

Reproduce: `node tools/experiments/audit-canyon-bank-cross-section-20261022.mjs` with Vite5190. Real native campaign, seed712, existing comparison target z102. Samples81 points across the river, spacing.25 world units. Each sample raycasts downward against rendered resident terrain meshes and records the field surface, water level and QA bed-depth approximation. Read-only world observation, no shader/geometry changes.

Mesh and field surface agree within ~2.2e-7 world units in this section. The approximate water-depth formula remains close to the rendered section; see summary.json for exact maximum. This rules out a large coordinate offset in this section, not in all chunks/horizon views. field.surface can itself represent mesh-interpolated terrain, so its agreement is not independent proof of an analytic terrain formula.

The visible intersection occurs around6.5 units from center, before waterHalf7.116, because the bed rises above the water plane. Existing helper uses the full width to estimate shallows; the depth-based pilot handles this more appropriately than a distance-only color band. However, the bed color is still shaded as water, not lit with the ground BRDF and normals, and dry-bank material changes abruptly at the intersection.

Next experiment should couple a restrained wet-bank ground response to the same depth region and review the light/color continuity. Do not keep treating this as missing noise or merely a coordinate error. No new performance claim, no native integration, no global art completion.
