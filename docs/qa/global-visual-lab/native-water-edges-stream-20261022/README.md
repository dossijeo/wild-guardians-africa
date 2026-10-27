# Native shoreline streaming: six-biome short round trip

No QA water implementation is injected. Only scene observation is exposed. Native waterEdges=natural, regional palette, river soil bank and mangrove sediment shore enabled. Seed 712, medium, 1280x720; each biome follows 0/96/192/96/0 units in day then night, with river-following x offsets for River/Canyon. 60 real captures; no browser/WebGL errors.

The second/night loop returns to identical geometry/texture counts in all six biomes. Five night returns are RGB exact; Savanna differs by 10 pixels. This is a short warm return check, not proof of long-term leak freedom. Counts are not VRAM bytes.

First/day returns differ: River 7640 pixels, Canyon 4193, Mangrove 491252, Savanna 11687, Volcano 8216, Desert 1035. Resident resources and/or render origin change during initial travel. Causes are not isolated. Mangrove is a substantial discrepancy and must be investigated before claiming successful streaming parity. An unchanged Desert control also differs, so do not automatically attribute all variation to natural shores.

Maximum checkpoint settle durations (ms), day/night: River 503/442, Canyon 648/626, Mangrove 619/619, Savanna 491/485, Volcano 808/501, Desert 565/460. These include awaiting chunks/horizon and a render submission after a 96-unit teleport. They are NOT GPU timings, CPU frame times, or smooth-camera latency benchmarks; there is no A/B baseline here. They identify the need for separate measured construction and streaming work.

Reproduce `node tools/experiments/capture-native-water-edges-stream-20261022.mjs` then `python tools/experiments/audit-native-water-edges-stream-20261022.py`, with Vite on 5190. Audit records origins, resident counts and all settle durations. Next priorities: isolate the Mangrove daytime return mismatch, isolate the Volcano static LOD mismatch, then benchmark native steady-state/construction cost and evaluate the previously tested Canyon opaque core without abandoning the approved visual result.
