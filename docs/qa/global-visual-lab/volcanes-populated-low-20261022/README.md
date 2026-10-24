# Volcanoes medium/low visual comparison

Capture with WG_FIXTURE_BIOME=volcanes WG_COVER_QUALITY=baja WG_REVIEW_OUT=docs/qa/global-visual-lab/volcanes-populated-low-20261022 using capture-biome-populated-frozen-20261022.mjs. Run compare-populated-quality-20261022.py volcanes and WG_POPULATED_SUFFIX=populated-low-20261022 audit-biome-populated-frozen-20261022.py volcanes. Medium reference reused unchanged.

12 pairs match saved elapsed, worker positions, camera,target,time,origin; no recorded errors. Medium left,low right. Normal day/night inspected. Low retains the volcanic material/ash character but reduces grounding shadows and geometric detail in the distant environment; night floor appears less occluded in places. It is an available quality compromise, not equivalent-image optimization. Preserve medium as selected artistic reference.

Separate profile benchmark currently fails strict resource equality because repeated medium runs differ by one resident geometry. No final performance recommendation from that run. No production changes; lava edge/motion remains pending.
