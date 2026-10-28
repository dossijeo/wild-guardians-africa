# Shield with the current Guardian at night

Recorded in the actual WorldScene laboratory with Game.tick enabled, using the existing night sequence (Attack, Shield, further attacks including repeated impacts and eventual retreat). Source state is the branch after e1a710460. The final status reports maximum one Guardian, no errors, no remaining physical bodies/worlds and the last hyena retreating. The status includes earlier commands; only its final six commands belong to this recording.

`casting.png` (about 4.6 s) shows the Guardian feeding energy into the forming dome beside the building. `established.png` (about 6.2 s) shows the dome after the Guardian disappears. The terrain remains visible through it. `shield.mp4` is the 3.2-second excerpt covering that cast with audio; audio quality was not independently evaluated. The nearby animal is recovering from the preceding Attack, not reacting to Shield.

This checks visible formation, coexistence with a recovering animal, retained barrier and disappearance in one nighttime camera setup. It does not prove every biome, hit location, protected building, barrier contact effect or performance target. No new production Shield VFX changes were necessary for this check.

## Laboratory clock defect fixed

The continuous presentation-only loop decremented spell remaining time and cooldowns, but the manual 0.12/0.02-second buttons only advanced state.elapsed. Consequently a manually inspected Guardian could animate while the barrier remained at time zero. This was a test-tool defect, not a production simulation defect.

Both paths now share advanceClock. With simulation enabled it uses Game.tick; in presentation-only mode it advances the elapsed clock, spell durations and cooldowns consistently. Status explicitly reports clockMode and each shield's remaining time / native visual age.

Graphical verification: freeze the fresh laboratory, cast Shield, advance five times by 0.12 seconds. `manual-clock.json` records remaining 19.4 seconds and visual age 0.6 seconds, with the dome and Guardian visible together in `manual-clock.png`. JavaScript syntax validation passes. Presentation-only mode still does not validate AI or gameplay simulation.
