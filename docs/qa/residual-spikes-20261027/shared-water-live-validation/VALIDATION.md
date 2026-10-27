# Shared water implementation: live validation

Day run completed at ab189e0d5 after extracting the shared implementation. `waterVisual` reports 23,364 identical bytes (99 x 59), zero changed bytes, 23 cooperative yields, resident chunk 2,0 and no captured page/console errors. The actual game screenshot `1-baseline/water-bank.png` was inspected: water banks, ground, vegetation and building shadows remain present without an obvious hole.

This is a functional differential check of the same live geometry and terrain field. The screenshot is a candidate bank view, not an independent original/candidate pixel comparison. It does not establish a new performance gain. The directory's `baseline` suffix comes from the unrelated depth-matrix flag; `WG_CHUNK_WATER_BED=1` in provenance is the authoritative evidence that the water candidate is active.

The subsequent night check sets simulation time to 420 only after the benchmark window and pauses simulation for the bank inspection. It tests the night rendering of the same prepared data, not night raids or active nocturnal simulation.

Night result: 23,364 identical bytes, 25 yields, chunk resident, time 420, no captured page/console errors. Screenshot inspected: darker night palette and water highlights present, banks and ferns preserved. This remains a paused visual check, not active-night gameplay acceptance.
