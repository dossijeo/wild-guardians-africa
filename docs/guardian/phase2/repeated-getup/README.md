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
