# Fixed512 changed-mask validation

Intel UHD, 720p, medium, day and night. Synthetic edit to the ground mask of chunk 2,0: coverage R/G set to zero and wear A to 255, then original byte array restored in finally. Both writes upload the texture and emit groundmaskchanged. No simulation entities, rules or authoritative terrain were modified.

Each phase publishes exactly two replacement targets (edit and restore), changing 742,059 cache channel bytes on edit and restoring all original cache bytes exactly. Peak replacement memory 36,617,360 bytes (34.92 MiB), returning to 35,209,000 (33.58 MiB). No rejected requests or reported browser errors.

Screen captures show the synthetic soil region changing visibly while buildings, ferns and lighting remain present. The deliberately rectangular edited region is a diagnostic input, not an artistic change. Day changes 343,973 pixels; night 343,431. Restored whole-frame captures differ at 12 daytime and 3 nighttime pixels, respectively; these differences are not attributed, so whole-frame exact restoration is not claimed. The cached target itself is byte-exact in both phases.

This proves actual changed-mask material regeneration and restoration, beyond the earlier notification-only test. It does not prove a live gameplay planting path in Mangrove (the existing crop-soil feature is River-specific), nor performance during continuous streaming. The 10-sample cadence windows are preparation/smoke data, not benchmark evidence.

Reproduce: WG_FIXED_MASK_PROBE=1, WG_VARIANT_SEQUENCE=fixedlifecycle, WG_PHASES=day,night, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30 and WG_REVIEW_OUT=<new directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs.
