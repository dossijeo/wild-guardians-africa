# Reviewed offline atlas inputs

`native-inputs.zip` preserves the 42 native-sun PNG bake inputs used by the legacy-alpha species, their original phase metadata, and admitted metadata for all 44 phases. The two linear-alpha PNGs already tracked at `docs/qa/far-prelit-linear-alpha/day.png` and `night.png` are referenced instead of duplicated. No models, demos or runtime assets are packaged here. The archive uses sorted entries, DOS timestamp 1980-01-01, fixed permissions and ZIP deflate level 9; `manifest.json` pins every entry/input/output hash and the archive hash.

The original native metadata is preserved byte for byte. The historical public manifest reordered sourceBounds keys and contains sub-picometre numeric serialization drift in a few frame values. Admitted metadata uses the exact public frame values, and the tool independently compares the original fields with a 1e-12 absolute ceiling. This does not move any pixels or runtime transforms; changed sun, actual frame changes, phases and alpha declarations fail admission. Only the baobab's admitted metadata adds the already-approved `srgb-encoded-linear-premultiplied` declaration for its transformed PNG inputs.

Use Node with the repository's `npm ci` dependencies (Sharp 0.35.5, libvips 8.18.7, bundled libwebp 1.6.0) and Python with **Pillow 9.5.0 / libwebp 1.3.0**, as supplied by the Python 3.11 Pillow wheel. The tool rejects other encoder versions rather than assuming byte stability:

```powershell
python -m pip install -r tools/sources/far-atlases/requirements.txt
node tools/rebuild_far_atlases.mjs
node tools/rebuild_far_atlases.mjs --output .cache/rebuilt-far-atlases
python tools/far_atlas_source.py repack tools/sources/far-atlases/native-inputs.zip .cache/native-inputs-repacked.zip
```

The default command verifies only and leaves public assets untouched. `--output` writes independently generated files into a chosen review directory only after all 44 outputs pass. An explicit `--write-public` restores the reviewed bytes at their current URLs after the same full checks; it never rewrites the runtime manifest. Admission checks the archive/entry hashes, all PNG and original/admitted metadata hashes, native fixed light, frame, alpha recipe, current public manifest and approved public atlas hashes before encoding. Generated WebP SHA-256 and decoded RGBA equality are both required before any public write.

42 species-phases use `sharp(png).webp({lossless:true,effort:6})`. The corrected baobab pair uses the exact encoder in `tools/far_atlas_source.py`: `Image.open(png).convert('RGBA').save(output,format='WEBP',lossless=True,method=6,exact=True)`. This preserves RGB under zero alpha. Re-premultiplying its already-transformed PNG is forbidden; `premultiplyPrelitLinear` remains the separate documented arithmetic used to produce these approved PNG inputs.

The source-container repack receipt uses Python 3.12.3 / zlib 1.3.1. A different zlib encoder can produce a different ZIP stream while extracting identical inputs; the normal rebuild consumes the preserved archive and checks its exact hash, so it does not require regenerating the container.

This is reproducibility of the reviewed **offline pack/encode**, not a claim that re-rendering a GPU bake on another device yields identical pixels. The bake inputs and their native fixed-sun metadata are preserved so rebuilding the runtime package does not depend on an untracked cache. `tools/prepare_far_atlas_assets.mjs` remains a deliberately rejected legacy-cache path; its obsolete sun and non-exact alpha encoder must not replace these assets.
