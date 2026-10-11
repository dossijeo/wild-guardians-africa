# Exact boundary graph CPU optimization

Experimental branch only. No prices, attacks, RNG, collisions, gate-placement preferences or campaign results changed.

Bounded CPU profiles of twenty faithful native ticks and five identical quotes on restored v86/v90 snapshots identified the recovered boundary graph as the dominant sampled quote cost. Tick profiles included terrain and worker processing; the sampled quote hotspot does not explain all cumulative campaign CPU time. Raw tick/quote profiles are retained beside each snapshot. Instrumentation adds overhead and cold initialization/JIT differs from live gameplay.

`boundaryFaces` now rejects segment pairs with disjoint conservatively expanded bounding boxes before executing the **unchanged** crossing and endpoint narrow phase. Node lookup uses local spatial buckets but still chooses the earliest original node within the exact original distance threshold. Unrepresentable cell indices retain the original full scan. Pair order, cuts, edge order, face order and numerical predicates are preserved. `tools/prepare_boundary_faces.py` generates the optimized implementation reproducibly; running it twice produced identical bytes.

The original recovered implementation is preserved byte-for-byte in `tests/fixtures/boundary-faces-reference.js`, including its existing line endings. Its hash matches the frozen campaign implementation. New tests compare full outputs against it across 180 deterministic mixed graphs, epsilon-adjacent joins, T junctions, crossings, reversed order, negative coordinates, earliest-node ties and distant-coordinate fallback. These three differential tests and 52 native gate/river/cliff/repair/reconstruction tests passed. The production web build passed in 10.42 seconds (existing bundle-size/import warnings remain). No visual/gameplay acceptance is inferred from the graph tests.

## Warmed AB/BA graph comparison

`tools/benchmark-native-boundary-faces.mjs` reconstructs augmented geometry from the retained snapshot, native quote and boundary edges. It verifies all frozen source hashes; the only permitted native source difference is the explicitly recorded `src/world/boundary-faces.js` candidate. The original fixture must match the archived implementation hash. Twelve pairs alternate original/candidate and candidate/original order after warming both. Every result must exactly equal the original, and inputs and simulation state remain unchanged.

| Geometry | Wall / virtual segments | Faces | Original median CPU ms | Candidate median CPU ms |
|---|---:|---:|---:|---:|
| v86, Sabana, seed 123 | 81 / 181 | 10 | 10.536 | 1.895 |
| v90, Gran Canyon, seed 712 | 60 / 202 | 16 | 9.365 | 1.792 |

This is approximately 81–82% less CPU for these graph inputs. It is **not** an 81–82% reduction in complete quote, campaign, frame or GPU time. Geometry derives from a native quote including proposed pieces; it is not a claim that every internal intermediate of that quote is benchmarked. Preserve both negative stopped campaigns and successful 21-night campaigns. Next: measure complete decision/tick cost and rerun the affected short native pilots with frozen candidate sources before any main integration.

Reproduction: `node tools/probe-native-daylight-cost.mjs DIRECTORY FRESH_OUTPUT 20 5 profile` on its matching historical source; `node tools/benchmark-native-boundary-faces.mjs DIRECTORY FRESH_OUTPUT` on the candidate with the exact reference fixture. Both refuse output overwrite. Profiles and graph benchmark JSON include snapshot and tool hashes.
