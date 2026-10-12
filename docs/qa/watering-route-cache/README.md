# Exact watering approach cache — experimental checkpoint

Branch `codex/watering-route-cache` starts from experimental recovery source
`14109b6c`. It must not be merged wholesale into production main: that ancestry
contains unapproved balance changes. No live campaign or main-based regression
source is patched by this experiment.

The current live CPU capture identifies watering approach selection inside
native task reservation as a dominant sampled stack. This candidate caches
only exactly repeated geometric watering queries. The underlying algorithm is
unchanged; its uncached source is frozen in the reference fixture, with its
original hash and only import paths adjusted.

Admission requires a real integer navigation epoch and a state identity.
Exact worker/target coordinates, body radius, crop identity/species and avoided
terrain form the key. Navigation version, state, terrain, obstacles, suppression,
prepared-path identity and query implementations form the invalidation context.
Adapters lacking an epoch bypass caching. Epoch changes during a query prevent
its admission. Both null and accepted answers are reusable; every returned
accepted route is copied so movement cannot consume the private cached path.

The cache is limited to 8,192 entries and 20,000 retained path points per
navigator, uses WeakMap ownership and stores no worker/crop object references.
Queries beyond the point limit are not retained. It changes no task ordering,
worker speed, growth, pay, purchase, crop resistance, powers or animal rules.

## Directed validation

- 42 watering, physical approach, building route and cache tests pass.
- After extending the two actual Canyon fixtures with a new enclosing solid
  and its removal, all eight cache tests pass again.
- Native repeats and reload match the frozen uncached destinations/waypoints.
- New solid placement invalidates an accepted route; removing it reopens a
  native swept-body-valid route.
- Tests cover mutable path isolation, failed-query reuse, exact input changes,
  epoch/world replacement, changed query functions and bounded storage.

Logs preserve the original bytes in gzip; readable copies normalize line
endings only. This is neither a completed campaign nor a GPU/render benchmark.

## Acceptance still pending

Measure AB/BA query costs and retained memory with representative dense
workloads, including unreachable targets and a moving crew. Verify native
task assignment and domain-state parity in a short paired replay. Broaden
dynamic geometry/biome coverage and confirm cleanup under repeated worlds.
Do not claim whole-campaign acceleration or integrate before that evidence.
The existing reference/recovery campaigns retain their original dependencies,
RNG and frozen policies and continue independently.
