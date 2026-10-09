# Current main versus interactive loading ABBA

Four sequential contexts177–180 were exported, disposed with contextLost true, closed, and browser inventory empty. Source main6ce847a9 / featuree46a8da0; docs-only feature37c43 unchanged runtime. Full raw frames/long tasks and cleanup reports are retained.

|Arm|Readiness ms|Controls ms|Max interval ms|Intervals >100ms|Sampled JS heap max bytes|
|---|---:|---:|---:|---:|---:|
|A1|7149.8|7149.8|1080.8|5|281413642|
|B1|11966.8|16073.3|99.8|0|304306775|
|B2|10205.6|14290.7|116.3|1|309111050|
|A2|7341.3|7341.3|1097.5|5|281495053|

Both feature arms exceed both reference readiness times by more than the preinterpretation 10% practical trigger. This is a real unresolved readiness regression; no PR/acceptance. Feature intentionally adds 4.09–4.11s cinematic after initialization, recorded separately. Reference heartbeat has no loading-scene rendering and is not GPU-equivalent to feature diorama/cinematic. Delivered scheduling tails are materially different, but this is not a GPU/FPS gain proof. All four final Home eye/target arrays exactly agree and both feature camera-preserved checks pass; all errors arrays empty.

Feature diorama becomes interactive at841/692ms, then world-load spans10160/8528ms from renderer milestone. Reference world-load spans6728/6917ms. Feature far/reveal preparation adds748/765ms after world-load; reference far plus first visible draw245/260ms. Thus the largest unmatched interval is inside world.load, not the intentional cinematic. No phase-level causal attribution yet: the strict fixture disables detailed wrappers; compile/upload waits and budget yields need existing DEV witness before correction. Feature B network union2588.5/657.7ms,212network/1cache each, so cache/transfer drift is also preserved, not assumed equal.

Sampled JS heap maxima281.4/281.5MB reference versus304.3/309.1MB feature, with coarse sample/GC timing limitations. Final reference161geometries/55textures/60programs, feature176geometries/63or62textures/41programs; these are renderer counters, not byte capacity or physical peak VRAM. No memory-neutrality approval.

Heavy local work from other agents was explicitly paused. Root reported a docs-only PR13 pull involving1.8s disk/network during the window; do not label perfectly idle. No quality, simulation, experimental zero-vertices, GPU queries or resource binding probes were changed. All original actual-menu/mobile/dense/download/lifecycle/final acceptance gates remain independently open.
