# Guardian integration checkpoint — ca5f07659

The 50-file previous Guardian integration selection was expanded with seven
new contact, support, skinning and captured-pose tests. All 327 tests across
57 files pass: zero failed, skipped or cancelled. The exact selection and
results are in `integration-checks-ca5f07659.json`; full TAP output is preserved
in `integration-checks-ca5f07659.tap.gz`.

Coverage includes the selected magic/ritual state and interruption tests,
singleton/placement/pose/audio behavior, articulated and baked beast physics,
authored recovery on slopes and beside solids, and worker recovery state tests.
The new tests check exact skin sampling against Three, contact representative
invalidation, support-search equivalence and replay of native contact defects.
A passing defect-replay test means faithful reproduction, not a fixed defect.

`npm run build` passed (Vite 22.56 seconds). Existing warnings remain for large
chunks and mixed static/dynamic imports of far-atmosphere. Shared-image packaging
reported 20 models, 10 banks and 35,116,636 bytes saved. This does not establish
that the release package satisfies its size/file-count gate.

Build and tests ran concurrently. Their durations are not comparable performance
measurements. This is not the full repository test suite or a graphical review.
Full collider refit remains disabled at gameplay impact time because its cost
is still excessive. The native early-recovery skin penetration remains open.
The broader Guardian visual/audio/performance deliverables also remain open;
the six-biome image-generation texture work remains queued after them.
