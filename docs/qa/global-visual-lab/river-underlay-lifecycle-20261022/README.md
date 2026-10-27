# Underlay live coverage lifecycle

One real scene cycles coverage quality media -> baja -> muy_baja -> media -> hidden -> restored, at fixed camera and wind, day and night. Overall renderer quality stays media to isolate coverage behavior. This is not a full graphics-profile performance test.

All twelve states have expected filter uniforms: [1,48], [1,40], [0,40], [1,48], [0,48], [1,48]. Restored media and visibility images are pixel-exact to the initial media frame. Very-low and hidden images are pixel-exact to each other. No GL errors or coverage overflow. Final disposal clears filter activation to [0,48], detaches the group and renders without GL error. See audit.json, captures.json, disposal.json.

Run `node tools/experiments/capture-river-underlay-lifecycle-20261022.mjs` with Vite on5190, then `python tools/experiments/audit-river-underlay-lifecycle-20261022.py`.

The experimental shared uniform behaves correctly for these lifecycle transitions. It remains QA; no native adoption or main change. Exclusion-mask accuracy around obstacles/water and rapid streaming remain unresolved. Performance evidence is in the earlier river-underlay-activation-20261022 report, not measured by this capture.
