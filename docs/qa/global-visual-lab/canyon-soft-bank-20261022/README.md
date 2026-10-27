# Canyon softer bank: retained QA candidate

Original mask resolution and geometry. QA reduces depth onset from .015–.19 + .035*fine to .015–.07 + .02*fine, and widens depth opacity ramp from .075–.23 to .40–.85. Values are vertical depth thresholds, not horizontal bank widths. Native core/rim split remains active. Only browser-routed source changes; production untouched.

Twelve real medium1280x720 frames, seed712, full backgrounds. audit-canyon-bank-capture-20261022.py verifies matching camera/target/time/draw calls/triangles, ready backgrounds and no recorded errors. comparison-day.jpg provides aspect-preserving original/candidate overview. Full-resolution native reverse day and night reviewed.

Result: lateral sawtooth is visibly softened with no transverse dry strips. Daytime ramp is excessively diffuse in places; night retains blue river/rock distinction but also broad fading. Retain as an artistic candidate, not final approval. Refine toward an intermediate ramp before native promotion; inspect other views and moving camera. Original depth-mask and boundary variants remain separately documented.

No GPU speed claim: same geometry, draws and texture resolution do not imply equal cost. Wider transparent rim may reduce opaque-core early-depth savings and increase fragment work. Measure after tuning. No changes to logical water/terrain, simulation or navigation.

Reproduce (server5190): node tools/experiments/capture-canyon-soft-bank-20261022.mjs, then python tools/experiments/audit-canyon-bank-capture-20261022.py docs/qa/global-visual-lab/canyon-soft-bank-20261022.
