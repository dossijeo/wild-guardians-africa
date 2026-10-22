# Rain and lightning presentation on current main

Base: `1b5444927f86e9eac0d0e4a9954f0ebc126a59cf` (`origin/main` at review time). This pass deliberately preserves the newer atlas, original geometry, firefly glow, flame variety, snake proportions and foliage rotations already on main. The older branch's proposed smoke, fog and dust silhouettes were discarded after comparison.

The retained changes are limited to two secondary decorations:

- Rain falls in three staggered, narrow drops below each cloud, with soft appearance/disappearance instead of one large overlapping drop. Reduced-motion slows this decorative progression.
- Lightning is narrower and originates below its cloud, making the bolt silhouette readable rather than overlaying it on the cloud.

No event definitions, interaction rules, hit radii, economy, duration, cooldown, camera, night-speed code or assets changed. Fire smoke and secondary leaves keep their previous presentation.

## Evidence and verification

`raincloud-before.png` / `raincloud-after.png` and `lightning-before.png` / `lightning-after.png` are real game captures, using the development fixture `?qa-microevents&qa-microevents-fixture`, the same farm camera, time 100, deterministic particle seed 42 and particle time 94/60 seconds. Baseline interception replaced only the billboard module with the base revision. Both sides use the exact current-main atlas. The lightning sample is captured during a flash.

`metrics.json` records 72 renderer draw calls before and after for both cases. Rain grows from 17 to 33 pooled instances; lightning stays at 6. The existing single instanced mesh and its 160-instance capacity are retained. These are draw-call observations, not a reliable headless GPU frame-time benchmark.

`lightning-night-after.png` checks the same effect under the game's actual night lighting. `mobile-night-after.png` records the limitation of the 390×844 QA viewport: the HUD and debug controls occupy most of the screen and resizing moves the anchor out of its safe area, cancelling the event. It does not demonstrate successful mobile VFX validation.

84 microevent tests pass, including all-event touch interactions and a new test that decorated rendering stays within the instance pool and does not mutate particle positions/progress. Production build passes with existing chunk-size and mixed static/dynamic import warnings.

An initial atlas inspection incorrectly interpreted nonzero RGB in fully transparent pixels as visible streaks. Raw alpha inspection and proper background compositing disproved that suspicion. The original atlas was retained byte-for-byte; there is no asset-corruption claim or unnecessary rebake in this change.
