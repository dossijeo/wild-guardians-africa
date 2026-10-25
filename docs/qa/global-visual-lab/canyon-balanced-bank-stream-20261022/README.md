# Balanced Canyon bank streaming checkpoints

Medium1280x720, seed712, full backgrounds checked at every capture, day/night. River-following targets at0/96/192/96/0 metres; chunks and far world prepared before ten screenshots. These are discrete settled checkpoints, not a continuous camera-motion recording or a streaming performance benchmark.

No recorded page/GL errors. Calls43/58/50/58/43 and triangles376345/451684/335405/451684/376345 return exactly both phases. Camera/target also return exactly. RGB return differs4314 pixels day and12 night. Original-bank control started separately to investigate this residual; do not attribute it to shoreline or declare parity yet.

192m daylight image inspected: bank remains continuous with no transverse dry cuts. Terrain shadow contrast retained. Geometry counters day158→94 and night96→94; textures82→72 and72→72. These counts alone do not prove absence of leaks; no explicit disposal audit here. Timing in captures includes waits and is not GPU cost.

Reproduce: node tools/experiments/capture-canyon-balanced-bank-stream-20261022.mjs. Optional WG_BANK_VARIANT=original removes QA opacity route; WG_REVIEW_OUT selects separate output directory. Production source remains unchanged.
