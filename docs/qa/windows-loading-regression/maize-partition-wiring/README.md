# Isolated crop partition wiring freeze

Base `0a416fd3`. Candidate is OFF in gameplay and workflow defaults; only explicit smoke ownership plus `--smoke-crop-partition` selects it. The same Assets/CropPartition owner covers transition and World, with exact resolved URL byte estimates before the first manifest request. Original stages, full 40 states/32 bridges, renderer, readiness and fences remain. Previous hypotheses must be OFF. No CI/native/GPU trial, PR or promotion is authorized by this receipt.

54/54 directed tests pass using real Meshopt/GLTF decoding and image doubles. Build and package pass. All eleven published files match dist bytes exactly. The package lists 22 original manifest GLBs plus four nested partition GLBs. The generator-only write-if-different followup was covered by final tests; App/runtime code matches the completed build. JSON-module and large-chunk warnings remain in the original logs.

**Experimental size only:** coexistence adds 40,848,807 asset bytes (40,857,294 package bytes including JS). This +40.85 MB is not an acceptable final promoted package. Any later promotion must replace full runtime libraries rather than add partitions, preserve originals outside runtime, and audit all consumers/aliases/smoke preflight before removing files. Originals are deliberately untouched now. Minimal runtime manifest is 2,313 bytes; partition payload/header/manifest delta versus the original two runtime GLBs is only 4,011 bytes, a different scope from current package overhead.

No native texture/raster or timing/RAM benefit has been proved. Original desktop model preflight still requests original full assets. CPU tests of shared canonical texture identities do not substitute for native image validation. First-maize requested payload is 7,407,126 bytes excluding manifest; remaining species still load before full readiness.

SFX refresh changes only main source fingerprint and caller line offsets (+1). All126 rows, bytes and classifications remain. Original missing-test-path log is a preflight command typo, not runtime failure. Prior negative experiments and archived sources remain unchanged.

Run `python docs/qa/windows-loading-regression/maize-partition-wiring/verify.py` from the repository root. See receipt for source/log hashes and unchanged-source proof.
