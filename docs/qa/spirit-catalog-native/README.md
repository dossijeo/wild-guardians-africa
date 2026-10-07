# Native Spirit media catalog · 2026-10-07

Actual browser run of tests/browser/spirit-voice-catalog.html on http://127.0.0.1:5191, main0a65063 (runtime731cd8e). Production SpiritVoice and54 original Opus clips:27 Spanish and27 English. All54 start native HTMLAudio playback, reach at least0.05seconds, report finite duration and rate1, and stop/release their source without firing a message advancement.

The shortest measured clip ES_26 (2.312583seconds) additionally plays to its natural ended; exactly one callback fires and the media source is released. Browser console warning/error list was empty. Native JSON and source hashes are adjacent.

This is muted media lifecycle evidence. Only the shortest clip was played to completion; this does not certify complete playback of the other53, audible quality/mixing, network stalls, guardian UI transitions or a physical mobile device. No RAM/CPU savings are measured.

The additional fixture tests/browser/spirit-voice-complete.html plays every clip to natural completion. Its run was observed active at ES_02, with ES_01 completed; it is not counted as finished by this report. Total registered duration is744.759651seconds.
