# Diorama upload comparison

Root completed an actual-menu A1/B1/B2/A2 comparison on runtime `41f57d03`, 2026-10-09. A uses the default upload; B enables only the opt-in diorama batch flag. The feature owner confirmed no local CPU/GPU job or source mutation during the arms. Viewport was explicitly 1280×720. All arms selected the same DOM slot ID `e93298c5-57bb-4671-bd0c-b43fd84fe35d` (day-one Sabana/Mapungubwe, 1.5K coins). Browser cache was retained and uncontrolled. The application may refresh autosave metadata; no identical snapshot-byte guarantee is claimed.

| Arm | Largest maize/soil synchronous submit | Preload receipt interval | Start-message receipt to cinematic restore | Largest recorded loading RAF | RAF >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 144.7 ms | 1682.9 ms | 15416.3 ms | 133.1 ms | 1 |
| B1 | 57.7 ms | 1783.8 ms | 16704.8 ms | 116.3 ms | 1 |
| B2 | 49.4 ms | 1824.0 ms | 16188.5 ms | 133.1 ms | 3 |
| A2 | 137.8 ms | 1952.7 ms | 16267.1 ms | 116.4 ms | 2 |

For B, the maximum is calculated from the 12 `loading-screen-upload-submit` spans contained by `diorama-upload-maize-soil-batches`, not all similarly named world submissions. The parent duration is awaited wall time, not exclusive CPU. All arms report completion without cancellation, verified readiness and no progress error. Every arm reached the normal HUD. Root retained reports and console logs, closed every temporary tab and reset the viewport; final browser inventory was empty.

Raw reports and root summary are in the feature QA directory `diorama-batch-abba-41f57d03-root/`. Preserve the `preloadToControlsMs` field, but do not interpret it as player loading wait: it includes time spent by the operator in the Continue menu. The existing loading RAF collector begins after preparation and cannot prove uninterrupted frames throughout preload. A1's initial menu wait was interrupted by an agent message before starting the loading arm; no arm was restarted or excluded.

The larger submit is reduced in both orders. Total post-start wait is not consistently improved: B1 adds 1288.5 ms (8.36%) relative to A1; B2 is 78.6 ms shorter than A2. B1 fails the predeclared tolerance of a regression exceeding both 5% and 500 ms in either paired order. Transfer union also differs (A1 1402.9 ms, B1 1705.2 ms; B2 1551.8 ms, A2 1541.5 ms); these four observations do not prove that the batch flag caused the whole time difference. Do not subtract overlapping awaited phases to manufacture acceptance.

During the comparison, the user explicitly clarified that 50–60 ms pauses are near an acceptable compromise and that avoiding longer local loading matters. This informs the engineering decision; it does not erase the original measured result. Keep the candidate opt-in while reviewing readiness attribution, and avoid further blind rounds pursuing zero stalls. A separate current-main/current-feature V4 comparison and outstanding production QA remain required before the loading feature's PR.

Frozen-source Validate game run `37913182993`, head `41f57d037d79d4a2f5925b04bb77a2f926279e25`, was authoritatively running its full test step at review time. Earlier checks passed; the run is not yet a complete CI acceptance.
