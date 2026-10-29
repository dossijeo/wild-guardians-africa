# Guardian pose-layer correction: native night sequence

`night.mp4` is a 23.672-second native WorldScene recording with global AO and cinematic lighting enabled (savanna/Suajili). H.264 1600x900, 30 fps container, AAC audio; 11,424,294 bytes. Encoding at 30 fps does not establish 30 distinct game frames per second.

The existing `recordNight` fixture exercises hyena Attack, Shield, rhino attacks, camera changes and repeated hyena hits through recovery. QA resets spell cooldowns and may replace the selected beast; this is not production balance or a performance benchmark. Audio was unlocked and an audio stream is present; no full perceptual mix review is claimed.

The capture finishes successfully. `night-report.json` records maximum one Guardian, zero final active/visible/pending summons, zero physics bodies/active simulations and no errors. The final animal has no down state. The report is a post-recording snapshot, not a complete per-frame physics trace.

`night-sheet.jpg` samples every two seconds and was visually inspected: manifestations, knockdowns and return to standing are visible. The last black cells are contact-sheet padding. The strategic framing is insufficient for full detailed cloth/face approval, and sampled stills cannot prove smoothness between samples. A close continuous motion review remains open.

The corrected runtime restores the mixer's clean pose before additive wind/aim/point layers. This avoids accumulating transforms when the sampled pose has not changed. Original wind amplitudes and source clips are preserved. See `tests/guardian-pose.test.js` for the old-path reproduction, repeated samples/seeks, and installed-rig checks across four spells.

## Daytime companion

`day.mp4` (22.422 seconds, 15,828,157 bytes) records the existing Grow/Multiply sequence with camera changes and closely spaced final casts. It uses the presentation-only fixture clock, not full Game.tick, so crop maturation is not validated here. `day-report.json` records zero errors, maximum one Guardian, and zero final active/visible/pending summons. `day-sheet.jpg` was inspected at two-second sampling; its final black cell is padding. This is strategic visual evidence, not a fine cloth-motion or performance approval. The current face/pose/lap-pose checks also pass (10 tests); their coverage does not replace perceptual review of speech.
