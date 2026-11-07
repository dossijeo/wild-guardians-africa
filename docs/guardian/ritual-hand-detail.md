# Ritual close inspection

The development fixture now exposes a Plant/Wall selector and Prepare ritual detail button. It commits a real blessing with QA charge, pauses presentation at 0.6 seconds, and uses the existing detail camera. Existing step/resume/angle controls continue to work. This is isolated validation UI, not a production gameplay control.

The wall fixture prepares a paid wall during temporary daytime without a raid, then restores the previous time and raid before confirming the blessing. Initial testing found that changing time alone did not bypass the construction restriction during an active raid; the corrected fixture was rerun successfully, with no errors.

Native spatial-wasm screenshots inspected: ritual-hands-plant-detail.png (day) and ritual-hands-wall-detail.png (night). Both show the eyes shut, both hands lowered in front, and early turquoise leaves around the hand region, with the vortex retained. The wall version spreads leaves wider around the wall. No extra Guardian is visible. Receipt: ritual-hands-detail.json (corrected wall trial).

These are close samples at 0.6 seconds, not continuous timing/motion approval. The inner palm/leaf start remains partly covered by ornaments at this view; exact attachment is supported by the shared emission transform test, not a claim that every leaf start is visually unobscured. Existing eight-view and persistence tests cover other aspects separately. Source syntax and diff checks pass.
