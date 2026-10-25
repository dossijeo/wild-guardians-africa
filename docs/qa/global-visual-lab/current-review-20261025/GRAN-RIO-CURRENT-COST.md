# Gran Rio current recipe: repeat cost baseline

Two sequential Chrome runs on Intel UHD 0x9A60 / ANGLE D3D11, 1280x720, media. Same frozen populated fixture, camera, X travel 144 over 180 presentation frames, 60 warm frames, then settle. Pthreads, scheduler, program retention and current review recipe enabled. Existing unrelated worktree edits retained; executed source hashes are in gran-rio-current-cost-sources.json. Git maintenance had finished before these runs.

| Measurement | r1 | r2 |
| --- | ---: | ---: |
| GPU elapsed mean ms | 22.690 | 22.861 |
| CPU render mean ms | 10.714 | 12.062 |
| CPU draw mean ms (included in render) | 6.007 | 6.637 |
| Authored 180-frame presentation mean ms | 31.686 | 31.318 |
| Authored presentation P95 ms | 66.455 | 50.130 |
| Authored presentation P99 ms | 83.020 | 66.785 |
| Maximum presentation interval ms | 99.835 | 83.400 |
| Travel plus settling ms | 6634.625 | 5836.545 |
| New graphical chunks | 15 | 15 |
| Final native chunks | 27 | 27 |
| WASM memory MiB (not VRAM) | 16 | 16 |
| Loading-ready time ms (not controlled cold-cache) | 25933.715 | 25274.860 |

GPU queries: 76/64 valid samples, no disjoint. Both runs settled, simulation elapsed remained unchanged, no unexpected console errors; existing X4000 shader warnings were recorded. Both final screenshots were directly inspected: dense foreground coverage, intermediate vegetation, ground and shoreline remain present. They do not prove visual correctness during every frame.

This is a repeated baseline, not A/B, not a speedup claim, and not an active simulation acceptance test. GPU elapsed includes pipeline bubbles. CPU render includes draw and must not be added to it. The fixed frame-count route has slightly different wall-clock speed across runs; variable settle durations are separated from the authored first 180 intervals. Percentiles in the summary use floor((n-1)*p). Loading times are contextual observations only.

Reproduce in PowerShell from the worktree with Vite on 5190, once per report name:

```powershell
$env:WG_THREAD_PORT='5190'
$env:WG_CURRENT_REVIEW='1'
$env:WG_THREAD_BIOME='gran-rio'
$env:WG_THREAD_QUALITY='media'
$env:WG_THREAD_FROZEN='1'
$env:WG_THREAD_RETAIN_APP='1'
$env:WG_FRAME_SCHEDULER='1'
$env:WG_THREAD_BENCH='1'
$env:WG_THREAD_GPU='1'
$env:WG_THREAD_FRAMES='180'
$env:WG_THREAD_DISTANCE='144'
$env:WG_THREAD_REPORT='docs/qa/global-visual-lab/current-review-20261025/gran-rio-current-cost-new.json'
node tools/experiments/check-spatial-thread-game.mjs
```

Conclusion: the current recipe still has observable streaming presentation spikes despite fairly consistent mean GPU cost. Preserve approved vegetation. Attribute the spikes before choosing a performance change; these measurements do not justify reducing density or claiming all-six-biome completion. Follow-up needs comparable main/lab tests, active simulation, low quality and night.
