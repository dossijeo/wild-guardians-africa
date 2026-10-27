# Dominant regional attachment input cost

Controlled live diagnostic: far-region attachment max 22.410 ms. Nested far-ground-water-input max 16.595 ms; biome material attach 3.210 ms; vertex normals 1.550 ms. Constructor wrappers emitted no >=1 ms window sample. No page/console errors or dropped attribution rows.

Water-input wrapper includes choosing/allocating the array and the fallback loop querying field.waterInfo for every ground vertex when data.water is absent. This identifies the dominant stage, not yet a proof that worker preparation produces equivalent values or improves whole-frame time. Next inspect producer payload and reproduce equivalent water classification from authoritative native terrain in the worker, or eliminate unused work only if shader equivalence is proven. Previous rejected water experiments must be reviewed before implementation; no automatic adoption.

Preserve native-water-mask shading, shoreline, day/night, context lifecycle and source revisions. This run changes instrumentation only. Timing is synchronous wall time, not GPU execution. Raw reports and provenance archived.
