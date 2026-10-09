# Diagnostic DOM publishing AB/BA — 0c4bfe1b

Four real application Continue loads in order A1/B1/B2/A2, same frozen runtime0c4bfe1b. A uses qa-loading-unthrottled (prior ready-frame publishing cadence); B limits DOM publishing to250ms, immediately publishing the first readiness/failure and final close. All frames/spans are collected identically. Native-validated dense archive b485,23894historical plants/36workers/D101/time360,1280×720, same host/browser/device. Sequential contexts128/130/132/134, each closed before next. No GL probe or extra render loop. Root/agents reported no concurrent heavy work/GPU; small offline JSON reads were performed only after the owned report closed while exiting to menu.

| Metric | A1 | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| Recorded QA DOM writes |185|68|69|175|
| Publishing CPU total ms |211.7|53.8|54.6|178.2|
| Maximum write ms |3.2|2.2|1.9|2.3|
| Writes after first ready sample |121|16|16|125|
| Ready-window publishing CPU ms |173.4|18.3|17.9|151.6|
| Full recorded RAF count |1040|867|871|827|
| Full RAF p95 ms |33.4|49.8|33.4|49.8|
| Full RAF p99 ms |83.3|83.2|82.9|83.0|
| Full RAF max ms |133.0|149.7|116.4|116.5|
| Full intervals >100ms |4|2|2|3|
| Ready-window intervals >100ms |2|2|2|2|
| Total presentation elapsed s |20.77|17.54|17.42|16.86|

The explicit ready window starts at the first captured ready=true sample and ends at the owned presentation close. It is supplementary, not a replacement for complete raw timelines. The final export DOM write cannot record itself in its own already-serialized output; publishing spans explicitly state that limit. Every initial nonpositive interval (one per arm) and all slow frames remain in raw JSON. These diagnostics are existing RAF intervals and synchronous CPU wall time, not GPU timer queries or presented-frame counts.

Throttling clearly reduces diagnostic writes/CPU. Both B arms still have two>100ms ready/cinematic intervals. The approximately3.9s difference between the two A elapsed times exceeds any safe attribution of total loading gain; no net loading, stable60FPS or GPU improvement is claimed. The longer/shorter total initialization also changes total writes, which is why the matched semantic ready-window counts are reported separately.

All four genuine readiness gates complete at100%, pending[],36actor rigs, no error. Console warning/error reads empty. Each normal Pause→Save and return to menu was verified; app closed, only its temporary QA slot removed with visible confirmation, seed closed before next. Final viewportreset/browserinventory[]. No original save edited. No source changed during four arms.

Full raw four reports and summary JSON accompany this document. Remaining outer presentation/diorama and GPU work require attribution. Final visual/UI/resource/matrix gates remain open; no PR or production-ready claim.
