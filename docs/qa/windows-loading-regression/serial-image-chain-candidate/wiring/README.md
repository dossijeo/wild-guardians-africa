# Serial image chain: smoke-only selection freeze

This adds App selection, a guarded `--smoke-serial-image-chain` CLI argument, false-default workflow input in both original invocations, and an explicit boolean in `loadingRecipe`. Normal gameplay requires no opt-in reads past the false smoke guard. The candidate preparation source, original loader/cache ownership, GPU warm tail, compiler and budget are byte-identical to reviewed 37427276. No native trial has been dispatched.

Any separately authorized trial must select serial_image_chain=true and wall_buffer_package=false, compile_window=false, resource_overlap=false. Existing 90-second readiness, full model variants/fences and 300000-ms hidden fixture are unchanged. The <=2733.2-ms awaited image tail remains only a theoretical opportunity, not measured savings.

Checks: 68/68 CPU contracts, build 10.83 s, package 712 files / 450454366 bytes / 860 links / 22 runtime GLBs. These times are check receipts, not performance evidence. Experimental JSON warning and Vite chunk-size warning are preserved. Four changed JS syntax checks pass. Parent independently verified the earlier implementation with 35/35 contracts; this wiring requires its own review.

SFX regeneration changes only main.js fingerprint and caller line offsets (+1); all classifications/routes and 126 original file bytes remain unchanged, verified recursively in sfx-diff.json. The earlier stale inherited recipe-test negative remains untouched in ../initial-tests-negative.log. A first local metadata comparison used the mistaken field name sourceFingerprints rather than sourceHashes and stopped before tests/build; it did not alter runtime or native evidence.

Run `python docs/qa/windows-loading-regression/serial-image-chain-candidate/wiring/verify.py` from this checkout. Receipt records session5783 terminal exit0, commands and binary log hashes. The parent receipt is historical for source37427276 and should be verified at that ref, while this receipt covers the updated wiring.
