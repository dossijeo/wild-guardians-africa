# Release package audit — 2026-10-30

This audit does not close Guardian acceptance. Main remains fully contained in the working branch; PR217 is open, unmerged and reported mergeable.

The current built distribution contained 1,063 files and 594,164,705 bytes. Two visual-lab textures are referenced only by tools/experiments: cliff_side-nor_gl.png (5,658,685 bytes) and canyon-soil-solar-arh.png (2,397,715 bytes). They are now excluded by the existing QA_ONLY_GROUND_FILES release filter. Originals remain in public. The production canyon diffuse, desert sand normal/color and gameplay material paths remain packaged. Searches covered src and public JS/JSON/HTML/CSS; the package verifier also checks compiled scripts for references to excluded assets.

After rebuilding: **1,061 files, 586,108,305 bytes**, a reduction of **8,056,400 bytes** without model or texture changes at runtime. Production build passes (16.80 s, existing warnings). Resource checks reach the file-count gate, which **fails** at >1,000 files; the measured bytes also exceed the unchanged 500,000,000-byte budget. No successful release package is claimed.

Four of five web-package unit tests pass. The remaining failure is the existing all-GLBs-must-shrink assertion: source assets/a4aa5ace262a69b815558f2c9b655fee3a933173d62724de2faca384655560b1.glb (the installed Suajili center in destruction.json) is 1,605,588 bytes; its runtime encoding is 1,635,504 bytes. The existing compressor expands the embedded normal from 33,088 to 398,444 bytes, color from 221,370 to 286,594, and data map from 32,258 to 83,456. No thresholds, manifest figures or texture fidelity checks were weakened to hide this failure. Investigate retaining original image encodings when conversion expands them, with decoder and pixel verification, before changing this asset.

This is package-size evidence only, not runtime GPU memory, visual acceptance or global frame performance. The separately assigned baseline-engine investigation is untouched.

## Suajili compression correction

The compressor now retains an original PNG/JPEG/WebP only when conversion was lossless, the original is smaller, dimensions remain within the existing 2048 limit, and a decoded RGBA comparison proves exact pixel equality. Reviewed color-recipe baselines are deliberately retained. Texture references support mixed standard JPEG/PNG and EXT_texture_webp; the verifier checks both and requires byte-identical originals for retained images.

Only the Suajili center was recompressed in this change: 1,635,504 → 1,270,148 bytes (365,356 bytes saved). Its normal-map encoding is retained verbatim from the original. Color and ORM embedded bytes are identical to the previous runtime GLB. All 1,317,008 decoded geometry bytes remain exact; the local decoder and Khronos verification pass with zero errors. Six focused compression/package tests now pass, including the formerly failing all-model shrink assertion. The texture-size and pixel-fidelity guards have explicit negative tests.

Native spatial-WASM WorldScene loads and renders the center with zero captured errors; screenshot: [runtime view](suajili-compression-runtime.png). This screenshot verifies loading/material completeness, not a pixel-identical whole-frame comparison. Production build passes (17.70 s, existing warnings). The resulting distribution remains over budget at 585,743,311 bytes and 1,061 files. Broader package optimization remains open; no change to gameplay, model geometry, material parameters or image-generation backlog.

## Exact embedded-image duplication audit

The existing release plugin already consolidates all lip-sync JSON records into one bank; no additional saving was claimed there. A read-only GLB scan (`python tools/guardian/audit_shared_images.py`) finds 17 groups of byte-identical encoded images, with 35,118,182 bytes of theoretical duplicate payload. Full file/image/hash inventory: shared-image-audit.json. No assets were changed. External image reuse would require GLB buffer/view rewriting, relative-URL loading checks and package verification; it would also add up to 17 files, worsening the current file-count limit. This is a measured optimization opportunity, not an achieved saving or a passing package gate.

## Single-buffer candidate and adoption constraint

share-glb-images.mjs packs exact duplicated images into one external glTF buffer, preserving bufferView indices and rebasing retained BIN/meshopt ranges. check_shared_glb_images.mjs creates an isolated candidate under test-results/shared-glb-images and compares all metadata plus 30,737 raw/compressed payload views with the built originals. Twenty models and 57 image references pass exact parity; 17 duplicate groups save 35,118,340 net bytes (including JSON/container changes). Receipt: shared-image-candidate.json.

