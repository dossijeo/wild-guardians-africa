# Native Mangrove shoreline streaming

Run `node tools/experiments/capture-mangrove-bank-native-stream-20261022.mjs`, Vite5190. Native option mangroveShore=sediment, no QA shader/coverage routes, observation only. Seed712/media/1280x720, two daytime settled 96-unit round trips, five stops each. Not a fast-streaming or timing benchmark.

All ten stops retain25 R8 shore masks and50 total registered masks. No captured errors. Previous controlled native owner test and QA live disposal counters complement this registry check; counts alone are not proof of absence of all GPU leaks.

Corresponding QA candidate frame comparison: exact camera/draw/triangle counts at all ten stops. Seven RGB frames pixel-exact. Cold far stop differs in3 pixels (maximum9/255); warm48-out/48-return differ in5 pixels each (max77/74). Mean absolute RGBA difference on0-255 scale: .0000100/.0001378/.0000795 respectively. Cause unisolated, not a blanket parity claim. Both origin/return poses are exact to QA, including previously documented cold-trip drift versus the first origin. Native streaming does not accumulate shoreline masks in this fixture.

Recommendation: retain native opt-in. Resource counts and image correspondence support the implementation; further seeds, rapid movement and whole-scene leak checks remain broader validation tasks. Next refreshed artistic review should include native River underlay and Mangrove shoreline together without modifying game defaults. Prior shader-cost measurements were QA, not a fresh native timing result. Global objective incomplete.
