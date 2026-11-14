# Close-view recovery review

Added `Detalle de apoyos` to the existing real-combat fixture. It frames the
animal more closely without changing the game camera or gameplay controls.
Recorded candidate-lion Attack cycles with lateral and elevated directions;
MP4s and full runtime JSON are included beside this note. Both completed eight
simulation seconds, reported no errors and released all physical bodies. The
lateral case resumed attacking; the elevated case ended walking.

The minimum sampled wrist target errors were 0.0480/0.0249 m (lateral) and
0.0457/<0.000001 m (elevated). These minima do not establish continuous palm
contact, nor should they be extrapolated to other species. The exact stored
trace separates falling, recovery and resumed AI.

Visual review of extracted frames confirms a forward fold, bent limbs, a
crouched intermediate posture and return to standing. The tail is kept clear
but its sweeping motion remains rather rigid. Hand placement and the transfer
of weight still need refinement; this review does not grant final artistic
acceptance. Some reviewed frames show the physical fall before recovery and
others the subsequent walking/attack. Recording timestamps must not be equated
to simulation timestamps; use the trace to distinguish the phases.

No audio was activated in these runs. No general fluency investigation or
paired performance conclusion was made. Earlier 33 targeted tests apply to
the unchanged production recovery code; the added fixture control passed
`node --check tests/browser/guardian-combat.js` and was exercised graphically.
