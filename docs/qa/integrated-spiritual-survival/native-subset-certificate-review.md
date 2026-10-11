# Conservative certificate reuse after native harvests

The 100-night campaign remains stopped. This experiment advances a copy of its
preserved day-9 snapshot for five simulated seconds, with actual native worker
movement, harvests, deliveries and RNG. It issues no player commands. Production
and the stopped campaign are unchanged.

## Candidate and safeguards

A positive animal-access certificate can cover a surviving subset of its crop
targets when every survivor retains its exact ID, coordinates, species and centre
association, ordering is preserved, every original exterior anchor target is
still alive, and all geometry/configuration/method identity checks still match.
Removing a target cannot introduce a new service pose for an unchanged survivor
under these conditions. New, moved, reordered or replacement targets invalidate
the cache. Removing an anchor or every crop also invalidates it. Worker access
is freshly checked on every call, including cache hits. Negative animal proofs
are never reused.

Retained certificates explicitly report the original target count, current count
and removed IDs. Their pose counters describe the original certification, not
newly performed work. No old counter is presented as fresh execution evidence.

## Native comparison

The baseline imports the three original certificate modules directly from git
commit `3161e728`; other engine modules match the candidate. Both runs start from
snapshot SHA-256
`a7a7d012f02004f07b9e3f2c22e9d8087ccd0d5f436f80abd1df708a9208ee7e`.

| Simulated seconds | Live crops | Baseline proof ms | Candidate proof ms |
| ---: | ---: | ---: | ---: |
| 0 | 178 | 11,394.40 | 12,856.30 |
| 2.5 | 175 | 13,272.99 | 4.92 |
| 5 | 169 | 13,463.00 | 13,084.98 |

Every full serialized native state hash matches at all three checkpoints,
including transactions, worker state and RNG. Both proofs continue to reject
with `native-worker-centre-service-unproven`; cache reuse never bypasses that
rejection. Certification is separately asserted read-only on every invocation.

The second checkpoint reuses coverage after three nonanchor harvests. The third
requires full recertification after an anchor is removed. Total observed wall
time was 38.41 s baseline versus 26.25 s candidate, but this is a sequential
single-snapshot observation, **not** a statistical AB/BA performance result or
whole-campaign acceptance. Five native simulated seconds needed only 132–139 ms
of engine ticks; repeated certification remains the dominating cost.

The improvement is useful but insufficient to resume the 100-night campaign.
Cold proofs, anchor changes and new plantings still cost seconds. The worker
service rejection also remains unresolved; it is not an economic defeat.

## Reproduction and validation

Run `tools/probe-short-native-recertification.mjs` with the stopped campaign
directory, a fresh JSONL path, and `baseline` or `candidate`. Compare the results
with `tools/compare-native-subset-recertification.mjs BASELINE CANDIDATE OUTPUT`.
All output files require fresh destinations to preserve historical evidence.

49 focused tests passed, zero failures/skips:

```
node --test tests/static-animal-certificate-cache.test.js tests/native-integrated-perimeter-proof.test.js tests/native-paid-contour-proof.test.js tests/terrain-lattice-tile-candidate.test.js
```

Coverage includes subset reuse, invalidation, worker checks on cache hits, paid
completion, restoration on errors and exact terrain lattice queries across six
biomes and three seeds. An initial test invocation used a nonexistent filename;
the corrected invocation above ran successfully. Raw before/after JSONL and the
machine-checked comparison are committed alongside this review.
