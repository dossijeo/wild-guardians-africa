# Main-game retest after native interruption fix

Runtime revision ed873f251 (5cad06d12 behavior). Fresh seed-712 QA save, normal main menu and HUD, Power > Attack > rhino surface click. Paused for preparation only; recording then continued for twenty seconds without additional gameplay input. Single Guardian visible at impact. The previous native -4/-2 failures did not recur; HUD progressed from 23:37 through 00:57 and later 02:35, then paused normally. This verifies continued simulation for this scenario, not the entire raid matrix.

Video `attack-main-audio-retest.webm`: 19.978 s, 12,013,457 bytes, VP9 plus stereo 48 kHz Opus, remuxed without re-encoding from browser download (12,014,023 bytes). It excludes DOM HUD and tutorial narration. Audio inclusion is verified; perceptual audio timing/mix review is not claimed.

Inspected the 1 fps contact sheet: Guardian/vortex at the start, rhino partly obscured beside the building initially, supine/roll around 6-8 s, recovery around 9-10 s, standing and moving afterwards. Sampled poses are insufficient to certify every-frame ground contact or unobstructed fall quality. Framing changes around 12-13 s without an explicit camera input during recording; cause remains unverified and camera behavior is not accepted by this run.

Console contained an isolated MutationObserver non-Node TypeError at 04:04:14.499Z with no source URL/stack; do not call the entire console clean. No native attack/crop rejection appeared after the cast. Screenshot after recording and HUD text are retained alongside video. The native-WASM regression separately proves the old committed-intent defect and its corrected lifecycle.
