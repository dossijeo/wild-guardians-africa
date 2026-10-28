# Scalar VFX packing: daylight visual check

Recorded on 2026-10-28 at c528f899f using the actual WorldScene fixture, production actor catalog and spell commands. UI: Activate sound, then Grabar dÃ­a. This is a controlled scene with cooldown reset, not a campaign gameplay recording.

`day.mp4` is a 22.437-second canvas capture with an audio track. The sequence exercises Grow and Multiply, camera rotation, zoom and two closely spaced commands. `day-contact.png` samples it once per second. Review shows visible helical arrival ribbons, crop-directed energy and disappearance, with no obvious broken triangles or persistent Guardian in these samples. Full-frame continuous artistic/audio acceptance is still pending; an audio track does not establish a listening review.

`day-status.json` records zero errors, at most one visible Guardian and no active summon at the end. The daylight recorder does not exercise Shield or Attack. These and the broader occlusion/terrain matrix remain outstanding.

Validation: production build passed after registering the compressed olderMale asset; all 9 vfx-native tests passed, including source parity of all 18 compositions. This capture is not a performance benchmark. Moving-scene timing evidence is in ../moving-current/.

## Night check

`night.mp4` (25.077 s, 1280x720, video and audio) exercises Attack, Shield, camera rotation/zoom and repeated attacks using the same UI recorder. `night-contact.png` samples once per second. The reviewed samples show the protective dome, hand-to-target energy, rhino knockdown and the final hyena lying down then returning upright. They do not establish frame-accurate impact timing or anatomical quality from every angle. The fixture replaces the selected animal partway through the sequence; this is not proof of simultaneous multi-animal recovery.

`night-status.json`: errors [], maxVisibleGuardians 1, active summons 0, physical bodies 0, rollFailures 0. The trace includes existing spirit/audio events; mix quality has not been certified by listening. All 22 beast-combat-physics tests passed. Those tests ran during part of recording, so no performance conclusions should be drawn from this capture.

## Rhino beside a wall

`rhino-wall.mp4`, `rhino-wall-contact.png` and `rhino-wall-status.json` extend the earlier hyena/buffalo wall coverage to the catalog rhino. URL recoveryDay=1&wallLow=1; select rhino and Grabar caida contra muralla. This uses the existing QA wall (10000 HP, delayed initial swing), real Attack and Game.tick. No audio was enabled after the page reload.

The run completes 12.121 simulated seconds through falling, rolling, recovering and walking, with 32 sampled structure-contact pairs, zero roll failures, zero final down actors and no errors. Contacts include nearby structures, not exclusively the wall. The one-second image samples show the rhino falling on the approach side and returning upright beside the wall; they cannot exclude small skin intersections. During rising the limbs visibly lift, and this wide low-angle view is insufficient to approve the exact foot support. No blanket obstacle or anatomical acceptance is claimed.

### Rhino get-up detail

`rhino-getup-detail.png` samples seconds 5–10 at 3 Hz. The crop improves leg/body readability but clips the actor at its right edge in some frames. Across 36 recovery samples, minimum sampled non-tail support is 0.0100–0.04685 m. At recovery age 0.083 s the forearm is the lowest sample while feet are still raised; by 0.532 s a foot is the support limiter. Later support transfers between feet and a hand. The reviewed samples do not show a gross root-height jump on returning upright. This is evidence for this one wall-side cycle, not a general all-vertex collision or slope certification.

## Four-impact lifecycle run and framing defect

`four-impact-status.json` reports 16.019 simulated seconds, four targets, peak three physical ragdolls and one baked fallback, one physical-budget rejection, zero final down actors/bodies/errors, zero hidden frames and maxVisibleGuardians=1. All four resume walking/attacking.

`four-impact.mp4` and its one-second sheet expose a QA camera defect: the non-wall trial inherited the previous low wall camera, leaving actors small/occluded. This recording is lifecycle evidence only, not visual acceptance of all four reactions. The fixture now restores its standard camera for non-wall physics trials. A new visual run is required after that fix. Capture is silent and contains diagnostic support sampling; no performance conclusion is drawn.
