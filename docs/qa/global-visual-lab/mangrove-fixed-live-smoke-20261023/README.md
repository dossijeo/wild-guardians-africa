# Integrated fixed512 live-world smoke

Intel UHD, 720p, medium/day. After ordinary paused-fixture preparation, the canonical Game.resume removes only the menu pause; 300 RAF frames run through the normal game loop, then Game.pause restores the menu pause in finally. No direct simulation step, entity rewrite or gameplay-rule change.

Elapsed simulation advances from ~120 to 129.3964 seconds, worker position/task snapshots differ, and no other pause appears. Cache remains 25 entries / 35,209,000 bytes, with the same peak. No reported browser/GL error. Samples and final live capture accompany this report. This is a ~9.4 s smoke, not a long campaign, construction-event test or performance acceptance benchmark. Material/fern time overrides from the comparison harness remain active; actual simulation entities advance.

Reproduce WG_LIVE_CACHE_PROBE=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>; run measure-mangrove-ground-hybrid-20261023.mjs. Cadence records precede live unpause and are not live performance data.
