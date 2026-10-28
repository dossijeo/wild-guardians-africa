# Scalar VFX packing: daylight visual check

Recorded on 2026-10-28 at c528f899f using the actual WorldScene fixture, production actor catalog and spell commands. UI: Activate sound, then Grabar día. This is a controlled scene with cooldown reset, not a campaign gameplay recording.

`day.mp4` is a 22.437-second canvas capture with an audio track. The sequence exercises Grow and Multiply, camera rotation, zoom and two closely spaced commands. `day-contact.png` samples it once per second. Review shows visible helical arrival ribbons, crop-directed energy and disappearance, with no obvious broken triangles or persistent Guardian in these samples. Full-frame continuous artistic/audio acceptance is still pending; an audio track does not establish a listening review.

`day-status.json` records zero errors, at most one visible Guardian and no active summon at the end. The daylight recorder does not exercise Shield or Attack. These and the broader occlusion/terrain matrix remain outstanding.

Validation: production build passed after registering the compressed olderMale asset; all 9 vfx-native tests passed, including source parity of all 18 compositions. This capture is not a performance benchmark. Moving-scene timing evidence is in ../moving-current/.

## Night check

`night.mp4` (25.077 s, 1280x720, video and audio) exercises Attack, Shield, camera rotation/zoom and repeated attacks using the same UI recorder. `night-contact.png` samples once per second. The reviewed samples show the protective dome, hand-to-target energy, rhino knockdown and the final hyena lying down then returning upright. They do not establish frame-accurate impact timing or anatomical quality from every angle. The fixture replaces the selected animal partway through the sequence; this is not proof of simultaneous multi-animal recovery.

`night-status.json`: errors [], maxVisibleGuardians 1, active summons 0, physical bodies 0, rollFailures 0. The trace includes existing spirit/audio events; mix quality has not been certified by listening. All 22 beast-combat-physics tests passed. Those tests ran during part of recording, so no performance conclusions should be drawn from this capture.
