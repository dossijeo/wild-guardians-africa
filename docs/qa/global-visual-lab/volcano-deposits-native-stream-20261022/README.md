# Native volcanic deposits: streaming control

Reproduce: `node tools/experiments/capture-volcano-deposits-native-stream-20261022.mjs`, Vite port 5190. Seed712/media/1280x720, baseline and native volcanicDeposits=broad, offsets0/48/96/48/0, two daytime trips and one nighttime trip. Thirty settled real frames. Live chunk synchronization retained; this is not continuous-video motion or streaming-latency timing.

No captured console/GL errors. All paired camera/target/time/draw-call/triangle/mask-count checks pass. Both variants keep25 ground masks at every stop. Warm daytime and nighttime returns are RGB exact for both variants. Cold first return differs in11131 pixels baseline (RGB mean absolute delta.004946,max52) and8935 candidate (.004083,max51). Cause remains unisolated; not exclusive to candidate.

Resource counts stabilize after first trip: baseline returns124 geometries/59 textures, candidate124/56 on both subsequent trips. Initial counts differ between browser sessions and this study does not establish a texture-memory saving or a complete leak audit. No new candidate-owned buffers/textures exist in the implementation.

Far settled daytime frame inspected: warm deposits remain interspersed with fractured dark rock and existing plants beyond the village. Retain opt-in. General cold-return differences and continuous temporal artifacts still require separate investigation; do not interpret settled endpoint stability as proof of smooth fast traversal. Benchmark evidence remains the prior resident ABAB study.
