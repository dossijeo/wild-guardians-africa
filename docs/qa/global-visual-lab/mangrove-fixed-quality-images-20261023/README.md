# Post-quality-switch image capture

Integrated fixed512, Intel UHD, 720p, medium initial profile. Real sequence media → muy_baja → media → muy_baja → media, day and night, 45 RAF waits per step. Captures are taken after each step, unlike the earlier resource-only probe. Cache ownership assertions require every ground material patched, hooks equal tracked materials, and no GL errors.

Returning to medium yields exact RGB equality in the specified ground crop x=140..439, y=480..659 in all four return comparisons. Visual inspection of the full daytime first/last medium captures retains green substrate, relief, localized mud and building shadows. Whole-frame equality does not hold: 24,426–25,102 changed daytime pixels and 20,936–23,144 nighttime pixels, with RGB MAE 0.260–0.309 and 0.098–0.121 respectively. Differences are not isolated to particular moving/rendered objects here; do not describe this as full-scene parity. See image-restoration.json.

No terrain, cache-resolution or artistic change is made by this test. Material replacement compiles successfully and restores the measured ground region; wider scene discrepancy attribution remains open. The scene includes time-dependent presentation even though simulation is paused. That observation alone does not prove the source of the differences.

Reproduce WG_FIXED_QUALITY_PROBE=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day,night, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>, measure-mangrove-ground-hybrid-20261023.mjs. Probe files contain resource counts; quality-named PNGs are the actual post-switch captures. These short cadence windows are not performance claims.
