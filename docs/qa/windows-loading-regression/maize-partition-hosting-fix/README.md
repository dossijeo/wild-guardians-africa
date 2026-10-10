# Partition adapter hosting and identity followup

Source parent0edebfde. CropPartition.load resolves manifest through assetUrl before both json and constructor; constructor also resolves direct callers. All partition GLB/image URLs and exact byte estimates use that same manifest directory. This corrects the raw location.href-root base mismatch under nested itch CDN hosting.

Tests execute the original shipped assetUrl resolver with its module URL placed at https://cdn.itch.zone/html/9876/game/assets/index.js and https://tauri.localhost/assets/index.js. Document location deliberately differs from the CDN host. Actual GLTF+meshopt load checks manifest, first GLB and both texture URLs below the resolved prefix and expectedBytes before each request. Only image transport is doubled, no browser/native evidence. The Node loader replaces only import.meta.url in asset-url for the two module locations; resolver logic and all other loaders stay original.

cropIndex now independently requires integer0..7 and stage integer1..5. Five invalid examples preserve an otherwise valid40-element set of composite IDs (stage0/6, negative/>7/fractional cropIndex) and must reject. Cardinality/uniqueness and existing maize/full checks remain.

39/39 directed tests pass10261.3496ms, changed-source syntax/diff checks pass. No build rerun; previous build/package logs belong explicitly to the0ed freeze. No App selection, CLI/workflow change, asset publication, GPU/native/CI run or promotion. SFX inventory/scene/assets/diorama/compiler/progress/smoke/gates byte-identical0ed. Source/hash/log verifier is independent of the old integration receipt, which remains frozen evidence of0ed.
