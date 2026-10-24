# Quality-switch shader readiness probe

Date: 2026-10-24. Production base: 53afadae9. QA-only experiment; no change to production quality switching.

The approved prepared-water and streaming reuse improvements remain enabled on codex/global-visual-lab. This probe investigates the separate first media-to-baja stall discovered during lifecycle validation.

## Results

| Run | First baja transition wall ms | Preparation wall ms | Largest RAF interval ms | Programs | Draw calls |
|---|---:|---:|---:|---:|---:|
| quality-switch-attribution | 6485.77 | 0.00 | 6073.89 | 106 | 73 |
| quality-switch-prewarm-probe | 4576.69 | 4212.43 | 162.40 | 118 | 72 |

Synchronous attribution identifies driver program-readiness waits during the first render: getProgramInfoLog alone spends about 3.8 seconds across ground, mud and two far-ground variants. Nested timing records overlap and must not be summed. These are CPU wall timings, not GPU execution timings.

The prototype suppresses world drawing while preparing scene programs asynchronously, keeping the previous canvas image. RAF callbacks continue. It first drains far preparation, listens for material disposal, and restores drawing in finally. World snapshots remain unchanged and both runs pass the existing GL/lifetime checks. Only the previously known f_environment4 shader warnings occur.

## Limitations and decision

One baseline and one prototype run, not an ABAB performance claim. Paused populated Mangroves, 720p, same fixture. The first low-quality draw differs by one call (73 vs 72), and retained/compiled program inventory differs (106 vs 118). No screenshot equivalence proof has been collected for this probe. The extra asynchronous preparation also increases subsequent already-warm transition duration. RAF responsiveness while the old world image is held must not be reported as game render FPS.

Keep the prototype QA-only. Before adoption, validate visual equivalence and implement safe ownership/cancellation for scene changes, material disposal, exit and context loss during the transition. Borrowing a live streaming scene across awaits is not yet a production-safe architecture. The established streaming improvements are independent and stay adopted.

## Reproduce

Run the local worktree Vite server on port 5190, then in PowerShell:

```powershell
$env:WG_THREAD_PORT='5190'
$env:WG_THREAD_FROZEN='1'
$env:WG_THREAD_DEFAULT_STREAMING='1'
$env:WG_THREAD_QUALITY_CYCLE='1'
$env:WG_THREAD_QUALITY_ATTRIBUTION='1'
$env:WG_THREAD_QUALITY_PREWARM='0' # baseline; set 1 for prototype
$env:WG_THREAD_REPORT='docs/qa/wild-engine-pthreads/quality-switch-repeat.json'
node tools/experiments/check-spatial-thread-game.mjs
```

Raw reports: quality-switch-attribution.json and quality-switch-prewarm-probe.json. Production defaults and art are unchanged by this diagnostic checkpoint.

## Follow-up: ABAB and settled captures

The first sequence takes optional screenshots outside each measured transition. A1/B1/A2/B2 first-baja results:

| Run | Transition wall ms | Largest RAF interval ms |
|---|---:|---:|
| A1 | 6786.60 | 6380.95 |
| B1 | 4906.50 | 123.43 |
| A2 | 6855.03 | 6424.79 |
| B2 | 4754.12 | 128.74 |

All four runs have unchanged authoritative snapshots and no unexpected browser errors. This supports responsiveness, not sustained rendered FPS: B holds the previous canvas during preparation.

Immediate captures exposed a transient far-tree difference and 73 vs 72 draw calls. A separate A/B validation now waits for all near/horizon/far preparation plus 120 consecutive stable RAFs, outside measured intervals. Both settled runs show draw calls 80/72/80/72 and every far adapter idle without errors. Full-frame RGB MAE on the 0â€“255 scale is 0.000126, 0.001700, 0.005391 and 0.005580 across the four captures. Pixels differing by >10 in any channel stay below 0.022%. The first low-quality pair was visually inspected: ground, fern coverage, buildings and distant trees match. This establishes this paused daytime fixture only, not moving-camera, night or active-world equivalence.

Reports: quality-prewarm-{a1,b1,a2,b2}.json and quality-settled-{a,b}.json. Settled screenshots: quality-settled-{a,b}-{1-media,2-baja,3-media,4-baja}.png. Enable WG_THREAD_QUALITY_CAPTURE=1 to reproduce the settled captures; settling is deliberately excluded from transition timers. The earlier four timing reports used immediate captures; the later settled pair is visual validation, not added ABAB timing repetitions.

Decision remains QA-only pending active-scene ownership and cancellation validation. No production rendering or material changes in this follow-up.

## Borrowed-resource invalidation

The first guarded browser run aborted as designed: NativeAssetGroups.prepare disposed a BufferGeometry while asynchronous quality compilation was pending, despite paused simulation. Its log is quality-prewarm-resource-guard.log. This disproves the assumption that draining far preparation alone makes the borrowed scene stable.

Added opt-in guardResourceDisposal to the batched compiler: subscribe to unique geometry/material disposal across all batches, cancel owned readiness/frame waits, remove listeners on every terminal path, and report BORROWED_RESOURCE_DISPOSED distinctly. No production caller enables it yet. This protects disposal, not arbitrary object/material replacement or scene membership changes.

QA now retries only that invalidation using a fresh scene snapshot under the original 30-second outer deadline; unrelated errors still propagate. quality-prewarm-resource-retry.json passes the real Chrome cycle with unchanged authoritative state and no unexpected warnings/errors. Invalidation counts: 0/1/1/1; prewarm wall time: 137/4218/300/95 ms; largest RAF intervals: 24/146/53/29 ms (rounded). This is a safety smoke, not another ABAB timing claim.

44 relevant tests pass, covering pending-driver cancellation, later-batch material/geometry disposal, suspended-frame cancellation and listener cleanup after success, submission failure and external abort. Production adoption remains blocked by incomplete active-world/exit/context validation, not by a requirement for user approval. The graphical defaults remain unchanged.
