# Canyon populated fixture: generic camera rejected

Current Wild Engine opening, seed712/Mapungubwe, 12 paid millet crops and two paid workers, 120 seconds ordinary simulation, tutorial skipped. Three placement candidates raised SpatialChunkUnavailable and were skipped/recorded in native-fixture.json; no navigation rule changes. All final selected crop placements pass route checks in both directions. This is an opening scene, not an advanced campaign.

Run WG_FIXTURE_BIOME=gran-canon with create-biome-populated-fixture-20261022.mjs then capture-biome-populated-frozen-20261022.mjs. Audit script passes 12 frames with exact saved elapsed/worker positions, full backgrounds and no errors. The fixed generic camera used in other biomes is unsuitable here: normal/elevated views lie beyond the canyon wall and obscure the crops. Reverse view is informative, but do not treat this set as normal-view artistic acceptance. Successor gran-canon-populated-native-camera-20261022 reuses this exact fixture with nativeCameraPose along the canyon, leaving the renderer and world intact.

No CPU/GPU timing claim from static capture counters. Water appears in the scene but camera obstruction prevents a complete inhabited-bank review in this set.
