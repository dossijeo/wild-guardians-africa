# Doubled night focus visual review

Source45201f7d; night central gain1.50→3.00, day1.30/outer.60 unchanged. Same existing shaders/passes/resources. Root inspected native landscape and fresh portrait420×900: central focus clearer, four crops and whole UI legible. This is root review, not new human approval or GPU-cost evidence. Exposure/foliage detail looked readable; no measured HDR clipping assertion.

The first portrait screenshot was taken before resize stabilized. portrait-resize-incomplete.jpg is retained as a negative QA capture and is excluded from validation. Root then used fresh956, verified canvas/drawingbuffer420×900 and captured portrait.jpg. No fixture failure or production regression is inferred from the incomplete screenshot.

Both Cancel cleanup reports have renderer geometries/textures/programs0/0/0; root closed955/956 and reset viewport, Browser2 empty. Landscape console retains ANGLE warnings; portrait console empty. No cost arm was measured on superseded night1.50:954 only opened and closed before Prepare.

manifest.json hashes every original JSON/console/cleanup and image, including negative. Incremental-cost comparison uses fixed V4 baseline A and updated452 candidate B; performance/readiness gates remain open, frame-slack default off and no PR.
