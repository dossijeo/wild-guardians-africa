# Perimeter proof wall broadphase: no measured benefit

Experimental opt-in `wallBroadphase`, disabled by default. No live campaign, production navigation, military parameters or virtual-player policy changed.

The candidate installs a conservative radius-expanded envelope on the private hypothetical proof view. Distant solid walls may be rejected before the original exact native sweep. Nearby walls retain their original tests. Gates keep original bounds and frame checks; larger-than-configured radii fall back to the original broadphase. Changed wall position, yaw, scale or material rebuilds the cached envelope. No geometry is accepted merely because its envelope passes.

Two focused tests compare over 1,000 native point/segment answers, including diagonal walls, gates, worker/animal queries, large-radius fallback and edited geometry. The complete affected regression selection passes 34 tests with no skips: static certificate invalidation/coverage, the existing native stable-plan proof and the new broadphase cases. These are not visual or full-repository acceptance.

The AB/BA comparison uses the retained v115 Sabana native snapshot, 233 living crops and a native quote with one prospective wall piece. Each arm creates a fresh navigator and performs a complete cold proof, not a cached warm query. The actual quote is unchanged; the full physical certificate is deep-equal after excluding terrain execution counters; actual paid native construction produces an identical complete serialized state. All four certificate, quote and paid-state hashes match.

| Arm | Cold proof milliseconds |
| --- | ---: |
| Baseline A | 34,580.50 |
| Candidate B | 37,184.84 |
| Candidate B | 35,334.27 |
| Baseline A | 34,860.23 |

Mean baseline 34,720.36 ms; candidate 36,259.56 ms, approximately 4.43% slower in this observation. Concurrent campaigns and regression checks consume CPU, so this is not an isolated hardware or statistically conclusive regression benchmark. It nevertheless supplies no reason to enable the candidate: neither B observation beats either A observation. Preserve this negative result; do not restart or patch the campaign on its strength.

The live CPU sample remains the stronger evidence for the next structural investigation: certification of the prospective layout dominates the virtual defense quote. Review proof-view and certificate invalidation, especially navigation epochs and changing proposal/structure metadata. Do not weaken the native enclosure proof, skip worker service, fabricate protection, change player choices or use the previously rejected terrain memo without new evidence.

Reproduce with a fresh output:

```
node tools/benchmark-proof-wall-broadphase.mjs NEW_OUTPUT.json
node --test tests/static-animal-certificate-cache.test.js tests/native-stable-plan-perimeter-proof.test.js tests/proof-wall-broadphase-candidate.test.js
```

`benchmark.json` preserves frozen input/source hashes and exact comparison outcomes. Raw benchmark and test logs remain compressed alongside this report. No speedup, 100-night acceptance or production activation is claimed.
