# Exterior whole-cohort connectivity

Frozen negative inputs are the original good/expansive seed712 pilots on main77cfb1ac, both day6/time600/completed5. Their preparation finished with a null entry; neither was a defeat or a timeout. Original gzip, preparation key, receipts and source metadata are preserved here. Uncompressed snapshot SHA256: good `f0b5facb3b0ec3454334d35aca8ee0c53b58bd27f1144d055315ef97c1a4c7e7`; expansive `03ceedf735adf8ac716d908a646ad495e76046e69d144aa9f24d81207bb51ce2`.

The old certificate required an exterior ray from every birth. Good exposes the reverse case: an exit can have a ray while its birth connects to it legally. Expansive exposes a shared root: one warthog birth has a ray, while the other warthog and buffalo have clear native segments to that same root at their respective radii. Failed rays are sufficient rejection of that certificate, not proof that the positions are enclosed.

## Runtime change

The selector retains the existing formation, positions, exits, radii and complete group. It first accepts either endpoint as a root if both endpoints connect with a native segment. Otherwise a deterministic directed graph uses only already selected births/exits. Each root is checked again at the current animal radius, including its native static footprint; each edge uses `Navigation.segmentClear(..., radius, null, false)`. A smaller animal never certifies a larger passage. No A*, arbitrary portals, actor thinning, RNG draws, movement overrides, save changes, terrain relaxation or teleportation are added. Candidate failure still uses the existing epoch/context memo and residency handshake.

The graph is a sufficient certificate, not a complete enclosure classifier: routes requiring bends away from these endpoints may still be rejected. A failed bounded proof is not converted into victory, defeat or quiet night. No long campaign was rerun.

## Bounds

Direct certificates use at most two roots and one connecting edge per actor. Extra graph work is capped at192 existing endpoints,128 extra root checks and768 extra directed edges across radius classes; graph edges are limited to24 world units. Each root may invoke the existing16 native rays. An expansion cursor ensures each reached endpoint is expanded once per radius, and local query caches avoid duplicate native tests. At most192 nodes per radius class are visited, so CPU iteration and memory remain finite; no graph survives the synchronous selection call. Groups beyond the graph node bound can still pass direct certificates; unresolved groups are rejected whole, never truncated. The current caller may test its existing finite candidate formations. These are algorithmic work bounds, not a frametime benchmark.

## Validation

`directed-tests.tap`:64/64 pass, including11 new contracts, native fluid/slope/solid rejection, narrower passage rejection for a larger radius, changed live wall, reversed root, multi-radius endpoint chain, graph bounds, exact frozen cohorts/RNG/spawn, six biome openings, topology, residency, worker preparation and CLI contracts. Existing topology assertions remained valid. `inventories-tests.tap`:5/5 pass. Build passed; Vite retains its existing chunk-size/dynamic-import warnings.

`node tools/probe-cohort-connectivity.mjs good --replay` and the expansive equivalent load each immutable original snapshot. Candidate JSON records certificates and bounded normal `Game.tick` runs at dt0.1, dt1 and dt0.1 with save/reload after5 simulated seconds. The cap is60 simulated seconds. Static native full-radius footprint legality is sampled for each living animal after every tick; this does not claim an independent swept proof of every movement or of newly installed paths. Native movement clearance remains authoritative. The original negative results are separate files and were not overwritten.

Expansive: all three runs finish night6 after16.9 simulated seconds; raid null/result null. Static checks296/28/296, no invalid footprint. Group and ordinary base births/exits remain unchanged. Good: all three runs finish night6 after50.7 simulated seconds; raid null/result null. Static checks645/63/645, no invalid footprint. Its accepted points are an existing projected candidate, not newly constructed graph portals.

No renderer, GPU measurement, performance claim, balance calibration or replay of the original long pilots forms part of this evidence. Test/build elapsed times are execution receipts only.
