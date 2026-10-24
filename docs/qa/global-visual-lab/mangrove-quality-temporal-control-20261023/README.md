# Quality-switch temporal control

Same integrated fixed512 scene, medium/day/night, 45 RAF waits per capture, five samples. Control never calls qualitySetting; otherwise uses the same paused fixture and time overrides as the switch probe. No browser errors.

Control medium returns at steps 2/4: day 0/0 changed pixels, night 8/11 changed pixels (RGB MAE 0.000051/0.000078). Ground crop remains exact. Historical switch differences exceeded 20,000 pixels, with essentially no spatial overlap with control differences.

A current-code switch repeat in ../mangrove-quality-switch-recheck-20261023/ confirms day 24,827/25,106 and night 23,423/22,263 changed pixels. Thus passage of time alone does not explain the large difference. Do not dismiss it as ordinary animation without further evidence. Source subsystem is not isolated yet; could involve state/material restoration or the QA time controls applied to replacement resources.

Coarse difference counts localize almost all changes to top 180 pixels and x=800..1119,y=360..539 (including the pond region); foreground bottom 180 pixels remains exact. This spatial observation is not proof of a particular rendering cause. Both probes preserve cache hook ownership and ground-cache bytes; full-scene quality parity remains OPEN.

Reproduce: WG_FIXED_QUALITY_PROBE=1, WG_QUALITY_CONTROL=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day,night, WG_COVER_QUALITY=media, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30, WG_STATIC_VIEW=1, WG_REVIEW_OUT=<fresh directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Omit WG_QUALITY_CONTROL for the actual switch repeat. Comparisons are RGB absolute difference, with 160x180 pixel tile counts. No performance claim.
