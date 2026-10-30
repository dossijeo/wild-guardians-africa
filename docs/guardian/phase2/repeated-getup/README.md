# Repeated Attack during get-up

The browser fixture now exposes Attack durante levantada. It loads the selected catalog beast, casts Attack through Game.cast, advances Game.tick, then casts again after authored recovery has run for more than .6 seconds. It waits for a new falling phase and complete physical release. The fixture resets cooldown and raises durability; this isolates interruption and is not balance validation.

Actual hyena run: second=true, entered=true, finished=true, errors empty, maximum one visible Guardian. Telemetry shows recovery continuing while the second projectile travels, falling on contact, then rolling/recovering and releasing physical ownership. See hyena-status.json. The 22 beast-combat-physics tests pass, including airborne/rolling/get-up repeat hits and shared-world recovery.

The on-screen control panel obscured the moving animal in this run. These are runtime state assertions, not visual approval of the full repeated-impact transition. A recorded unobstructed close view and other species/directions remain pending.

## Unobstructed recorded run

Added a closer camera and canvas recording to the probe. Corrected the fixture durability override to magicHealth=200: 20 was below Attack damage (28) and made the first hit trigger retreat, invalidating a second target. This is fixture-only; production balance is unchanged. New run completes both impacts and releases physics with no errors; hyena-video-status.json binds the run. hyena-cycle.mp4 has no audio; contact sheet samples at 1 Hz. Reviewed two manifestations, repeated fall and return upright. Ground support is visually ambiguous in several samples from this elevated view, so this is not final acceptance of ground contact; inspect lateral view next. Other species and directions remain pending.

## Low lateral view and independent mesh support scan

Recorded hyena-side.mp4 and hyena-support-status.json. The diagnostic scans every rendered skinned vertex except tail-classified vertices during recovery, against the actual terrain surface, instead of only reusing the recovery support samples. Minimum gaps in 39 sampled recovery frames range from 0.00486 to 0.05052 m, predominantly 0.01 m; the largest values occur at transition entry. The lower-angle contact sheet does not show sustained large hovering in this case. This sampling adds significant QA-only CPU work and is not a performance measurement. It does not prove every frame, planted-foot alignment, all species, terrain or obstacle contacts. The 1 Hz sheet is a sparse review; the video contains the full recorded cycle.

## Lion lateral and rhino elevated contact

Ran the same production-catalog probe after selecting lion/Lateral and rhino/Elevado. Both report second=true, entered=true, finished=true, errors empty, zero remaining physical bodies and at most one Guardian. Saved status, silent canvas MP4 and 1 Hz contact sheets for each.

Independent recovery vertex minimum-ground-gap ranges: lion 0.00470–0.04855 m; rhino -0.00132–0.04012 m. Small entry-transition gaps and slight penetration remain; these are sampled minima, not all-foot contact guarantees. Reviewed knockdowns and return upright. Lion drifts toward the image edge, limiting fine pose inspection. Elevated test deliberately overrides the summon origin to generate a downward impulse; the Guardian can leave this low camera framing, so this does not validate production summon placement. The cumulative rollFailures counter remains 1 from the earlier hyena run and does not increase in either run. The earlier hyena run used the bounded fallback once; do not describe all tested recoveries as successful physical supine alignment.

No audio or performance acceptance follows from these captures. Obstacles, dense raids, additional species/directions and every-frame visual quality remain outside these two cases.

## Buffalo lateral and warthog frontal repeated impacts (e6b79b1ed)

Executed the actual Attack-during-get-up control for buffalo/Lateral and warthog/Frontal with the installed catalog, fixed low camera and current physical roll settings. Both report second=true, entered=true, finished=true, videoSaved=true, errors=[], rollFailures=0, one maximum Guardian and no remaining physics entries. Saved silent recordings and inspected contact sheets sampled at 3 fps. Buffalo shifts partly beyond the left frame during its second fall; warthog's second impact is partially obscured by the Guardian in this diagnostic camera. These constraints prevent certifying every transition visually. Return upright is visible for both. This directional fixture overrides the summon origin and therefore does not validate normal placement composition.

