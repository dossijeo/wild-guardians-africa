# Cultivated-soil streaming audit

Native opt-in cropSoil=local; Gran Rio, seed 712, media, full far impostors and mountain background, populated saved fixture paused before first game frame. Run node tools/experiments/audit-river-crop-soil-stream-20261022.mjs with Vite on 5190.

Camera/target move 192 m away and return twice. Each position has 25 resident chunks; away retains only five original keys. Both returns compare all 25 original ground masks byte-for-byte: zero differences. Plants, workers and simulation elapsed are unchanged. No page/GL errors or coverage overflow recorded. The script now also rejects incomplete comparisons or an excursion that unloads no chunks; the saved output was independently checked against these stronger assertions.

Resources (geometries/textures): initial 339/111, away 201/90, return 186/93, away 180/90, return 186/93. Return counts plateau in this short test; this is not a general leak proof. Calls/triangles: initial 105/874520; returns 105/874470, away 83/874869. The initial 50-triangle residual is not explained; do not claim whole-scene equivalence from mask equality.

80 groundDetails.chunk calls average 0.269 ms, maximum 0.700 ms. These encompass terrain extraction, water indexing and soil attachment together, are timer-resolution-limited, and have no original A/B control. They are not isolated mask cost or frame/GPU timings. Discrete settled camera positions do not validate continuous motion. Event repaint cost remains unmeasured in the live browser. Keep this soil option experimental; selected closure recipe unchanged.
