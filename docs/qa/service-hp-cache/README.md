# Non-geometric wall wear and CPU service certificates

This isolated branch tests one algorithmic reduction in the QA virtual player's
defensive proof. It does not alter production gameplay, military pressure,
economics or the active 21-night pilot. The original CPU path remains on the
balance branch. No OpenCL kernel is involved.

`nativeServiceComponentProof` reused successful per-target physical service
certificates, but included every structure's exact HP in its cache key. A wall
losing one HP while remaining intact invalidated all certificates, even though
its collision shape and service reachability had not changed. The candidate
omits HP while retaining the geometry epoch, structure status, position,
orientation, gate, material, scale and culture. A collapse or geometric edit
still invalidates the cache. New and moved crops still require their own
checks.

The native day-12 Sabana seed-123 snapshot has a completed paid contour. The
benchmark used the same restored state, navigator, quote and proof view for
four calls, subtracting one nonlethal HP from one intact wall between the
second and third call and restoring it afterward. Serialized state and
geometry epoch matched the input at the end. Proof reports were semantically
identical, excluding only a diagnostic count of shared region identities.

| Day-12 proof | Baseline CPU | Candidate CPU |
| --- | ---: | ---: |
| Cold | 1,137 ms | 1,293 ms |
| Unchanged warm | 2.6 ms | 2.0 ms |
| Same wall, −1 HP | **861 ms** | **1.5 ms** |
| HP restored | 2.8 ms | 1.6 ms |

An independent retained day-13 snapshot returned the same proof decision and
report after nonlethal wear; the candidate's cold call took 2,739 ms and the
HP-changed call 4.4 ms. The baseline day-13 value was not measured. These are
single-process local observations, not a whole-campaign speedup. The current
pilot's earlier timing log shows up to 10.8-second decision spikes every five
simulated seconds; this particular invalidation is one plausible contributor,
but the full policy also generates candidates, quotes walls and checks paths.

The directed service, funded-defense and reused-perimeter suites passed 25/25.
The new regression test confirms HP-only reuse and invalidation on collapse or
in-place gate change. Before promotion into the experimental balance branch,
compare full virtual-player decisions and state across a multi-day replay,
then rerun the long pilot on a frozen source. Do not infer 100-night acceptance
from this microbenchmark.
