# Offline rebuild recipe

The reviewed WebP bytes are now preserved in `content/optimized-images/`, outside
`public/`, and identified by SHA-256 in
`content/manifests/embedded-color-recipes.json`. No credential, provider response
URL or additional runtime texture is stored there. The GLB remains the sole
runtime copy of this texture after installation.

`tools/compress_web_assets.mjs` first regenerates the existing deterministic
baseline from originals, then applies approved color replacements. The helper
checks the original and baseline GLB hashes, original image and prepared upload
hashes, output hash/length and restricted local source path. The existing repacker
checks exclusively color consumers, WebP dimensions and exact alpha. A changed
baseline fails explicitly instead of silently restoring or accepting a different
texture. The manifest records Tinify encoding provenance instead of claiming
that an override used the default WebP quality 90.

Three directed tests pass: offline reapplication, identity with no recipe, and
rejection of changed source/preparation/output, unsafe paths, duplicate indices
and normal-map replacement. These tests do not prove the full rebuild has
completed or that a released package contains the replacement.

```powershell
node --test tests/approved-embedded-colors.test.js
npm run assets:compress
npm run verify:web-assets
npm run package:itch
```

At this checkpoint the complete rebuild is still running in exec session 61324,
PID 13700, writing `.cache/embedded-color-rebuild.txt`. It has been observed live;
there is no terminal result yet. Do not start a second writer or attribute a
completed rebuild/package result to this preparation checkpoint. Compare the
resulting facóquero GLB to the accepted pilot hash
`a0fec1e4402299e0b58b3b551881d513cc2b799d26b17bbf12aac5eca67c78be`,
inspect changes to all other GLBs, and complete the asset/build/package checks
before declaring the override integrated. Existing native evidence remains
limited to the isolated A/B fixture described in the parent README.
