# Desert populated closure evidence

Current Wild Engine seed712, Mapungubwe, medium quality, frozen closure recipe. Native fixture purchases12 millet crops and hires two older women through ordinary game commands; advances120 seconds in0.1-second steps. Tutorial skipped for directed QA. No domain source changes, currency grants, growth overrides or terrain relocation.

Reproduce:
```
node tools/experiments/create-desert-closure-fixture-20261022.mjs
node tools/experiments/capture-desert-populated-closure-20261022.mjs
```
Vite must serve this worktree on5190; Playwright Chrome required. Browser storage is isolated. Capture pauses the loaded game and sets visual day/night times150/350; these are lighting comparisons, not natural campaign progression. Three identical camera poses per phase; warmup and native passes are repeat captures of the same selected recipe, not old/new variants.

Twelve captures completed without recorded page/GL errors, all far adapters ready and mountain backdrop enabled. Normal day/night images inspected: dune detail and cast shadows retained; planted rows and inhabitants readable. Some workers overlap in this static pose; motion remains necessary. Full background system active does not mean mountains appear inside every downward-facing framing.

This proves a populated opening, not an advanced campaign, animated worker correctness, performance, streaming or biome completion. No new timing claim. Prior empty-settlement benchmarks cannot be reused as populated-scene timings.

The older docs/qa/populated-raids/desierto.json passed snapshot validation but failed the app world-version gate. load-failure.json preserves that rejected attempt. We did not bypass compatibility or re-label the old terrain snapshot; the native fixture is newly generated.

|Pass|Light|View|Calls|Triangles|
|---|---|---|---:|---:|
|warmup|day|0|68|327478|
|warmup|day|1|60|303292|
|warmup|day|2|52|265225|
|warmup|night|0|68|327478|
|warmup|night|1|60|303292|
|warmup|night|2|52|265225|
|native|day|0|68|327478|
|native|day|1|60|303292|
|native|day|2|52|265225|
|native|night|0|68|327478|
|native|night|1|60|303292|
|native|night|2|52|265225|
