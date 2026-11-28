# Native recovery contact cost profile

Measured on 2026-10-30 at `d1e59afaa`, using the opt-in `profileRecovery=1` browser fixture on `lightingReview=1`. Receipt: [native-recovery-cost-profile.json](native-recovery-cost-profile.json).

The actual authority reports `spatial-wasm`. Four hyenas receive sequential commands; the fixture resets cooldowns. All four recover and resume walking/attacking; maximum visible Guardians is one. Three physical ragdolls and one baked fallback are active at peak. This is a diagnostic stress sequence, not normal cooldown balance or continuous visual acceptance.

Inclusive method measurements:

| Method | Calls | Total ms | p95 ms/call |
| --- | ---: | ---: | ---: |
| Authored recovery pose | 392 | 994.86 | 3.690 |
| Solid-contact resolution | 730 | 1789.45 | 3.475 |
| Peer bounds refresh | 730 | 131.12 | 0.410 |
| Full contact skin envelope | 730 | 802.30 | 1.475 |

These rows overlap and must not be summed. Solid resolution is also used outside the authored pose method, which explains its greater call count. No cloth-contact calls occur for these hyenas. The full skin envelope alone occupies about 45% of the inclusive solid-resolution time in this run; sparse ground/contact sampling and other work account for the remainder, but have not yet been independently timed.

Next investigation should target contact sampling inside `BakedSolidContacts.resolve`, retaining the exact full skin envelope needed to prevent penetration. The evidence does not justify reducing anatomical accuracy or skipping collision checks. `physicalSnapshot` was not separately profiled; it is not established as the bottleneck.

Whole-frame p95 is 82.155 ms; recovery-follow p95 is 8.780 ms. Instrumentation adds overhead, and this is neither a paired benchmark nor evidence of a performance improvement. Audio was inactive. No production code or textures changed. General engine performance remains outside this focused investigation.
