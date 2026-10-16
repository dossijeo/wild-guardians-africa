# Live-crop command scan audit

The saved `plants` array retains dead crops for history. Before this change, wall quotes tested every historical crop for each proposed module, and center placement, planting, hiring, harvest grouping, daily task rebuilds, agricultural events and attraction checks also traversed that history to find living crops. These operations now use the existing append-only active-crop index. The saved array and economic rules are unchanged. Historical records remain available to persistence and agricultural-power validation.

`node tools/experiments/benchmark-live-crop-wall-quote.mjs [historical-count]` compares frozen `main` commit `d474328d` with this branch on the same Sabana/123 state: one live crop, a 51-module wall quote with one gate, and a configurable number of dead crops. The script alternates A/B/B/A after warming each arm and asserts the same module count, gate count and 510-coin price. Four observations per arm on this host gave these medians:

| Historical crops | `main` | Candidate | Interpretation |
| ---: | ---: | ---: | --- |
| 0 | 15.21 ms | 16.20 ms | About 1 ms slower in a tiny fixture; too small to attribute confidently. |
| 5,000 | 18.13 ms | 15.76 ms | 13% lower quote latency in this synthetic case. |
| 50,000 | 42.95 ms | 16.38 ms | 62% lower quote latency in a stress case. |

These are wall-quote measurements, not campaign speed estimates. The 50,000-record case stresses scalability and is not claimed to be a typical farm. The regression test also gives a dead crop throwing coordinate getters: the resulting wall plan remains identical without reading those coordinates.

Validation: 191/191 playable tests, 68/68 directed tests across crop indexing, idle anchors, harvest, hiring, wall gates, center placement and spells, and the web build passed. A broader 214-test selection passed 211 tests. Its three failures were existing golden/balance assertions in `core.test.js` (two) and `raid-composition-index.test.js`; the same files were already identified as failing on `main` in the native-intent baseline triage. No full campaign or Windows physical-device test is claimed for this change.
