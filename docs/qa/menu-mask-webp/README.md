# Native menu terrain mask in exact lossless WebP

The last shipped PNG is the original 1536 x 864 grayscale8 menu terrain mask, sampled through uTerrainMask.r in public/menu/native.js. It is numerical alpha data, so it uses the local lossless WebP exception instead of Tinify display-color compression. Source grayscale values expand exactly into RGB, with opaque alpha; no resizing, gamma, rotation, lighting or menu-shader change.

Source 4,858 bytes -> WebP 1,712 bytes. Encoded saving 3,146 bytes, net package saving 1,543 bytes after alias metadata. Current package: 586 files, 389,581,875 bytes, 859 relative links, no duplicated original maps. The source remains in Git.

28 directed tests pass, including actual grayscale scalar replication, true 16-bit rejection, explicit catalog-role semantics and all runtime image/hash/alpha checks. The native WebGL2 fixture now compares all eight data maps with both none and default ImageBitmap color-space conversion. All 16 cases pass: 119,668,736 channel values, zero differences, native hashes identical to independent raw hashes. This protects the ordinary browser decode route as well as explicit no-conversion data upload.

The compiled menu loaded from /nested/itch/game/menu/index.html, completed the original diorama and exposed its five interactive symbols. The menu screenshot and DOM status are preserved. This does not apply the game's cel shader to the diorama or modify the original menu artwork.

## Inventory classification

The audit now follows explicit village color/normal/rough/photo slots, wall texture/icons, VFX thumbnails and menu image script slots. VFX atlas is conservatively classified as data. Unknown village texture slot names stay unclassified even if another role shares that same file. The menu mask is explicitly data; other menu background/sky/clean albedo slots are color.

50 additional images are classified from their runtime catalogs rather than names or file extensions. Distributed inventory: 225 entries, 198 WebP, 26 JPEG, one SVG, zero PNG; 15 remaining unclassified uses and 92 entries requiring exact preservation/review. This is not completion of all image optimization: JPEG, existing WebP/color atlases, embedded maps and the vector/unknown cases still require their own checks. Windows/mobile acceptance is also pending.
