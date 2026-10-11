# Native planting invalidation diagnostic

The 100-night campaign remains stopped. These probes operate on separate
disposable copies of its frozen v111 snapshot. No simulation ticks, worker
deliveries or fabricated income occur. Each copy buys five mijo sprouts through
`Game.plant`, paying exactly 25 coins. Elapsed time and original campaign files
are unchanged. All proof calls assert byte-for-byte unchanged serialized state.

Two placement searches deliberately distinguish legal planting from effective
defensive enclosure. `bounds` scans the contour's bounding rectangle and uses
ordinary native placement/spacing rules. `interior` additionally chooses points
inside the outline at least four metres from its edges. This is a diagnostic
point-selection rule, not a gameplay constraint or crop cap.

| Case | Initial cold | Initial repeat | After one plant | Repeat | After five | Repeat |
|---|---:|---:|---:|---:|---:|---:|
| Legal bounds positions | 11044 ms | 51 ms | 2709 ms | 2445 ms | 2396 ms | 2423 ms |
| Interior positions | 10865 ms | 56 ms | 12708 ms | 36 ms | 13036 ms | 38 ms |

Both retain nav version 84: these particular placements do not suppress props
or alter terrain/obstacles. The alive-crop census change invalidates the positive
certificate nevertheless. Interior results remain valid; additions recertify
all targets, explaining the expensive observations. These sequential observations
are not AB/BA speed comparisons or browser/GPU frame measurements.

Bounds placements correctly reject with `native-service-route-open`. The first
new plant, plant-7367 at (76, -13), is reachable from an attack pose at approximately
(77.6046, -13.5616) with animal radius 1.1. A legal location and membership in a
bounding rectangle do not prove protection. Negative certificates are not reused,
so these identical failed retries remain expensive. Their evidence is retained,
not rewritten as an enclosed-farm success.

## Next optimization gate

Do not resume the long campaign from these timings. Investigate an incremental
positive certificate that rechecks new targets from the original exterior origins
and pose conventions only when all geometry, methods and prior target tuples
remain unchanged. New exposed targets must still reject; modified walls, terrain,
props, centres or moved crops must invalidate coverage. Worker checks remain
fresh. Any candidate needs comparisons against complete native certification and
negative controls before use in campaign policy.

The raw bounds report was produced by the initial tool revision before the
explicit mode and tool hash fields were added. Its source hashes and original
output are preserved. The interior report includes the current tool hash.

```powershell
node tools/probe-native-plant-certificate-cost.mjs STOPPED_V111_DIRECTORY FRESH_BOUNDS_JSON bounds
node tools/probe-native-plant-certificate-cost.mjs STOPPED_V111_DIRECTORY FRESH_INTERIOR_JSON interior
```

No economic equilibrium, worker productivity, human inactivity or campaign
survival claim follows from these placement/certification probes.