This candidate is NOT installed in the build pipeline or game. Its single shared buffer is 26,129,108 bytes. Standard GLTFLoader would fetch that entire buffer when any participating model loads, increasing the initial transfer for a small model. Sharing must be partitioned by asset co-loading/family, or use a separately validated bounded-loading design, before adoption. Exact data parity does not establish browser loading, memory or first-load performance acceptance. Current source/runtime GLBs remain unchanged; the production release gate remains unresolved.

## Shared buffers partitioned by exact consumers

The candidate now groups duplicated images by their exact set of consuming models. Ten banks replace the single 26 MB bank; the largest is 5,375,864 bytes. Each model's referenced banks contain only image payload already embedded in that original model (verified with a padding allowance). Net candidate saving: 35,116,636 bytes. All 30,737 raw/compressed payload views and the selected mesh/animation/material metadata remain identical. Receipt: shared-image-family-candidate.json.

The source-authored browser audit at tests/browser/shared-glb-images.html loaded all 20 candidates with Three.js GLTFLoader and MeshoptDecoder and checked decoded texture dimensions. It completed with passed=true and zero caught errors; per-model results are in shared-image-family-browser.json. This verifies relative external-buffer URLs and decoding, not rendered visual equivalence, GPU memory or production-package acceptance. No production integration has been made yet. Reproduce candidate generation with node tools/guardian/check_shared_glb_images.mjs after building dist, then open the audit through Vite.

## Legacy decoder compatibility

Production adoption review found that the linked native Library loaders read a single embedded BIN directly, so GLTFLoader success alone was insufficient. The legacy decoder now resolves external buffers relative to the model URL and re-embeds each view before handing the GLB to those parsers. Library/menu injection supplies that URL. Missing base URLs, failed HTTP requests, truncated buffers and out-of-range views fail explicitly.

Seven focused tests pass, including relative URL resolution under a nested deployment and truncated-data rejection. check_shared_glb_legacy.mjs also decodes all 20 real candidates and originals, comparing metadata and 30,737 decoded views byte for byte; shared-image-legacy-candidate.json records that pass. This closes a loader compatibility gap, not the pending rendered Library and production-package validation. Image sharing remains a candidate and is not enabled by closeBundle yet.


## Build integration of exact image sharing

closeBundle now applies consumer-partitioned sharing to release GLBs after the main asset pruning. Source GLBs remain embedded and unchanged. The package validator checks every external buffer URI is relative, resolves within the package inventory and has sufficient bytes. Build succeeds (18.90 s reported by Vite before closeBundle); sharing removes 35,116,636 bytes. All 20 compiled GLBs equal the previously parity-tested candidates byte for byte, and all 20 load and decode in the browser from /dist/ paths (shared-image-production-browser.json). Seven focused loader/package tests pass.

Distribution: 550,627,533 bytes and 1,071 files (shared-image-production-package.json). The package validator reaches and fails the existing 1,000-file gate; the independent byte measurement also exceeds 500 MB. Those limits remain unchanged. This is an achieved package-byte reduction, not a publication-ready package or rendered gameplay/Library acceptance. Nested deployment and full visual checks remain pending.


## Rendered parity after build integration

The browser route tests/browser/shared-glb-render.html loads every original from public and its compiled counterpart from dist, renders both with one WebGL renderer, identical framing and lights, and compares RGBA pixels at 240x240. All 20 pairs have zero changed channels and zero maximum difference; no caught errors. Receipt: shared-image-render-parity.json. Inspected screenshots: shared-image-render-top.png and shared-image-render-bottom.png, showing textured buildings, beasts and workers rather than empty renders.

This verifies static material/geometry output at one pose/view/light setup per model. It does not establish animation, every viewing angle, the legacy Library renderer, nested deployment, performance or full game acceptance. The source-authored tool disposes loaded meshes/materials/textures between pairs; it is QA-only and is not bundled into gameplay.
