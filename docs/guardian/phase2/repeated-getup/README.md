# Repeated Attack during get-up

The browser fixture now exposes Attack durante levantada. It loads the selected catalog beast, casts Attack through Game.cast, advances Game.tick, then casts again after authored recovery has run for more than .6 seconds. It waits for a new falling phase and complete physical release. The fixture resets cooldown and raises durability; this isolates interruption and is not balance validation.

Actual hyena run: second=true, entered=true, finished=true, errors empty, maximum one visible Guardian. Telemetry shows recovery continuing while the second projectile travels, falling on contact, then rolling/recovering and releasing physical ownership. See hyena-status.json. The 22 beast-combat-physics tests pass, including airborne/rolling/get-up repeat hits and shared-world recovery.

The on-screen control panel obscured the moving animal in this run. These are runtime state assertions, not visual approval of the full repeated-impact transition. A recorded unobstructed close view and other species/directions remain pending.
