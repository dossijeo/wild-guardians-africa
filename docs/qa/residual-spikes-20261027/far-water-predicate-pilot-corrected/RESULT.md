# Native fluid predicate — correctness pilot, acceptance pending

The existing native spatial view defines fluidInside as core.fluidLevelAnywhere(x,z)>0. waterInfo obtains the same value but additionally queries shore and, for Manglares, the wetland mask. This differs from the historical JavaScript TerrainField boolean experiment; its Manglares gameplay fallback remains unchanged.

Seven tests pass using the shipped synchronous WASM across all six biomes at resident/remote coordinates before and after settlement changes, plus native-call-count/NaN semantics. A separate verifier test checks sampled ground and explicitly zero-valued seam attributes and rejects actual mismatches and vacuous seam-only scenes.

The first real-game pilot failed its verifier: it incorrectly compared the seam's intentional zero attribute with terrain occupancy (592 mismatches among8584 vertices). Raw failed report remains in sibling far-water-predicate-pilot. configureNativeFarSeamGeometry and farGroundSeam identify the distinct bridge semantics; the corrected verifier still asserts exact zero values there.

Corrected 720p medium Manglares run passed with no page/console/request errors. Candidate source served once. Exact live attribute comparison:6114 sampled vertices,1005 wet/5109 dry,2470 seam vertices, zero mismatches. The readback checks ran after the measurement window. Water-input synchronous durations8.540ms loading and8.160ms streaming; overall corresponding attachments21.930/18.325ms. Single candidate timings are NOT comparative savings or whole-frame acceptance. Production is unchanged; only QA browser source overrides replace the specific predicate.

Performance gate: after the game process completed, six independent Windows engine samples at20:19:29–20:19:40UTC report Codex/ChatGPT3D activity83.87–92.04%; DWM7.92–9.94%, Firefox appears in the last two. Counters are per-engine, not additive whole-adapter utilization. Therefore do not launch another local GPU acceptance ABAB under these conditions. Earlier user request to minimize/close animated previews is still unresolved. This observation cannot retroactively assign all variability to the host, but establishes current competing activity. Do not kill the Codex host.

Reproduce correctness pilot: node tools/experiments/run-far-water-predicate-abab.mjs <fresh-output> --pilot. Removing --pilot runs ABAB only once a controlled host is available. Needed before adoption: full-frame/tail/throughput comparison and original/candidate screenshots; no claim of overall fluency or final acceptance yet.
