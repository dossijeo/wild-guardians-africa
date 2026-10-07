# Four reviewed beast colors: offline rebuild checkpoint

The subsequent full rebuild and release-package checks have completed; see
[terminal runtime evidence](../tinify-four-beast-runtime/README.md). The text below
preserves the earlier recipe-only checkpoint.

Native acceptance is archived in `native/summary.json` and the preceding README.
Four additional approved recipes and their hash-named WebP outputs are now stored
outside `public/`. The offline recipe was applied independently to each current
baseline and reproduced the corresponding reviewed candidate GLB hash exactly.
No new provider request, API credential or private response URL is needed for
rebuilding. The original GLBs and non-color image sources remain unchanged.

Eleven directed tests passed for source preparation, decoded candidate checking
and approved recipe application, including rejection of changed geometry,
animation metadata, unsafe paths and changed input/output hashes.

At this checkpoint the distributed models and web asset manifest are still the
previous installed versions. The full deterministic compressor is the next step,
followed by verification of all 20 models, comparison against the pre-rebuild
hash inventory, and build/package/ZIP checks. Do not interpret recipe acceptance
as completed runtime or release validation. The expected combined GLB saving is
1,448,448 bytes; it is not yet a measured final package saving or RAM/GPU gain.
