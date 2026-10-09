# Integrated regression — 2026-10-09

Root ran the following tests on main `be2c7529`, after the library/Spirit PR
and raid-camera approach implementation were integrated:

```powershell
node --test tests/spirit-ended-presentation.test.js tests/guardian-voice-close.test.js tests/spirit-voice.test.js tests/raid-camera-entry.test.js tests/raid-camera-travel.test.js tests/raid-camera-terrain.test.js
```

Result: 65 tests passed, zero failures, cancellations or skipped tests;
exit 0, duration 26803.8913 ms. Terminal session 18814 completed naturally.

Coverage includes audible-message retention through real actions, media ended,
manual replacement/closure, stale callbacks, unavailable-media fallback,
moving animal approach, arrival, interruption, and terrain clearance across
the six biomes. The 54 registered voice clips also match their byte hashes.

These are directed automated tests, not a new listening, mobile-device,
performance or full-campaign acceptance. Native four-lab navigation and
voice evidence remain in this directory; native camera evidence remains in
`../raid-camera-approach.md`. No production code changed in this regression.
