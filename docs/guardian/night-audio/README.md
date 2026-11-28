# Night sequence with runtime SFX

Recorded from revision 916f60405 using `guardian-combat.html`, with sound enabled and catalog models (`faceCandidate: false`). The controlled WorldScene fixture runs real simulation movement, Attack and Shield commands, model animation and VFX. It uses its existing navigation fixture and resets cooldowns for the sequence; this is not a normal campaign or a balance proof.

`combat-night.mp4`: 23.667 s, H.264 / AAC, 1600x900, 30 fps, 4,846,093 bytes. The WebAudio output was connected to the recording stream. Inspected frames at 1.4, 14, 20 and 23 s show the energy connection, airborne hyena, recovery and resumed retreat. The Guardian's broad cloth motion remains in the sequence. No blanket claim is made that every deformation/contact is visually acceptable.

`runtime.json`: six casts, maximum one visible Guardian, no recorded errors, no roll failures, final hyena retreating, zero physical bodies and zero active physics entries. The audio trace confirms actual source creation for species hurt cues on hyena and rhino, contact sounds, launches and disappearance. Hyena retreat is played once only after the final recovery. One consecutive appearance request did not produce a source; the trace does not distinguish the admission/cooldown cause. No subjective listening-quality assessment is claimed.

The observed physics maximum was 18.105 ms and final hyena setup 10.30 ms. Recording overhead and this single run prevent a performance comparison; this is not evidence that the remaining performance budget is satisfied. Large raids, all species, slopes and other angles remain separate coverage requirements.
