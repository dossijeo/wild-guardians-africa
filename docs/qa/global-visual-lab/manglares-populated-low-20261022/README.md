# Mangrove medium/low visual trade-off

Same populated frozen fixture and selected recipe; low profile through ordinary settings. Capture with WG_FIXTURE_BIOME=manglares WG_COVER_QUALITY=baja WG_REVIEW_OUT=docs/qa/global-visual-lab/manglares-populated-low-20261022 using capture-biome-populated-frozen-20261022.mjs. Compare with compare-populated-quality-20261022.py manglares; audit with WG_POPULATED_SUFFIX=populated-low-20261022 audit-biome-populated-frozen-20261022.py manglares.

12 medium/low pairs match camera,target,time,origin,elapsed and worker positions; no page/GL errors or coverage overflow. Original medium captures reused unchanged. Medium LEFT,low RIGHT. Normal day/night inspected: low retains regional water/shore treatment but loses cast shadows and leaf volume/coverage at distance; objects appear less grounded. This is an explicit visual downgrade in exchange for lower GPU cost, not a replacement for the user-approved dense medium treatment. Night differences are subtler but present.

Corresponding profile benchmark: manglares-populated-resident-cost-20261022, paused/fixed resident scene. Do not claim low matches medium quality or attribute all savings to leaves. No production density/pigment changes made. Selected medium reference remains unchanged.
