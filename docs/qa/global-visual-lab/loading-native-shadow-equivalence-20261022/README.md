# Native shadow cache image equivalence

Fixed actual wind-clock and orbit pose: cached and forced-refresh day/night outputs are pixel-identical. Cache uses 6 draws/16002 triangles; refresh uses 7/29882. No JS errors. This verifies same-pose image reuse, not dynamic cache validity for all future scenes. See the accompanying motion benchmarks for refresh behaviour.
