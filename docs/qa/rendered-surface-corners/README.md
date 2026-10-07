# Three corners for rendered terrain sampling

The terrain-following helper used by work, attack, shield, agricultural and locomotion VFX, spell previews and independent mud sampled all four cell corners. A rendered one-unit terrain triangle uses only three. The helper now branches before querying the unused corner, retaining the exact interpolation expressions and order of the used queries. Terrain geometry, materials, shaders and fluid rules are unchanged.

All 23 directed tests passed: native height equality across six biomes and three seeds, signed cells, exact diagonals, raycasts against actual native ground geometry and chunk seams, independent mud position/normal checks, work effects and rebased shield/agricultural vertices. The new direct counter confirms exactly three surface calls per sample, versus four before. This tests pure terrain queries; callbacks whose answers depend on call order are not terrain samplers.

`benchmark.json` compares the exact helper from `eb9857bf` with the candidate. Two warm-up pairs and twelve alternating measured pairs per biome use 1,200 signed/fractional points, ten repeats per batch, seed 712 and warm native lattice caches. Each arm includes the same surface-call counter. All 7,200 initial native point heights match exactly. Four live background campaigns remained active.

| Biome | Reference median, ms / 12,000 points | Candidate |
| --- | ---: | ---: |
| Savanna | 24.205 | 18.283 |
| Grand River | 21.138 | 16.308 |
| Mangrove | 24.967 | 17.124 |
| Volcanoes | 19.585 | 16.967 |
| Canyon | 20.176 | 16.492 |
| Desert | 19.809 | 15.679 |

This is a local CPU reduction with 25% fewer surface calls, not a GPU, integrated frametime, FPS, RAM or physical-mobile result. It does not resolve the large-farm route or rendering spikes. `npm run build` passed with the existing large-bundle warning.

Reproduce: `node tools/benchmark_rendered_surface.mjs eb9857bf .cache/rendered-surface-benchmark.json`. The report retains baseline/candidate source hashes and every measured row; the baseline is imported directly from Git without changing production files.
