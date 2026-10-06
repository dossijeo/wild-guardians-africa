# Tinify static-color pilots

Three actual requests have completed: a crop thumbnail, transparent native-HUD coin, and desert base-color texture. Original assets and all runtime references remain unchanged. Candidates live in this QA folder, outside the distributed public assets.

Source bytes: 2,393,023; candidate bytes: 98,678; potential saving: 2,294,345. This is encoded-image saving, not accepted package reduction or GPU-memory saving. Last observed provider compression count: 4 (the PNG conversion added an operation). A repeated thumbnail request reused the hash-verified disk result without another upload.

All three outputs retain dimensions, with zero decoded alpha differences. Reports expose RGB errors and source/output hashes. Original and candidate images were inspected side by side locally; scene/HUD/native rendering acceptance is still pending. The sand grain has some local color/smoothing changes, which need in-scene comparison.

The 17 directed tests cover shared requests, persistent reuse, resume after failed output, sanitised errors, allowed output host, output integrity/MIME, RGB/alpha comparison, grayscale, and image-role classification. No live API request runs in tests.

## Reproduction and limits

Run `node tools/audit_image_assets.mjs`, then set `TINIFY_API_KEY` privately and run `node tools/optimize_image_pilot.mjs assets/IMAGE` for one inventoried distributed color image. Unknown roles and shader data maps are rejected before uploading. The pilot never replaces runtime assets. Do not commit the private upload journal or credentials.

`tools/tinify-image-cache.mjs` retains completed outputs by source hash, and interrupted downloads resume their recorded upload. It does not automatically retry paid uploads. Current deduplication is within one client plus the disk cache; concurrent separate processes are not supported and may duplicate paid operations. Bulk processing must run sequentially or share one client.

Pixel comparison uses explicit sRGB RGBA8 for display-color images. It does not establish exact preservation of shader data, ICC profiles or oriented/animated images. Source pilots have no ICC profile and no orientation transform. Those other cases require separate policies before upload.

Next: bind accepted outputs through relative asset aliases, verify the web/Windows packages and rendering, then extend beyond this small pilot. Embedded GLB images remain untouched.
