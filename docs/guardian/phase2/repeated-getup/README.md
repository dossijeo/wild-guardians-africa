# Repeated Attack during get-up

The browser fixture now exposes Attack durante levantada. It loads the selected catalog beast, casts Attack through Game.cast, advances Game.tick, then casts again after authored recovery has run for more than .6 seconds. It waits for a new falling phase and complete physical release. The fixture resets cooldown and raises durability; this isolates interruption and is not balance validation.

Actual hyena run: second=true, entered=true, finished=true, errors empty, maximum one visible Guardian. Telemetry shows recovery continuing while the second projectile travels, falling on contact, then rolling/recovering and releasing physical ownership. See hyena-status.json. The 22 beast-combat-physics tests pass, including airborne/rolling/get-up repeat hits and shared-world recovery.

The on-screen control panel obscured the moving animal in this run. These are runtime state assertions, not visual approval of the full repeated-impact transition. A recorded unobstructed close view and other species/directions remain pending.

## Unobstructed recorded run

Added a closer camera and canvas recording to the probe. Corrected the fixture durability override to magicHealth=200: 20 was below Attack damage (28) and made the first hit trigger retreat, invalidating a second target. This is fixture-only; production balance is unchanged. New run completes both impacts and releases physics with no errors; hyena-video-status.json binds the run. hyena-cycle.mp4 has no audio; contact sheet samples at 1 Hz. Reviewed two manifestations, repeated fall and return upright. Ground support is visually ambiguous in several samples from this elevated view, so this is not final acceptance of ground contact; inspect lateral view next. Other species and directions remain pending.
