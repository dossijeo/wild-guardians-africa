# Populated Savanna: fixed saved-state visual review

Current native opening,seed712,Mapungubwe,12 paid millet crops and2 paid workers,120 seconds ordinary simulation. No money/growth/terrain overrides. QA pause before first gameplay tick; saved elapsed exact in all12 captures. Media,1280×720,day/night,normal/elevated/reverse views; full far impostors and mountain backdrop. No page/GL errors or coverage buffer overflow.

Normal day/night inspected: continuous grass retains visible fibers and warm color by day, cooler readable ground at night. Crops and workers remain distinguishable; settlement clearing remains visible. Foreground tree partially occludes lower-right view. This is an inhabited opening, not a complex late-game performance test. Selected graphics unchanged. Further active movement, combined cost and final main comparison validation remain required.

Reproduce with WG_FIXTURE_BIOME=sabana: create-biome-populated-fixture-20261022.mjs then capture-biome-populated-frozen-20261022.mjs. Audit using audit-biome-populated-frozen-20261022.py sabana. No timing claims from captures.
