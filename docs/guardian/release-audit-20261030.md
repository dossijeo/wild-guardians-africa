# Release package audit — 2026-10-30

This audit does not close Guardian acceptance. Main remains fully contained in the working branch; PR217 is open, unmerged and reported mergeable.

The current built distribution contained 1,063 files and 594,164,705 bytes. Two visual-lab textures are referenced only by tools/experiments: cliff_side-nor_gl.png (5,658,685 bytes) and canyon-soil-solar-arh.png (2,397,715 bytes). They are now excluded by the existing QA_ONLY_GROUND_FILES release filter. Originals remain in public. The production canyon diffuse, desert sand normal/color and gameplay material paths remain packaged. Searches covered src and public JS/JSON/HTML/CSS; the package verifier also checks compiled scripts for references to excluded assets.

After rebuilding: **1,061 files, 586,108,305 bytes**, a reduction of **8,056,400 bytes** without model or texture changes at runtime. Production build passes (16.80 s, existing warnings). Resource checks reach the file-count gate, which **fails** at >1,000 files; the measured bytes also exceed the unchanged 500,000,000-byte budget. No successful release package is claimed.

Four of five web-package unit tests pass. The remaining failure is the existing all-GLBs-must-shrink assertion: source assets/a4aa5ace262a69b815558f2c9b655fee3a933173d62724de2faca384655560b1.glb (the installed Suajili center in destruction.json) is 1,605,588 bytes; its runtime encoding is 1,635,504 bytes. The existing compressor expands the embedded normal from 33,088 to 398,444 bytes, color from 221,370 to 286,594, and data map from 32,258 to 83,456. No thresholds, manifest figures or texture fidelity checks were weakened to hide this failure. Investigate retaining original image encodings when conversion expands them, with decoder and pixel verification, before changing this asset.

This is package-size evidence only, not runtime GPU memory, visual acceptance or global frame performance. The separately assigned baseline-engine investigation is untouched.
