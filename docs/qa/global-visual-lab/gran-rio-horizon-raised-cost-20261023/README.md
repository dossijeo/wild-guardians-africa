# Gran Rio raised mountain cost

Sourcefbd1f2a6c,Intel UHD0x9A60,ANGLE D3D11,1280x720,medium,seed712,populated paused save. Original base-35 versus raised-10. Same low-angle camera8m sweep,wind,material clocks and full backgrounds. ABAB,60warmup+90samples GPU and separate cadence. No capture or encoding concurrent.

|Pass|Phase|GPU mean ms|CPU render mean ms|Frame interval mean ms|
|---|---|---:|---:|---:|
|A1|day|14.498|7.781|18.989|
|A1|night|15.003|7.444|19.274|
|B1|day|13.718|8.622|19.683|
|B1|night|14.174|8.239|19.926|
|A2|day|13.003|7.713|17.627|
|A2|night|13.859|7.129|18.690|
|B2|day|12.763|7.594|18.961|
|B2|night|13.680|6.916|18.817|

B-A GPU day:-0.780/-0.240ms,night:-0.829/-0.179ms. Whole sequence trends down; do not credit raised geometry as an optimization. No consistent extra GPU cost demonstrated here. CPU/cadence mixed. Keep the visibly improved horizon for motion/native integration review, not as a speedup.

720valid GPU queries,no disjoint/discarded/unresolved samples,no GL/browser errors or simulation changes. Camera/state/device/resolution and initial resource counts match. Repeat workloads vary in1-3frames,up to1924triangles and0.00993% relative total difference; no exact workload claim. Counters do not measure actual VRAM.

Reproduce with Vite5190, WG_FIXTURE_BIOME=gran-rio: node tools/experiments/measure-horizon-raised-20261023.mjs; then python tools/experiments/audit-holly-fern-shadow-profiles-20261023.py docs/qa/global-visual-lab/gran-rio-horizon-raised-cost-20261023. Source unchanged during measurement.
