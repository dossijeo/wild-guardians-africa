# Early Canyon bank discard QA

Identical intermediate opacity ramp, mask and geometry. Routes water-opaque-core.js only to move coverage/discard from fluidVisibility (after standard-material lighting) to alphatest_fragment (before lighting). Current water has no alpha maps or vertex alpha. No production change.

Twelve capture controls pass against original scene geometry/cameras, with full backgrounds and no recorded errors. Compared specifically with balanced bank: four of six native day/night images are RGB exact; view0 has12 day/13 night changed pixels in at most7x3 pixels. Cause of tiny residual is not yet isolated; do not claim full parity. balanced-comparison.json contains exact bounds. No general material compatibility claim.

Static full-background ABAB benchmark prepared and running separately in canyon-early-bank-cost-20261022. Both benchmark arms use balanced bank; only placement changes. No timing result yet. Moving-camera validation remains pending before adoption.
