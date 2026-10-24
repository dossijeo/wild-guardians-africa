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
