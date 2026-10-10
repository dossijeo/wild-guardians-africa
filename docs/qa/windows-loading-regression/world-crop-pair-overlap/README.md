# World steady/bridge pair overlap — isolated candidate

Source base 9cc3ba2f. Run 38022286170 trace is archived by root, not repeated here. Its load-animal-models 15024.6ms already includes Promise.all + decode/rig preparation, not serial species. AnimalPreload.create performs skeleton clone/actions/bounds after model resolution; no existing span isolates that CPU from delivery. loadCropBridges traverses/validates32 templates after Assets.model; its14982.4ms is an awaited complete-source interval, not measured exclusive decode or CPU.

The trace shows load-crop-model3202.6ms finishing BEFORE load-crop-bridges14982.4ms starts. Those complete crop libraries are independent once the model catalogue is available. This candidate starts both in the current crop stage, observes both failures immediately via Promise.all, and joins BEFORE any40template clones, batch creation, GPU submission or adoption. Individual labels remain load-crop-model and load-crop-bridges; new load-crop-pair-join is a parent interval, not additive time. Metadata retrieval is inside the bridge task before that individual phase. No earlier animal prefetch, upload overlap, union, window, image chain, asset split/cache, quality or gate changes.

Only internal property World.loadingCropPairOverlap=true selects it; default absent is OFF and its original order is source-equivalent. For a later reviewed native trial, proposed activation is a new smoke-report-guarded CLI boolean setting an App World option. This freeze DOES NOT wire Rust/App/workflow or launch CI. Existing trace selection could capture the three spans during a subsequently authorized trial. Original90/300000/900000 gates must remain.

Potential opportunity is no greater than this trace's approximately3.2s steady tail (metadata and contention may reduce/eliminate it). It does not remove the15s bridge source itself. Concurrent parse can raise peak decoded memory and contend with delivery; no native RAM/timing claim. Assets owns originals/cache/late resources; the helper neither clones nor disposes shared resources. Cancellation through real World.loadReady prevents late adoption; both promises are observed so rejected siblings do not leak unhandled rejections. Real Assets+meshopt New/Continue tests retain40/32 and identical request counts; prepared maize is reused with four unique physical partitions and canonical Texture identity. Dispose remains exactly once in real owner tests.

43/43 directed CPU tests PASS3418.5691ms; build11.80s; package720files445281741B/860links/24GLBs, unchanged payload set (+526B JS from prior freeze). Node image doubles do not prove visual raster. The initial full-source invariant caught an encoding corruption introduced while editing scene.js; scene was restored from exact UTF-8 Git bytes and the narrow hunks reapplied. Original negative log retained, final exact-source test PASS. No corrupted source was dispatched/published.

Tests: node --test tests/world-crop-pair.test.js tests/crop-partition-lifecycle.test.js tests/assets-lifecycle.test.js tests/world-load-cancel.test.js tests/sfx-catalog-audit.test.js

Verify: python docs/qa/windows-loading-regression/world-crop-pair-overlap/verify.py

No new CI/native/GPU/PR/promotion; pending root review.

A controlled deferred calendar (3 and15 abstract units) verifies serial completion18 versus pair15, and bridge start3 versus0. This proves scheduling only, not measured hardware performance; production clocks are untouched. Historical f738 resource-overlap altered the entire diorama dependency graph and failed with40s bridge awaits; this candidate changes only World steady/bridge joining and cannot infer benefit from that earlier trial.
