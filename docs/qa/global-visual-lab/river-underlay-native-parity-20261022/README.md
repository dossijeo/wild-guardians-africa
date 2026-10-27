# Native opt-in River underlay

Enable the existing global lighting + continuous coverage + River soil recipe and append `riverUnderlay=persistent`. Absent this parameter, existing rendering stays unchanged. Only River soil accepts this option. No new assets, geometry or passes. Two small runtime modules own persistent accepted-tile raster masks; no runtime imports from tools/experiments.

Run `node tools/experiments/capture-river-underlay-native-parity-20261022.mjs` with Vite port 5190. Six native/QA pairs, seed 712, media, 1280x720, three cameras, day/night: ALL RGB pixel exact, calls and triangle counts exact, activation [1,48], no captured errors. The native arm routes only scene observation; material and coverage source replacements apply solely to QA. Failed preliminary harness runs hit duplicate import / outdated source anchors and were not retained as evidence.

`node tools/experiments/test-native-grass-underlay-20261022.mjs` checks native helper lifecycle and same-selection overflow recovery. Prior QA streaming, actual crop-event, quality and CPU benchmarks remain supporting implementation evidence; repeat browser lifecycle tests on the native route before claiming full integration validation. No new performance or six-biome art-completion claim. Default recipe is not changed yet.
