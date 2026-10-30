# Release wall buffer bank

Release packaging now combines 160 wall geometry/destruction buffers into one 5,135,464-byte bank. Original authoring buffers remain unchanged. Descriptors retain repository provenance and aligned ranges; AO source identities receive the same provenance mapping. Additional consumers cause packaging to fail rather than deleting a referenced buffer.

The game reads one bank per wall asset load and validates its size/ranges; slices retain exact bytes and original typed-array alignment. The Library loader supports the same bank. No global buffer cache retains aborted worlds. Four tests pass, including exact source bytes, shared fetch, invalid ranges, retry after failure and development-close isolation. A separate built-package replay verified all 160 descriptors against source bytes.

A discovered existing lifecycle defect allowed the development server close hook to rerun production packaging, emptying an already packed lipsync bank. closeBundle now returns for serve mode. A fresh build and package validation confirm the 62 cue records are present.

Fresh package: 912 files, 550,647,843 bytes. The file-count gate now passes (159 fewer files); the 500 MB gate still fails. Build succeeds. The approximately 14 KB increase is descriptors/runtime code, not texture degradation. Current raw inventory: release-wall-bank-size.json.

Pending: graphical validation of the packaged game with wall AO/destruction and the Library lab. This implementation is not yet a visual acceptance claim. Source development GLBs/textures/audio remain unchanged.
