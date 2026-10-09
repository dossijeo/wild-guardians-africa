# Definitive-start native menu pause: isolated hypothesis

Native progress observation (37962249087) found one final-body event for each large crop GLB, with ~26 seconds before the bridge event, negligible original callback CPU, ~180 ms until parse, and ~76 ms bridge parse. This excludes progress callback CPU/meshopt parsing as the dominant measured interval; it does not establish physical transport or menu rendering as the cause.

The candidate is OFF in ordinary play and dispatch by default. `--smoke-pause-menu` is recognized only alongside the existing smoke-report invocation. It calls the existing native menu setRenderPaused(true) API at definitive startGame, after its re-entry guard, while retaining the last visible menu frame. It does not pause on prepare-loading/selector interaction. Existing native tick still allows tween/iconTween animations and its RAF continues; no native/menu files are changed. Original loading resources, quality, readiness and 90-second gates remain; shared-ground/union/shared-assets hypotheses stay OFF.

A finally-owned restore acts once only on the same still-connected iframe, using a WeakRef without capturing an iframe/window/API strongly. Removed/replaced menus are never resumed through stale owners. Pause API failure attempts rollback; restore errors do not replace the original game failure. Cancel/error creates a fresh menu whose default behavior is untouched.

The existing smoke observer reads only renderCount/state/section from the currently attached menu, at most 16 times at two-second intervals, using the existing sampling loop. Scalars retain their observation timestamp; no extra RAF, menu API interposition, or detached iframe reference is stored. This is activity evidence, not GPU timing. If no menu API is available, the observation is null.

First source/contracts review, then one native run if authorized. Acceptance still requires original world readiness and genuine minimization/restoration with no resource/error regressions. Timings vary with runner/cache/seed and are not alone causal. The approved web loading compromise is unchanged; this is a Windows regression investigation, not a production promotion.
