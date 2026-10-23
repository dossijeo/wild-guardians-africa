# Real wall placement with fixed512

Medium, day, seed 712, Intel UHD, 1280x720, normal camera. Disposable fixture. Uses native wallPlacement validation and canonical Game.placeStructure with existing budget and rules. Menu pause is resumed only for the synchronous command and restored in finally; normal syncResidentProps follows. No production simulation, navigation or material changes.

A wooden palisade structure-50 is committed at (91,0). Structures increase 1→2 and renderer objects 4→5. One shadow-casting mesh is present. Shadow cache draws increase 219→220 while hits increase 325→504 over 90 render-observation frames. Manually inspected the resulting capture: the new palisade and its directional shadow are visible on the green moss ground. Localized mud and fern coverage remain.

Cache entries remain 25, bytes 35,209,000 (33.58 MiB), publications 30, invalidations zero. Ground mask bytes unchanged; no suppressed props in this location. No browser/GL errors. This supports separation of dynamic shadows from cached static material composition: adding this caster updates the shadow without rebaking the ground material.

Limits: one isolated wall in an unobstructed location, not a wall chain, center construction, foliage suppression or extensive build/destroy cycle. Fixture paused after commit. Ten-frame cadence preamble is not performance evidence. No claim of full construction or campaign validation.

Reproduce: WG_VARIANT_SEQUENCE=fixednative; WG_PHASES=day; WG_COVER_QUALITY=media; WG_MODES=cadence; WG_SAMPLES=10; WG_WARMUP=30; WG_STATIC_VIEW=1; WG_WALL_CACHE_PROBE=1; WG_REVIEW_OUT=<fresh directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs.
