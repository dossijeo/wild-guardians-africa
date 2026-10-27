# Watering VFX: avoid unused scene-depth capture

Watering uses rigid 3D droplets and splash sprites. Its authored splash rings set `soft: 0`; no watering sprite samples the scene-depth texture in the existing fragment shader. Nevertheless, `WorkVfx` created water with the default `softParticleDepth: true`, so a visible ring made the scene render an extra full-depth pass each frame. `WorkVfx` now passes `softParticleDepth: false` only for `water`. Digging, harvesting, repair dust, animal effects and shields keep their previous behavior.

The [hardware ABBA audit](other-vfx-depth-audit/README.md) measured one water effect on a real Wild Engine Sabana/712 world in headed Chrome on Intel UHD/D3D11: the two soft arms had a median of their GPU medians of 28.40 ms, versus 20.14 ms for the two no-capture arms. A closer-camera repeat measured about 23.71 ms versus 17.90 ms. These are isolated render measurements, not a claimed campaign-wide FPS gain; another concurrent effect can still require the shared depth capture.

The regression test constructs the actual `WorkVfx` manager, samples every 1/30 second of the native 4.3-second watering effect, verifies that visible sprites exist but none has a soft fade, and checks that `prepare()` never requests capture. The fragment shader already skips the depth sample whenever `soft` is zero. This change therefore preserves the water effect's rendered shader behavior while eliminating an unnecessary pass when no other effect needs it.

Validation: `node --test tests/work-vfx.test.js tests/vfx-rendering.test.js` (20 passed) and `npm run build` passed. The initial close-up screenshots were on flat ground; contact appearance with other effects has not been generalized from this result.
