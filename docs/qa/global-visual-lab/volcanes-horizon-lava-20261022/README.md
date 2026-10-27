# Rejected horizon-material hypothesis

QA replaces only the NativeHorizon water-material callback's hardcoded lava=false with the Volcanoes biome check. Uses the same10 day/night streaming stops as volcanes-populated-roundtrip-20261022. Run audit-volcano-horizon-lava-20261022.mjs and compare-volcano-horizon-lava-20261022.py.

All10 matched baseline/candidate stops have identical camera,target,origin,chunks,time,elapsed,calls and triangles. Image differences are0–3pixels,max channel delta9, within the previously observed tiny control residuals. No errors or state changes.

Full source inspection of NativeHorizon.update reveals the callback is unreachable in Volcanoes: geometry is generated only for canyons/desert. Thus the apparent false-lava flag is not the cause of distant lava differences. The QA candidate is rejected and no production change is made. This is a negative diagnostic, not an optimization or graphical improvement.
