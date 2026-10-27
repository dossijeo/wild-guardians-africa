# Native opt-in cultivated soil

Enable cropSoil=local together with visualLab=global-lighting and riverSoil=1, Gran Rio continuous coverage only. Defaults and globalClosureQuery unchanged. No Engine/simulation/navigation changes.

Scene-owned masks preserve borrowed base bytes; clone only visual data. Initial chunks stamp current crops. Confirmed CropPlaced/CropPicked/CropDestroyed events invalidate masks and coverage cache; no crop scan on unchanged frames. Removal handles already-deleted records. Replaced/released chunks restore original data, and disposal unsubscribes. Two lifecycle checks plus six existing grass/water/leaf tests pass. Tests cover event wiring, removal, references, replacement and disposal, not real long-distance streaming or update-cost bounds.

12 native captures, same saved state/poses/workload as QA candidate, no recorded errors. Exact RGB comparison passes4/12; remaining frames have isolated residual pixels. Final day normal2pixels(max6/255),elevated8(max39),reverse0; night normal4(max4),elevated8(max36),reverse0. Day-normal amplified difference inspected: isolated pixels beside building, not broad soil displacement. Cause not isolated; do not claim pixel identity. Strict compare script intentionally fails its RGB identity assertion and writes equivalence.json. Captures still reproduce the visible soil candidate, but exact equivalence remains unproven.

Candidate retains earlier QA cost caveat: daytime+1.8–3.9ms GPU observed, nightmixed, no new draws/geometry. Native event-update CPU and streaming validation pending. Keep optional, not selected. Original dense grass and Mangrove pigment unchanged. Source crop-soil-mask.js and continuous-grass.js; capture-river-crop-soil-native-20261022.mjs reproduces images.
