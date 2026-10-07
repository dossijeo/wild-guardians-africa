# HQ atlas image inventory policy

The image inventory now reads the generated mountain profile explicitly.
All six HQ files are classified as `color-atlas`, with their encoded byte count
and SHA-256 contract. The atlas renderer uses authored UV cells and alpha edges;
the exported atlas/module must continue to reproduce exactly from pinned sources.
These are color textures, but their approved export contract requires a separate
visual/reproduction review before recompression or runtime aliasing.

The normal Tinify color pipeline rejects this role before inspecting or uploading
bytes. Generic image aliases are also rejected, including lossless data-image
aliases: changing the encoded file requires regenerating the export contract.
The inventory verifies current bytes, dimensions and alpha against the profile,
and reports discrepancies as errors. Unknown generated dictionary formats still
require review. Existing ordinary color/data policies remain unchanged.

62 directed image-role, runtime and Tinify policy tests pass. An independent
read-only check parsed the actual profile from PR #7, source `32d546c1`, and
matched all six public files against their hashes and byte counts. Both policy
gates reject every candidate. `native-contracts.json` preserves those results.
No image was converted, uploaded or aliased; no size/FPS improvement is claimed.

Post-merge verification on runtime `68447e149019be082d7b9815e475fc42edd5588b`
completed on 2026-10-08: all six distributed HQ atlases have the expected
`color-atlas` role, encoded contracts, dimensions, alpha and exact hashes.
The inventory has zero errors and zero unparsed inline images. Fifty other
distributed images remain unclassified and conservatively require exact pixels;
this verification does not complete their review or authorize conversion.
See [the integration receipt](../hq-main-integration/README.md).
