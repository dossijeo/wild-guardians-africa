# Priority biome oblique review

Six sheets directly inspected: Sabana, Gran Rio and Gran Canon, day/night, view 2. Left: historical main b2497b0695218652672c805c40971ea830686e3a. Right: existing lab gallery captures, not a new render at HEAD. These are not comparisons against current origin/main. All twelve source hashes were revalidated against the parent manifest; provenance.json records sources and sheet hashes. Source captures are 1280x720, reduced to 640x360 per panel without color grading.

| Biome | Observed improvement | Decision and remaining uncertainty |
| --- | --- | --- |
| Sabana | Dry grass reads as collective coverage on the right rather than isolated plants on flat ground. The warm open settlement remains legible. Night preserves the coverage boundary and grass structure. | Keep the approved coverage and warmth. Static images cannot verify wind, distant LOD changes or shimmer. |
| Gran Rio | Green coverage separates from the earthy open path; stronger vegetation volume remains visible at night. Building silhouettes are preserved in this view. | Keep density. Under-canopy areas are already dark at night: do not increase contrast globally. This view has too little visible water to assess the whole riverbank. |
| Gran Canon | Stratification replaces broad flat wall bands; sand relief and wall shadows add depth while retaining warm sandstone. The river is less cyan with softer banks. Night retains rock and sand structure. | Keep material direction. The foreground wall occupies much of this camera; this is not evidence of normal-camera readability across the whole biome. |

These observations support retaining the existing material direction, not adding another contrast/normal-strength adjustment. No renderer or gameplay code changed during this review. No performance measurements were collected and no full visual approval is implied.

Later Canyon streaming correction and its runtime evidence are documented separately in ../CANYON-HANDOFF-ADOPTION.md. Desert camera correction is in ../desierto-clearance-corrected-motion/REVIEW.md. The historical gallery cannot validate those later changes.

Remaining closure evidence: temporal inspection of grass/background transitions and consistent current-build performance across the six biomes. The sheets alone do not establish equivalence to the original mockups or completion of the overall objective.
