# Native mixed-wall reconstruction in the browser

Verified on `4a407eb`, using `tests/browser/boundary-gates-world.html` in the in-app browser at 1280 × 720. This is an isolated WorldScene fixture with actual terrain, models, gate leaves and worker animation. It does not open or modify saved slots.

The ordinary 1500-coin opening pays for the centre (800), millet seed (5), the native 50-piece thorn perimeter (500), removal/refund of two neighboring pieces (+20), adobe and stone replacements (35 + 80), and one older male worker (30). The resulting balance is 70. No money, growth or income overrides are used.

The original thorn gate keeps its identity and health. After removal of two adjacent pieces and after each replacement, the report records exactly one door. Its preservation also survives snapshot serialization. The two replacements render as adobe and stone, without becoming doors.

`worker-waiting.png` shows the worker waiting at the closed gate. Native simulation ticks then open the leaves and execute initial care, growth, harvest pickup, carriage and delivery. The final report records one delivered crate and 81 coins: the 11-coin crop income occurs on delivery. `perimeter-after-delivery.png` and `door-after-delivery.png` retain the rendered result. Page error events, rejected promises and browser console errors are empty.

The fixture pauses simulation between its explicit advance buttons so the evidence can be inspected. These screenshots do not certify physical phone performance, finger drawing, the production HUD flow, or every material/biome combination. The separate domain tests cover all five door materials and the native Grand Canyon contour case.
