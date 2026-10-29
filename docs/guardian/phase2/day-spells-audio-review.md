# Daytime spell/audio review

Revision 08dfc955b. Ran existing WorldScene controlled day recording with audio enabled: six casts, Grow/Multiply, scripted camera angle/zoom changes and final casts separated by 300 ms. This fixture uses real spell commands and rendering but presentation-only clock, resets cooldowns for stress and is not normal-menu gameplay.

Inspected 1 fps contact sheet: green Grow and branched Multiply effects, appearances/disappearances near crops and building, one visible Guardian including replacement of the final rapid cast. Status reports maxVisibleGuardians=1, active=0 at end, one slot reuse, errors empty. Fine cloth motion cannot be accepted from these sparse samples. Shield is not part of this day recording.

Audio trace reveals every requested spirit_disappear returned played=false, while isolated spirit_appear and spirit_power_activate played. Current AudioSystem has perEmitter=2 and refuses equal/lower-priority eviction. Presence and launch share guardian-world, so overlapping arrival/launch can exclude the priority-1 disappearance. A rapid replacement also rejects one appearance. This run is not audio acceptance; manage the single Guardian's presence voice lifetime without increasing global voice budgets, then re-record. The main-game presence callback uses the same family/emitter arrangement.

Retained files: day-spells-audio-status.json, day-spells-audio-review.webm (stream-copy remux), day-spells-audio-review.jpg. Original browser recording was 10,897,164 bytes. No performance attribution from this run.

## Presence voice correction

Added shared world-Guardian cue ownership: one presence slot (arrival/dissolution) and one launch slot. Replacement stops only the previous voice in that slot, invalidates delayed decode completion and preserves caller freshness checks. Main-game presence callback and controlled fixture share the implementation; AudioSystem routes spell-release events through the launch slot. Global mixer limits and portrait lifecycle remain unchanged. Rapid new summons intentionally truncate the superseded world-presence/launch tails.

First browser retry with only presence ownership admitted all four isolated disappearance cues, but the final rapid pair still rejected disappearance because two launch voices occupied the emitter. That partial solution was not accepted. Added launch ownership too; 25 focused audio/presence/portrait tests pass, including six rapid casts under a two-voice limit. Final two-slot implementation still requires another browser recording. Build passed for the first presence-only revision (13.36 s); it is not a build receipt for the subsequent launch adjustment.

## Final two-slot browser retest

At 4a7dff316 repeated the same controlled day sequence. All 17 requested cues report played=true: six arrivals, six releases and five disappearances (the interrupted penultimate cast has no separate disappearance). The last rapid pair is approximately 300 ms apart. Maximum visible Guardians remains one, final errors empty. Inspected contact sheet confirms the same Grow/Multiply appearances and replacement with no duplicate Guardian in the sampled frames. The recording still uses presentation-only QA timing and deliberate camera/zoom changes; it is not normal-menu gameplay or a cloth-quality acceptance pass.

Evidence: day-spells-audio-fixed.json, .webm and .jpg. Audio admission is verified; no perceptual mix/cut-quality claim. Final production build passes in 11.79 s with existing warnings.


## Night retest: audio passes admission, physical roll remains rejected

Same revision 4a7dff316, controlled WorldScene night recorder: five Attack casts plus Shield, scripted camera/zoom and a final repeated hit on the same hyena approximately one second later. Unlike the daytime run, the recorder advances Game.tick during the night sequence. It resets cooldowns and spawns selected beasts for QA; this is not normal campaign input. Its finally block returns simulate to false, explaining the final status field.

The JSON contains the preceding 17 daytime audio rows plus 29 new night rows. All 29 night requests report played=true (17 Guardian cues and 12 animal/impact cues). Hyena and rhino damage cues occur in falling; the final hyena retreat cue occurs in retreating at simulation time 3159.764235, after physical ownership ends. Maximum visible Guardians is one; final active bodies/worlds are zero and runtime errors are empty. These establish admission and cleanup, not perceptual audio quality.

The recovery is NOT accepted: rollFailures=1 and lastRoll records timeout after 3.516667 seconds, angular error 2.597606 radians and angular speed 4.293434, with zero contact grace. The manager selects BeastRecovery rather than AuthoredBeastRecovery after this timeout. The contact sheet shows eventual recovery/flight, but this does not satisfy the requested physical roll into the authored stand-up. Investigate the final repeated-hit hyena with continuous pose/contact diagnostics; do not increase the timeout or weaken completion tolerance without evidence.

Evidence: night-spells-audio-fixed.json, .webm and .jpg. The video is a stream-copy remux of the browser recording (original 10,036,930 bytes). The contact sheet samples once per second, so it cannot establish every contact or transition. maxStepMs=23.065 in this run is an isolated maximum, not a comparative performance result or attribution.
