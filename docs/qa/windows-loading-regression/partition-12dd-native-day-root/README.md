# Official partition executable: CI failure and local visual evidence

The exact official Windows executable built from `12dd78a2` in run `38019388562` was downloaded and matched against the artifact API's SHA-256. That run failed the unchanged 90-second world readiness gate at 87%; its original report remains archived as a failure.

The same executable was subsequently launched on the local Windows machine with `--smoke-report` and `--smoke-visual`, using a new isolated WebView2 profile. This local invocation completed readiness in 17,042.7 ms and exited successfully. Four actual diorama canvas images show initial, intermediate, late and mature maize. The profile was created on disk. Neither the machine difference nor the extra PNG readback/encoding permits a causal timing comparison or explains the CI failure.

Visual inspection: all four plants are present at initial and mature stages. Mature plants retain leaves, stems and ears, with no obvious missing surfaces from this captured angle. Soil edges merge into warm haze; mountains, particles and central lighting are visible. The images exclude the HTML loading interface, so they do not prove text layout, cancel-button visibility or UI composition. This run does not exercise manual planting, portrait, cancellation, night lighting or all biomes/cultures. Production readiness remains unproven.

`receipt.json` indexes exact source report bytes, original failure, local success, artifact digest and exported images. Run `python docs/qa/windows-loading-regression/partition-12dd-native-day-root/verify.py` to verify retained bytes and results.
