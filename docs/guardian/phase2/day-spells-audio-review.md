# Daytime spell/audio review

Revision 08dfc955b. Ran existing WorldScene controlled day recording with audio enabled: six casts, Grow/Multiply, scripted camera angle/zoom changes and final casts separated by 300 ms. This fixture uses real spell commands and rendering but presentation-only clock, resets cooldowns for stress and is not normal-menu gameplay.

Inspected 1 fps contact sheet: green Grow and branched Multiply effects, appearances/disappearances near crops and building, one visible Guardian including replacement of the final rapid cast. Status reports maxVisibleGuardians=1, active=0 at end, one slot reuse, errors empty. Fine cloth motion cannot be accepted from these sparse samples. Shield is not part of this day recording.

Audio trace reveals every requested spirit_disappear returned played=false, while isolated spirit_appear and spirit_power_activate played. Current AudioSystem has perEmitter=2 and refuses equal/lower-priority eviction. Presence and launch share guardian-world, so overlapping arrival/launch can exclude the priority-1 disappearance. A rapid replacement also rejects one appearance. This run is not audio acceptance; manage the single Guardian's presence voice lifetime without increasing global voice budgets, then re-record. The main-game presence callback uses the same family/emitter arrangement.

Retained files: day-spells-audio-status.json, day-spells-audio-review.webm (stream-copy remux), day-spells-audio-review.jpg. Original browser recording was 10,897,164 bytes. No performance attribution from this run.
