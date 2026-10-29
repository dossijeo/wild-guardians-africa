# Real-game Attack audio run: failure retained

Revision 63cb33cdd, explicit qa-attack-gameplay save, seed 712, day 5, one rhino. Normal HUD Power > Attack > world click, paused only while preparing; recording then ran continuously. `attack-main-audio-failure.webm` is the original browser recording (5,200,155 bytes); ffprobe confirms VP9 video plus stereo 48 kHz Opus audio. This proves audio inclusion, not perceptual synchronization acceptance.

Observed one Guardian/vortex and beam contacting the rhino. After recovery the game stopped advancing at 00:42 and showed `Native attack intention rejected: -4`. Screenshot: attack-audio-native-error.png. Browser stack: spatial-intent-bridge.js registerAttackIntent line 468, wrapper 1523, raids.js updateRaid 965, game.js tick 1624 / advanceReal 1638, main.js frame 592.

Native source nav_intent_register_attack returns -4 when the prior actor intent is not animal or is still ActionActive. The failed call comes from approach re-registration. This narrows investigation to intent lifecycle reconciliation; it does not yet establish whether recovery, a subsequent strike, or another transition leaves the stale active intent. Do not suppress the native invariant or claim this run passed. Fix and repeat before acceptance.
