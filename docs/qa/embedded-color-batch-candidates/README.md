# Actual remaining embedded color candidates

All sixteen prepared color inputs were submitted through the Tinify cache and independently checked against their original and current runtime GLBs. The batch completed every row; its exit code is **1 because two quality gates failed**, not because an unfinished process is being counted as success. Four duplicate original-derived worker inputs reused the same provider outputs. Twelve unique hash-checked WebPs (5,085,030 bytes) and sixteen receipts are archived outside `public/`; no credentials, provider response locations, source PNGs or duplicate GLBs are included.

**Fourteen candidates pass** decoded original geometry/animation byte equality, runtime/original metadata, unchanged other images, exact alpha, PSNR at least 32 dB and no new decoded GLB conformance errors. The lowest passing score is 32.1360 dB. Numerical acceptance does not establish native appearance: close review is particularly important near that limit.

**Two crop-atlas colors are rejected**, model `be4bb7e7…`, image indices 1 and 4: 31.2667 and 31.6064 dB. Their outputs remain archived as counterexamples and must not be installed through the current color gate. A higher-quality alternative is still required.

The fourteen passing individual GLB candidates save a combined **5,741,092 bytes** against their exact current runtime models. This is potential encoded asset saving: no reviewed runtime recipe, distributed asset, package saving, decoded allocation, RAM/GPU or frametime improvement is claimed. The menu diorama is included as a texture candidate but its material/shader exception is unchanged. Forty-two normal/data images remain outside this lossy-color batch.

Twenty-four directed cache/preparation/recipe/decoded-candidate/repacking tests pass. A subsequent credential-free `--validate-only` run recomputed all sixteen original-derived inputs and verified manifest ownership, path/index/hash identities and upload hashes with zero provider requests. `tests.tap` and `input-validation.log` preserve terminal results. Runtime manifests/recipes remain at the hashes in `candidates.json`.

Reproduce with a privately configured `TINIFY_API_KEY`: `node tools/optimize_remaining_embedded_colors.mjs .cache/embedded-colors-remaining`. The prepared input plan must still match current manifests and source bytes. The durable cache avoids duplicate uploads on rerun; completed candidates are rechecked, and every receipt is written after its row. To validate inputs without a credential/network request, append `--validate-only`.

Next: native fixed-camera original/candidate appearance checks for the fourteen passing textures, higher-quality crop alternatives, then reviewed offline recipes, rebuilt assets/manifests and package verification. No itch.io deployment occurred.
