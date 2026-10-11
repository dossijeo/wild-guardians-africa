# Retired crop anchors as geometric certificate references

This extends the conservative harvest-subset cache from `8d0ff9c3`. It remains an
experimental QA tool, not a production or campaign integration. The 100-night
campaign remains stopped.

## Physical basis and limits

A positive certificate stores native body-valid interior coordinates, an exterior
origin and 32 sampled service poses per target/radius. Removing a crop cannot
change terrain, solid obstacles, connectors or the certified service poses of an
unchanged survivor. The harvested anchor can therefore remain a **geometric
reference**, explicitly identified as retired; it is not represented as an alive
crop, new objective, harvest or transaction.

Reuse requires an ordered exact subset of original live crop geometry/IDs, all
original anchor IDs belonging to the originally certified crop set, finite
interior/exterior coordinates, and unchanged geometry/configuration/method
identities. Adding/moving/replacing crops, changing obstacles, removing every
crop, or using an unknown/nonfinite geometric reference invalidates it. Worker
service is still checked afresh. A negative animal certificate is never reused.
Retained counters describe original certification, never newly executed work.

This preserves the original certificate's scope: sampled native service poses
and positive closed components from its recorded exterior origin. It is not a
universal continuous-angle or all-possible-origins enclosure theorem.

## Native harvest progression

The five-second probe advances actual workers and deliveries from the preserved
v111 snapshot; it executes no player commands or fabricated harvests. Compared
with frozen `3161e728`, full native serialized state hashes, cash ledger counts,
RNG/state and final proof rejection match at all checkpoints.

| Simulated seconds | Live crops | Baseline proof ms | Candidate proof ms |
| ---: | ---: | ---: | ---: |
| 0 | 178 | 11,394.40 | 11,171.77 |
| 2.5 | 175 | 13,272.99 | 3.70 |
| 5 | 169 | 13,463.00 | 5.20 |

At five seconds the actual native harvest has removed anchor `plant-5148`.
Retained proof geometry and coverage match the candidate's original full animal
certificate exactly. Total observed wall time was 38.41 s baseline versus 11.45 s
candidate. These are sequential observations on one snapshot, not AB/BA or
whole-campaign acceptance. Full physical certificates are retained in the new
JSONL, alongside hashes, source hashes and explicit retired-anchor metadata.
All checkpoints still reject worker service with
`native-worker-centre-service-unproven`; reuse does not bypass this rejection.

## Independent Canyon recertification and unsuccessful test assumptions

The additional static Canyon fixture removes its anchor without claiming a native
harvest or income. Initial tests incorrectly required the fresh crop-only anchor
selector to return the same full result. It returns `no-clear-interior-crop`:
there is no remaining eligible crop seed, rather than a discovered escape route.
This divergence is documented, not concealed or treated as equivalent results.

To validate the retained coverage independently, the test constructs a fresh
native view, verifies the recorded interior/exterior body positions, and
recalculates all 32 service poses for every surviving crop and operational
structure at every animal radius from the recorded origins. Every fresh service
certificate is positive. State/ledger are unchanged by the queries.

After removing walls, retained coverage is invalidated and no positive verdict is
returned. In that seed-depleted fixture the reason remains
`no-clear-interior-crop`; it is not advertised as a proven escape route. The
separate original paid-wall open control, with eligible crop seeds, still detects
`native-animal-route-through-perimeter` physically.

68 focused tests finally passed, zero failures/skips. Earlier unsuccessful test
assumptions were corrected only after adding independent physical recertification,
not by suppressing the mismatch or weakening the coverage requirement.

```
node --test tests/static-animal-certificate-cache.test.js tests/native-integrated-perimeter-proof.test.js tests/native-paid-contour-proof.test.js tests/terrain-lattice-tile-candidate.test.js tests/terrain-validity-memo-candidate.test.js tests/native-reused-perimeter-v2.test.js
```

## Remaining acceptance work

Cold certification still costs seconds. New planting, geometry changes and paid
repairs need a representative short workload before the campaign can restart.
The existing worker-service rejection requires investigation as well. No 100-night
victory, economic calibration or player inactivity acceptance follows from this
experiment. The rejected terrain memo remains disabled.
