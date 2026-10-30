# Guardian presence audio lifecycle

The existing lifecycle already handles these cases; no production audio change was needed. Added integration tests through the actual AudioSystem sound/play/buffer/voice paths (only Web Audio nodes and decoding are controlled). They cover stop during a pending decode, reopening with the cached buffer, out-of-order arrival/launch/dissolve decoding, and idempotent stop disconnecting sources and gain nodes. Combined presence/combat-audio run: 13 tests passed.

The browser fixture `tests/browser/guardian-presence-lifecycle.html` uses the installed SFX bank and real Web Audio at 48 kHz. Its 19 assertions passed: cold cancellation, three arrival/launch/dissolve/replacement/stop cycles, no retained voices after each stop, and a closed AudioContext after disposal. Saved browser.json and screenshot. This validates resource lifecycle and admission; it is not perceptual audio mix acceptance, full game navigation coverage or a performance benchmark.
