# Desert corrected camera motion

Current review, seed 712, media, 720p, day/night active simulation with 2D background enabled. Generic 144 m X / 50.4 m Z out-and-back path, now clamped to 3 m eye clearance for Desert only. Production camera/materials/geometry unchanged. Prior invalid underwater/underground QA trajectory is documented in ../desierto-camera-clearance/DIAGNOSIS.md.

1707 day and 1476 night recorded frames; minimum eye clearance 3 m in both; no console errors, final GL error zero; path and execution audits pass. Day/night simulation advances 39.876/56.328 s respectively during 40 s captures. This is not a performance benchmark or a lighting-only paired comparison.

Inspected full-resolution day-4 and night-4: the prior blue foreground is replaced by continuous sand, dunes and mountain background remain visible. Also inspected initial day settlement view. The midpoint is deliberately low/oblique and should not replace the normal-game camera for artistic approval. Strong sand detail is preserved as approved; no attempt to weaken it based on this oblique stress view.

Limits: checkpoints alone do not prove absence of shimmer, short-lived seams or all streaming failures. Keep videos for temporal review; no all-biome quality completion claim. The original parent main/current static gallery remains the matching-view art comparison.
