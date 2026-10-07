# Package verification · 731cd8e

Production dist was built from 731cd8ef2b49baf50e7247586f868675046ec747 and then checked with four independent commands. All exited0; outputs and hashes are adjacent.

- Package:641 files,382,699,729 bytes,859 relative links,20 runtimeGLB assets; no original GLB/audio/image duplicates. Includes checksums for54 Spirit clips and exact decoded channels for data images.
- GLB:geometry/animation bytes identical after decoding, texture/alpha checks and no additional validator errors compared with each original. Some originals already have validator errors (473 or1 in the printed cases); PASS does not mean zero original conformance issues. This command is not a visual comparison of every model.
- Music:21 files,2 index files and550 reconstructible Opus windows, hashes/provenance valid, one compressed resource for both windowed and compatibility paths. Runtime41,269,675 bytes versus52,856,733 original bytes. No perceptual continuity or physical memory claim.
- SFX:126 exports and3 metadata files with valid hashes; runtime4,983,383 bytes versus6,595,321 original bytes. Completeness of the exports does not prove all126 have gameplay assignments or have been heard.

These checks do not test host permissions, wake-lock behavior, loading frametime, gameplay balance or mobile usability, and do not certify the pending impostor branch.
