# Populated volcanes: fixed saved state

Current Wild Engine opening, seed712, Mapungubwe,12 paid millet crops and2 paid workers,120 seconds ordinary simulation. Tutorial skipped for QA; no money, growth, terrain or navigation changes. No unavailable-route candidates in these two fixtures. Opening settlement, not an advanced campaign.

Run WG_FIXTURE_BIOME=volcanes with create-biome-populated-fixture-20261022.mjs then capture-biome-populated-frozen-20261022.mjs; audit-biome-populated-frozen-20261022.py volcanes. Twelve captures, day/night, normal/elevated/reverse, warmup/final, media1280x720. Pre-game-frame pause; exact saved elapsed and worker positions verified. Full far impostors and mountain background enabled. No page/GL errors; Mangrove coverage overflow zero (continuous coverage not applicable to Volcanoes).

Normal day/night inspected: dark fractured rock and ash retain relief around the settlement, warm roofs and daytime crops separate from the ground. Night crops are dimmer but distinguishable. Distant lava is very bright with a sharply defined border; this framing does not complete lava-edge validation.

Matched frozen-main captures in main-volcanes-populated-20261022. No performance claim from capture counters. Combined modest-profile costs, active play and moving shore/lava checks remain pending. No renderer or selected recipe changes in this pass.
