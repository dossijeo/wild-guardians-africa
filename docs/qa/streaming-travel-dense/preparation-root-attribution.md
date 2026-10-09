# Preparation root attribution

The `streaming-travel.html?trace` diagnostic now records the root identity for
each synchronous `renderer.compileAsync` invocation. `native-merged` identifies
the actual `world.assetGroups.root`; `standby` identifies the named owned tree
backup bank. Other roots retain UUID, name, type and direct child count for
inspection. This is an invocation counter, not a count of newly compiled shader
programs, completed preparations, or GPU compilation time.

The earlier 5b113c18 chunk-phase run recorded 218 compileAsync invocations,
eight far-data adoptions and fifteen new chunks. Its trace cannot retrospectively
identify the caller of those invocations. A new native run is required; do not
assign all 218 to region generation or infer a shader cache failure.

Source inspection shows three preparation routes in attach-native-far-world.js:
new far representations, owned standby banks, and resident merged color batches.
Resident proofs are tied to immutable packing, material/geometry identities and
origin/context generations. Moving-camera LOD selection can legitimately revoke
such proofs even without adding chunks. Skipping a preparation or weakening its
identity checks therefore requires transition and lifecycle regression evidence.

The diagnostic adds plain root metadata only when trace is enabled. It performs
no GL queries, subtree scans or scheduler changes. Reported cpuMs still covers
the synchronous call only. It does not measure completion of the returned
promise. Syntax validation passed for this fixture; native attribution remains
pending while the loading-screen AB/BA run owns the GPU slot.
