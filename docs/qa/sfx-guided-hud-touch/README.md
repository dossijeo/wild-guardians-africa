# Guided HUD touch — original SFX 093

The original `spirit_touch` cue accompanies opening Construir/Cultivar when the visible 2D tutorial hand actually indicates that HUD action. Eligibility is captured before opening the panel; successful panel opening dispatches once per action per game. Ordinary, unsupported and repeated selections are silent for this cue. Reset permits the guidance in another game. Delayed playback expires after 0.5 seconds, on panel replacement/closure, or scene reset. This does not replace the normal panel-open cue or alter gameplay.

The routing metadata and compressed aliases are regenerated. All 126 audio encodes remain the original previously verified Opus assets; only routing metadata/hash records change. Catalogue/code audit: 97 assigned, 29 reserved. No mechanics were invented for remaining alternative/reserved sounds.

Validation on 2026-10-07: 35/35 directed UI audio, tutorial hands/action pause and audio routing tests. Complete SFX runtime verifier passes 126 sounds and three metadata exports. Build passes with the existing large-bundle warning. Package verifier passes 641 files / 377,430,999 bytes, 859 relative links, 20 runtime GLBs without original duplicates.

Native browser fixture `tests/browser/guided-touch-audio.html` uses the production AudioSystem and UiAudio. Precached, silenced Opus decode: stereo, 48 kHz, 96,000 samples. Two guided cues start two native sources; ordinary/unsupported/repeated requests rejected, zero voices after stop and AudioContext closed. DOM report and screenshot retained; screenshot visually reviewed and tab closed. This verifies native dispatch/playback, not audible mix, cold decode, the full game's hand eligibility, or physical mobile/Tauri acceptance. No itch.io deployment.
