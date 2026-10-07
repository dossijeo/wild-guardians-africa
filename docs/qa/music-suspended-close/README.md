# Suspended music cancellation

Native WebAudio proof at http://127.0.0.1:5191/tests/browser/music-suspended-close.html, 2026-10-07. Uses production AudioSystem, MusicWindowTransport, MusicWindowPool and both bank indices with synthetic silent buffers (not a perceptual Opus test).

Before: both banks retained non-null buffers on 8 cancelled native sources while suspended; they were cleared only after resume delivered ended. After: cancellation clears all 8 references immediately, pool PCM and active source counts are zero, and late ended remains safe. Suspending without cancellation preserves the source buffers. Each bank initially held 18,579,456 bytes in the pool. This verifies references and lifecycle; it does not measure physical process RAM reclamation. Native console had no warnings/errors.

The change only releases buffers for immediate cancellation while the context is not running. Planned stops and ordinary pause/resume preserve playback. 58 directed tests passed; the two new regressions failed before the source change. Native before/after reports and source hashes are adjacent.
