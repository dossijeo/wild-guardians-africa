# Authored water/lava depth extraction

This integration takes only the audited coverage recipe from diagnostic source
`5042f9b7`: `african-toon.js`, `depth-recipes.js` and `standard-depth.js`.
The water/lava constructor now registers its authored hook and closure-owned
clip uniforms by default. The stock depth shader preserves the original
transformed/batched/instanced position and half-open clipping rectangle. It
omits the color lighting/noise recipe from the world-depth pass. Color and shadow
recipes, simulation, scene lifecycle and readiness gates are unchanged.

Unknown/replaced compile hooks, forged cloneable metadata, missing clip bindings
and existing rasterization exceptions retain the conservative original route.
The depth cache remains source-owned, with borrowed maps/uniforms preserved.
No smoke globals, menu pause, shared-ground/prefetch/parallel options, probe,
workflow or CLI changes are included in the extraction.

[Original native evidence](windows-loading-regression/37979419199/review.md)
retains the same-executable control, New and Continue reports and verifier.
Both candidate runs compare28 actual offscreen depth cases: water/lava,
disabled/inside/outside/moved clipping and plain/instanced/batched/morph/skinned/
displacement forms. All56 comparisons have zero mismatches and nonempty/clear
coverage. The control also passed. Menu pause was enabled in all diagnostic
arms, and order/cache/seed differences prevent a causal speed or timeout-fix
claim. This native evidence is for the explicitly enabled recipe, not an
executable built from this new production-default extraction.

Root independently verified the raw artifact hashes and native archive. The
extraction passes65 directed contracts, including all120 biome material alpha
recipes, source properties, actual Three uniform uploads and restoration after
errors. One previous preload test expected the full-color fallback; it now
asserts the intended shared coverage-only material, original restoration and
source-owned disposal instead. The new tests omit the old smoke-flag acceptance
condition and keep unknown-hook/metadata rejection. Source `colorWrite` remains
temporarily false under the existing capture transaction and is restored.

Build passes in10.45s. Web package passes with711 files,445251479 bytes,
860 relative links and22 runtime GLBs; changed-file syntax and diff checks pass.
These are build/check measurements, not runtime speed, GPU or memory benchmarks.
Original-config Windows CI and integrated visual/performance acceptance remain
to be checked after the production commit. The earlier CI failure at83% in
rendering-resource preparation remains a negative, not approval of this change.
