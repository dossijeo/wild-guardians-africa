# Camera orbit during active casts

Added opt-in `?orbitDuringCast=1` to the WorldScene QA fixture. It advances the camera orbit at .7 radians per simulation second only while a summon has an event. This tests motion during the cast, unlike the ordinary recorder's between-cast angle changes. The actual game's camera code is unchanged. Uses the installed broader-mantle GLB, with no candidate override.

Recorded day.webm and night.webm through Grabar día/Grabar noche, sound enabled. Adjacent JSON files contain runtime status. Day covers six Grow/Multiply commands, including a 300 ms replacement; night covers Attack and Shield, hyena/rhino and repeated hits. The existing QA fixture resets spell restrictions; these are not balance tests. Day uses presentation clock, night uses Game.tick during the recording.

Inspected the adjacent contact sheets at one-second intervals. Target effects remain visible through the moving views; night shows falls, subsequent recovery, and disappearance of the Guardian. Final night status has zero errors, one maximum visible Guardian, zero active summons/physics and zero roll failures. No fine-grained impact timing or subjective sound judgment is inferred from the sheets.

**Observed visibility limitation:** large orbit changes during a fixed-world summon can let the nearby building partially obscure the Guardian; the daytime close approach also clips it at the left image edge in one sampled view. This is not an all-angle visual pass. The summon retains its world location and does not follow the camera or teleport mid-cast. Further placement/visibility decisions must preserve that requested behavior. Recordings are evidence of the limitation, not justification to hide it. No new performance measurement is claimed.
