# Reject actual water/lava landings between route samples

A coarse route is sampled every 0.25 m. On a synthetic flat field with a narrow
fluid strip at x=0.1, its five footprint probes all report dry, while a worker's
actual 0.1 m landing is wet. The previous worker guard classified that prefix as
non-risky and moved into it. The animal prefix cache had the same blind spot.
This is a reproduction using native Navigation/Game movement with a controlled
field adapter, not a reported physical-device or native-biome reproduction.

Both actor guards now query the actual requested landing's five footprint
positions. Workers already checking a risky slope reuse terrainValid, avoiding
duplicate fluid checks. Dry-classified workers check fluids only; animals also
check them when reusing a route prefix. No additional slope evaluation, route
grid, speed, terrain, rendering, save schema or allocation-heavy footprint list.
Dynamic body clearance retains priority. Worker rejection retains the existing
bounded avoided points; animal rejection clears the path for ordinary replanning.
Canyon water remains traversable. Minimal navigation adapters retain their
contracts. The helper protects landings; it is not an analytic continuous sweep
and does not prove that every possible narrow feature between two dry endpoints
is detected or that every animal detour completes.

Validation:

- Session75486 exited0:48 directed tests, including seven new regressions,
  cached animal prefixes, five footprint samples, both Canyon actor categories,
  dynamic blockers, native six-biome fluid query parity and slope recovery.
- Session77797 exited0:100 complete native dense-Sabana states remain equal to
  frozen V6, with112 paid workers and two paid clear-ground replants. The known
  steep connector still arrives in70 states, and63 subsequent warm/cold restored
  production states match exactly. Only the old experimental avoidance-field
  name is normalized for cross-version comparison; no normalization on the
  restored production comparison. This fixture has no active animals/incursion.
- Session12279 exited0:build and web package pass,701 files/859 relative links/
  20 runtime GLBs. Standard large-bundle warning remains.
- A finite search of6240 tangent candidates in native Sabana, Gran Río,
  Manglares and Volcanes fields found no matching alias with props excluded.
  Its negative result does not prove absence; the explicit positive regression
  is the controlled strip. This search is not navigation or visual acceptance.

Reports, exploratory scripts and build logs are archived with hashes. These are
selected-source receipts, not a complete dependency closure. Native equivalence
does not measure CPU/GPU cost, all-biome movement,100 nights, mobile or usability.
Up to five fluid queries are added per dry movement clearance; an end-to-end
performance saving is not claimed. Full CI is pending when this archive is made.
No itch.io publication.
