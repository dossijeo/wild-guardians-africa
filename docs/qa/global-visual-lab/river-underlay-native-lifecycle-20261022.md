# Native River underlay lifecycle validation

All three browser probes use native `riverUnderlay=persistent` with the global laboratory recipe. Only the world observation hook is routed; no shader, mask or coverage module replacements. Reproduce by running `capture-river-underlay-native-stream-20261022.mjs`, `capture-river-underlay-native-occupancy-20261022.mjs`, `capture-river-underlay-native-quality-20261022.mjs` in tools/experiments, then `audit-river-underlay-native-lifecycle-20261022.py`. Vite port 5190.

30 real 1280x720 captures, seed 712, media world renderer:

- Streaming: first daytime 96-unit round trip retains previously documented cold drift; second daytime trip returns exact RGB and mask hashes. No stale mask ownership. Settled stops, not fast-motion timing.
- Occupancy: normal center placement then maize plant command; CropPlaced sets dirty and normal world sync consumes it. 97 nearby accepted anchors become zero; crop-center mask becomes zero. Night captures are after the same daytime planting, not another event. Simulation rules unchanged.
- Quality/capacity: media/low/very-low/restored, forced capacity-one overflow/restored, hidden/visible. All six restored RGB frames exact after one render. Expected activation/ranges and immediate overflow fallback.

All probes have no captured console/WebGL errors. Machine-readable results are in river-underlay-native-lifecycle-20261022.json. These are lifecycle validations, not new benchmarks; accumulated timing counters during screenshots must not be interpreted as comparative performance.

Recommendation: retain the native opt-in underlay. Visual parity, actual planting, settled streaming and quality recovery now have native evidence. Next obtain native baseline/underlay ABAB cost before adding it to the shared artistic review recipe, then return to the remaining biome visual gaps. Other occupancy types, additional seeds and fast streaming are not exhaustively validated. Main remains unchanged and global mockup quality is not claimed complete.