Independent non-tail skinned-vertex terrain minima during recovery: buffalo 32 samples, -0.002779 to 0.036221 m; warthog 37 samples, 0.005246 to 0.037510 m. This does not certify all feet or every frame. Maximum planar distance from the initial logical position over the complete two-impact sequence is 1.932 m / 3.097 m respectively, not the distance of a single impulse. The probe increases durability and resets cooldown to isolate interruption; production balance is unchanged. It also scans all skin vertices, so these recordings are not performance benchmarks. No baseline-engine performance work was undertaken.

### Fixed wide framing follow-up

`guardian-combat.html?repeatWide=1` selects a fixed, wider and slightly elevated camera only in the repeated-hit diagnostic. Production camera/placement are unchanged. Fresh buffalo/lateral and warthog/front runs in `*-wide.webm/json` complete both hits and recovery with errors=[] and rollFailures=0. Reviewed 3 fps sheets: buffalo remains in frame through both falls and return upright; a 6 fps crop around the second contact provides more pose detail but crops the lower image. The Guardian still briefly masks the warthog's second contact, so that particular visual transition remains unverified. Sampled minimum non-tail skin gaps: buffalo 0.007469–0.046041 m, warthog 0.004234–0.036190 m. Silent diagnostic recordings, not performance evidence. JavaScript syntax and diff-whitespace checks pass.


## Native heavy-species interruption (2026-10-30)

At 7a25ca4a5, selected rhino in spatial-wasm WorldScene and ran Attack durante levantada. The first low camera was obscured by terrain/vegetation and is not visual evidence. Repeated with repeatWide=1 and the reversible ground-cover visibility control. The control intentionally sets night for Attack, regardless of recoveryDay.

Final rhino-native.json confirms second=true, entered=true, finished=true, videoSaved=true, zero errors, maximum one Guardian. rhino-native.mp4 is the complete silent capture; rhino-native.jpg samples 1 fps. Inspected the clear overview: first knockdown, second manifestation during recovery, interrupted rise, subsequent get-up and return upright. This camera is too distant for millimetre contact/anatomical approval; use the report support samples only within their sampled scope. Fixture durability is 200 and cooldown is reset to force the second hit; no production balance changed. The unused last sheet row is black padding, not footage. This extends repeated-hit lifecycle/visual coverage to a heavy species; it does not certify every direction or obstacle.


## Entry contact investigation

The first native rhino receipt contains three negative non-tail full-skin minima during the second recovery entry: -0.020417 m at recovery age 0, -0.012793 m at 0.1 s, -0.001349 m at 0.249885 s. AuthoredBeastRecovery explicitly preserves the physical entry pose/clearance and blends toward its authored clearance; this timing points to physical handoff contact rather than a late get-up sinking. The original diagnostic only recorded Mesh_0, so the exact responsible vertex cannot be recovered from that receipt. No global height offset or tolerance change was applied.

Enhanced the QA scanner to retain the minimum vertex index, world position and nonzero bone weights. Browser repeat rhino-contact-witness.json finishes both hits without errors and has no negative minima. This is a different nondeterministic trajectory, not proof of a fix. The original penetration remains an open localized finding; future occurrences can now be classified instead of guessing which part touches. The diagnostic change is fixture-only and its full-skin scan must not be used for performance claims.


## Reproducible rendered-pose capture

Optional captureSurface=1 now retains the lowest sampled recovery pose in report.surfaceCapture: hierarchy transforms, active morph weights, model world matrix and exact terrain height under each non-tail vertex. tests/browser/guardian-surface-pose.js restores this pose and recomputes its minimum against those saved heights. This is a single-pose contact replay, NOT a physics trajectory or a terrain field for moved poses. It is diagnostic-only and adds significant allocations.

The real rhino GLB regression changes its bones and parent transform, JSON-roundtrips the snapshot, then restores it and reproduces the minimum within 1e-8 m; mismatched hierarchy is rejected. The initial test exposed a stale skinned bind-matrix update in the capture helper; explicit updateMatrixWorld after parent propagation fixes it. Syntax checks pass for the browser fixture. The new opt-in browser capture has not yet supplied a reproduction of the earlier negative contact, so the penetration remains open.
