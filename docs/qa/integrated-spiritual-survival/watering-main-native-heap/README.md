# Main watering cache: native heap probe

PR26 runtime, unchanged from `ccb808d4`; uncached control redirects only the watering recipe. AB/BA replays use the previously funded 500-crop fixture for 3,000 native ticks (300 simulated seconds). No new funding, magic policy, synthetic deliveries or live-campaign mutation. All four final serialized state hashes match. Runtime source hashes were checked before and after.

Node 20.11.0 runs with `--expose-gc`; two forced collections occur before and after each replay while its actual native state/navigation are still referenced. Heap peaks are sampled every 50 ticks. Values below are MiB (1,048,576 bytes):

| Arm | Heap before | Heap after GC | Sampled peak |
|---|---:|---:|---:|
| A, uncached | 5.41 | 13.02 | 46.04 |
| B, cached | 6.66 | 14.55 | 51.78 |
| B, cached | 7.08 | 14.53 | 52.84 |
| A, uncached | 7.06 | 13.46 | 46.90 |

Using pair means, cached after-GC heap is about 1.30 MiB higher and sampled peak about 5.83 MiB higher. The difference in before/after retained growth is about 0.66 MiB. The initial baseline varies with warm-up and previous arms, so none of these differences is an exact attribution of all bytes to cache entries. This quantifies a real measured tradeoff rather than claiming zero memory cost.

The observation is limited to process-local JS heap, this fixture and this run. It does not measure absolute peak, Windows working set, physical mobile RAM, renderer allocations or VRAM. It does not prove worst-case memory for arbitrary numbers of navigators. The separate synthetic cap tests still cover per-navigator entry/path-point limits and GC release; neither replaces the other.

Original report, exact script and stdout are preserved with hashes in `receipt.json`. Extract the script into the PR26 worktree and run `node --expose-gc SCRIPT NEW_REPORT` to reproduce. Performance timings are documented independently; this GC-instrumented run is not a frame-time benchmark. The active military campaign remains on its original frozen runtime.
