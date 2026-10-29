# Local dorsal fur candidate

The registered buffalo remains unchanged. The opt-in `furTrial=1&face=buffalo&recoveryDay=1` WorldScene fixture loads the candidate with an authored `_FUR_LIGHT` scalar attribute. The shader applies a small diffuse fill only to masked dark dorsal fur, in default beast style. Face, eyes and decorations are excluded by the spatial mask. No lights or textures are added.

Reproduce from the arm-normal source at commit 62d53c8dc with tools/guardian/author_buffalo_fur_mask.py in Blender, then transfer_fur_mask.py using original asset cbe635e87c120401a013b10b2d5fc76a9d1babb83bfbed79dd9957b722b1dd6b.glb. The authoring tool pins the source SHA. Transfer preserves all original BIN bytes and checks exact triangle-corner positions, UV, skin and morph positions before appending the normalized U8 scalar in a four-byte vertex stride. Compress and verify using the existing candidate commands.

Compressed size 6,117,900 bytes versus registered 6,112,176: +5,724 bytes. Decoded mask storage 191,544 bytes. Compression validation: 4,671,134 exact geometry/animation bytes, texture PSNR minimum 40.13, zero validator errors. These are asset measurements, not frame-time performance acceptance.

Actual Intel UHD WorldScene views inspected: rear daylight, front three-quarter daylight and rear nighttime. Rear strands are more legible; the front retains dark crest and facial appearance. Screenshots and status accompany this document. These static views do not prove all-angle continuity or animation acceptance. Candidate is not yet registered; moving-pose review remains required.
