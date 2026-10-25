# Raised Sabana horizon: controlled active excursion

Sourceeb7f13815 with QA mountain base-10,medium,seed712,1280x720,full backgrounds. Live populated simulation, wind and40s outward/return camera path144mX/50.4mZ. Existing raid-camera beginManual holds user-style manual control; no simulation/rule change. Night continues daytime state.

- day: 1039 observed frames, 38.048s simulation advance, 40 distinct chunk sets; origins [[0, 0], [144, 0]]; 328 pending-background frames. [Video](day.webm), [checkpoints](day-contact.jpg).
- night: 894 observed frames, 56.146s simulation advance, 38 distinct chunk sets; origins [[144, 0]]; 291 pending-background frames. [Video](night.webm), [checkpoints](night-contact.jpg).

Every horizontal camera sample matches the intended route (maximum numerical error5.69e-14units), zero diverted frames. No GL/browser errors,unexpected pauses or vegetation overflow; workers change. Videos decode at1280x720 and exceed38s. Recorded frames are not FPS benchmarks.

Both nine-image contact sheets inspected: raised mountain crest remains above terrain, foreground trees occlude it, no obvious rectangular lower edge is exposed at the checked positions, including return after rebase. This is sampled visual evidence, not exhaustive temporal artifact review. Pending background preparation remains observed; resources are not a long-term leak test.

Retain the raised Sabana base as a candidate for native opt-in integration. Separate ABAB cost report in ../sabana-horizon-raised-cost-20261023 finds inconsistent day delta and approximately0.46-0.62ms extra night GPU cost, with small repeated-workload differences. No zero-cost claim. Gran Rio still needs its own motion/cost evidence before applying this result to both biomes.

Initial non-manual run is preserved in ../sabana-horizon-raised-motion-20261023; its nighttime route was diverted and is not used as a controlled path proof. The new audit checks actual coordinates, rather than assuming a requested camera move occurred.

Reproduce with Vite5190:
```powershell
$env:WG_FIXTURE_BIOME='sabana'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/sabana-horizon-raised-manual-motion-20261023'
node tools/experiments/capture-horizon-raised-motion-20261023.mjs
python tools/experiments/audit-horizon-raised-motion-20261023.py docs/qa/global-visual-lab/sabana-horizon-raised-manual-motion-20261023
```
