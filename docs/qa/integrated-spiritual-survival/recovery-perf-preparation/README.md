# Technical preparation for future recovery campaigns

Isolated branch `codex/raid-recovery-perf`, based on `41797669`. The live candidate-4 seed-123 campaign remains on its original worktree and loaded sources. This preparation does not restart, resume or alter that campaign.

Runtime adaptations are limited to five files: the approved PR25 fractional worker connector and cooperative search/smoothing, plus the PR26 exact watering cache. The latter remains subject to final synchronized-head CI/main acceptance. The experimental navigation `skipDirect` option is retained; the file was not replaced by main's navigation wholesale. Agricultural power, raids, pressure, reservations, crop damage, prices, salaries, wall resistance, policies and RNG recipes are unchanged.

The first 81 targeted tests pass with no skips: worker departure/reload, watering/cache, gates, navigation query scopes, pressure recovery, budgets, plans and candidate migration. Original TAP and exact source review are preserved here. Compared with the live 464-file inventory, only Game, Navigation and work-points change; two helper modules are added. Sparse-omitted unchanged files were checked against their original Git objects, so this audit must not be presented as a complete runnable/validated campaign dependency inventory.

A full managed checkout failed with ENOSPC and was automatically removed. The live PID and progressing outputs were subsequently verified. The replacement manual worktree uses sparse code/data selection and shared node_modules; about 66 MB was materialized rather than duplicating historical reports. No campaign data was deleted. Disk headroom must be checked before further large builds/checkouts.

Pending: paired native timing/state checks on this experimental integration, any missing campaign inputs, a new complete provenance review equally applied to reference/recovery arms, and future native campaigns when performance readiness and existing results justify them. The old strict reviewed launcher must keep rejecting changed sources; do not weaken it or relabel this branch as the original campaign. No PR or balance merge is approved by these focused tests.
