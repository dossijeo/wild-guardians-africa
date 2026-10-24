# Initial render callback ledger

QA-only onBeforeRender wrappers preserve and invoke existing callbacks, then restore them after capture. Three day stops0/192/0, same populated fixture and streaming path. Run tools/experiments/audit-volcano-draw-ledger-20261022.mjs. State/chunk/camera structural checks pass, with no browser/GL errors.

108 recorded mesh callbacks both before and after. Ignoring local positions (render origin differs), two descriptor multisets differ: unnamed Scene/Mesh/Mesh basic-material geometries change12048→12132 and6624→6240 indices. descriptor-difference.json records complete descriptors. These callbacks can include auxiliary passes; their net index difference does not reconcile the final renderer.info44-triangle difference. Detached shadow proxies added during rendering are not comprehensively covered. Do not treat this ledger as complete draw accounting or claim it identifies the streaming discrepancy. Further instrumentation should distinguish render passes rather than infer final workload from callback totals.

No production graphics changes, cache resets or performance claims.
