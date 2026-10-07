# Four reviewed beast colors installed

Hyena, buffalo, lion and rhino now contain the reviewed Tinify WebP color outputs.
The full offline compressor completed successfully and produced exactly the four
candidate GLB hashes from the [native review](../tinify-four-beast-pilots/README.md).
The other 16 runtime model hashes and their manifest records are unchanged. All
original model hashes remain unchanged. The actual combined GLB saving is
**1,448,448 bytes**, bringing the 20 runtime GLBs to **149,177,684 bytes**.

The complete independent decoded verifier passed for all 20 GLBs: geometry and
animation are byte-exact, alpha preserved, normals lossless, color above the
existing PSNR gate, local Meshopt decoding correct and no new conformance errors.
Inherited original errors remain reported (including authored null tangents);
this is not a claim that every original model has zero validator errors.

Validation:

- 11 directed preparation/candidate/recipe tests passed.
- 137 tracked browser HTML pages / 136 inline scripts passed syntax checking.
- Production build passed: 225 modules, 14.82 seconds. The existing large bundle
  warning remains; build time is not a performance benchmark.
- Package check passed: 641 files / 381,090,336 bytes, 859 relative links, 20 runtime
  GLBs, no duplicated original models or source optimized-image copies.
- Actual ZIP: 331,308,753 bytes; CRCs and all 20 runtime model hashes passed.
  `index.html` is at the root, no nested ZIP, no approved source image duplicates.

The ZIP SHA-256 is
`073103ed2eae249e92be1d08b4426bacd32964b74037752b8cdd1bee66329b7f`.
Full compressed command logs, exact rebuild/ZIP measurements and source hashes
are archived beside this file. No provider request was made during rebuilding.
No itch publication, reduction of decoded texture allocation, RAM, GPU or
frametime is claimed. The package total is a current measurement; unrelated
generated bundle bytes prevent treating a historical package difference as the
exact four-texture saving.

This terminal evidence supersedes the in-progress recipe checkpoint in
[REBUILD.md](../tinify-four-beast-pilots/REBUILD.md); historical native and pilot
reports still describe their own earlier candidate-only states.
