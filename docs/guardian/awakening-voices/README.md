# Awakening V9 voices — 2026-10-29

Imported the two user-supplied original Opus recordings unchanged. Provenance, SHA256 and exact translated tutorial text are in content/manifests/awakening-spirit-voices.json.

Spanish: 28.086729 s, 155 cues, Rhubarb 1.14 phonetic recognizer. English: 25.207458 s, 121 cues, pocketSphinx with supplied transcript. Temporary mono 16 kHz WAV conversion is offline only. Runtime uses original stereo audio and its playback clock.

Reproduce: python tools/extract_awakening_voices.py PATH_TO_ZIP, then python tools/guardian/lipsync.py --rhubarb PATH_TO_RHUBARB --ffmpeg PATH_TO_FFMPEG. Optional --only spirit.awakening.es or spirit.awakening.en. Existing matching audio hashes retain authored cues.

The pipeline now includes original, agricultural and Awakening manifests. Six previously missing agricultural sequences were generated too. Release cue packing now accepts their named IDs instead of only ES/EN numeric IDs.

Validation: ten Node tests pass; production build passes. browser-checks.json records passing real HTML audio playback/paused seek for both new voices, audio-clock morph selection, neutral end state, all 62 clip durations and WebGL checks. These assertions do not constitute a full perceptual phoneme review; generated cues remain automatic-unreviewed.

node tools/check_spirit_voice_package.mjs verifies all 62 original audio hashes and packed cue sequences in dist. The general package validator stops earlier on the unrelated editable Blender provenance path content/source/actors/buffalo/expressive-candidate.blend in models.json; it is not reported as passing.
