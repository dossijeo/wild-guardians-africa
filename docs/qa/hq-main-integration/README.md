# HQ mountains: merged integration verification

Runtime baseline: `68447e149019be082d7b9815e475fc42edd5588b`.
PR [#7](https://github.com/dossijeo/wild-guardians-africa/pull/7), head
`32d546c159a4cdc48d334364110c7fb1c16f343d`, merged on 2026-10-07 at
23:35:38 UTC. Both PR-head workflows succeeded before merging. Main workflows
37703151920 (Validate game) and 37703152016 (Windows desktop) were still running
when inspected; this receipt does not assert their success.

Local verification completed on 2026-10-08:

- 119 directed tests passed: backdrop, ownership/profile, framing, export
  contract, arc composition, source color, image-role/runtime/Tinify policy.
- `npm run build` passed (269 modules). The existing main bundle size warning
  remains; this work does not claim to optimize that bundle.
- `node tools/prepare_mountain_backdrops.mjs --check` reproduced all six public
  atlases and the generated profile exactly from the pinned sources.
- `node tools/audit_image_assets.mjs` reported zero errors, zero unparsed inline
  images and six distributed, contract-protected HQ color atlases.
- `npm run test:web-package` passed: 701 files, 403,013,176 uncompressed bytes,
  859 relative links and 20 runtime GLBs; original GLBs, demo village and
  superseded ground duplicates excluded.
- `python tools/package_itch.py` exited successfully and verified ZIP CRCs.
  The ZIP contains a root `index.html`, all six HQ atlases and no nested ZIP.
  Its encoded size is 353,085,120 bytes. It has not been published to itch.io.

`receipt.json` records archive/profile hashes and inventory scope. Compressed
logs preserve the directed tests, build, package check and ZIP tool output.
`reproduction.json` preserves the exporter result (temporary staging path is
historical). The earlier 3,070-test run is a pre-HQ result and is not used here
as evidence of a full suite on this baseline.

This closes build/export/package integration checks, not physical mobile
acceptance, all-biome visual acceptance on root hardware, mip shimmer or the
ongoing FrontSide model experiments. The latter have not changed production
assets or sidedness.

Update: [Validate game on the merge runtime](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37703151920)
completed successfully at 2026-10-07 23:52:45 UTC: 3,104 tests passed, zero
failures, asset/audio/plan/balance/browser-syntax checks, build, package and ZIP
CRC checks passed. `validate-ci.log.gz` preserves the complete log. Windows
37703152016 subsequently completed compilation and installer checks but was
still running packaged WebView2 smoke/visibility checks at inspection; its
terminal success remains unproven here.
