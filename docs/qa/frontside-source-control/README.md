# Source-fine field control: export failure preserved

Native browser execution on repair branch da68f36d, one prospective training
view, four DoubleSide arms. No FrontSide/proxy or benchmark approval. Four frozen
CPU campaign processes confirmed live before draw, one QA graphics context.

The page reached POST /__frontside_report and showed Unexpected report. Its
retained image contains four rendered crop panels, but quantitative comparison
results were not exported or visible: do not infer threshold acceptance from
this image. Cleanup reported closed true, all listed owners disposed and errors
empty. Root closed tab 824 before returning the GPU window to loading QA.

The branch author identified an outdated export-status whitelist. A specific
validator/export fix and native rerun remain necessary; metric thresholds must
remain unchanged. This is an instrumental failure, not proof that the source
field passes or fails visual fidelity. Original assets and production unchanged.

The rerun on 8dadfa84 (tab 825) also reached export, then the new validator
rejected the report with `Unexpected source-fine training report`. Its status,
screenshot and hashes are preserved separately. The fixture shader/visual
source hash remained unchanged. Cleanup listed 24 disposal actions (some own
multiple resources), closed true and errors empty; the tab was closed. Neither
execution exposes quantitative comparison results, so neither establishes
visual acceptance. Diagnose the producer/validator contract before repeating
GPU work; do not relax the visual thresholds to make export pass.

DOM-only preflight b1de3ce3 (tab 827, no renderer/WebGL) exposes a concrete
source-path mismatch: the browser factory obtains `assets/web/be4bb…glb` from
the runtime asset mapping, while the validator expects `assets/be4bb…glb`.
Its status and screenshot are preserved separately, with hashes. This proves
the preflight rejection; the lost POST payload of 825 prevents confirming that
all fields there were identical. The branch author must distinguish original
source provenance from runtime transport provenance and verify the mapping,
then repeat this preflight before another measured render. No visual gate has
been relaxed and no model accepted. Tab 827 closed without a GPU context.

Corrected preflight 3c24cef9 (tab 830) passes in the browser: original and web
runtime identities/hashes are explicitly recorded and HTTP export returns 200
with artifactsWritten false. gpuContextCreated false/gpuDraws zero; tab closed.
Status, screenshot and hashes are preserved. This validates the instrument's
source identity contract, not visual fidelity or any repaired model. The author
can release this fixture freeze and reevaluate direct candidates under the new
perceptual visual acceptance policy recorded in frontside-model-repair-post-jam.
