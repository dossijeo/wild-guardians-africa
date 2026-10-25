# Fine water slope rotation: limited visual contribution

QA rotates fine-layer coordinates by an orthonormal .8/.6 matrix, then transforms sampled slopes back by the transpose. Macro layer, amplitudes, texture resolution and two slope fetches unchanged. Uses native balanced Canyon shore and full backgrounds. Twelve real medium1280x720 seed712 frames; camera/time/draw/triangle/background controls pass, no recorded errors.

Warmup reverse daytime side-by-side inspected: small glint variation, but dominant repetitive distant bands remain. Do not promote as a solution. Fine-layer alignment alone is insufficient in this view. No measured performance claim; same fetch count does not imply identical GPU cost. Native production shader unchanged. Next isolate macro slopes versus reflected environment filtering, rather than stacking noise blindly.
