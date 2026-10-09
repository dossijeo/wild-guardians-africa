# Actual Continue: loading-owned actor queue e1163c57

Source e1163c57, actual application at port 5290 with qa-loading, existing presentation RAF only; no GL probes, second loop or fixture auditing during loading. Same native-validated b485 dense archive copied into an explicitly temporary QA slot (23894 historical plants, 1122 alive/visible at farm focus, 36 olderFemale workers, day101/time360). Mouse menu interaction started the load. 1280×720 viewport. No concurrent root/agent heavy work or GPU context reported.

19 directed contracts pass, zero skip, 347 ms; build exit0, 317modules/10.22 s. Existing bundle-size warning retained. The subsequent LF-only amend changed no logical source/build behavior.

## Observations, without a paired causal performance claim

- Queue submitted/completed 36, failed0, pending0; closed at handoff. 19 actual yielded frames. Accumulated task CPU206.0 ms, individual maximum9.9 ms.
- Native actor adoption window30904.8→31209.5 (304.7 ms) contains18 existing RAF samples, intervals16.4–16.9 ms. Splitting adjacent spans at a gap greater than1 ms gives20 CPU groups, maximum accumulated preparation12.7 ms. The earlier preserved 0c416cee witness had36 contiguous jobs totaling267.4 ms next to a282.6 ms RAF interval. These unmatched runs establish an observed distribution of work, not a general net-loading or GPU improvement.
- All906 RAF intervals retained: maximum133.0 ms, nearest-rank p9533.6/p9983.2,31>50 ms and5>100 ms. Remaining slow frames116.4/116.5/116.4/133.0/116.6 all occur later, outside the actor adoption window. Fluency gate remains OPEN.
- First recorded interval is negative(-77.8 ms), retained exactly: a manual start timestamp and an already-scheduled RAF timestamp use different capture points. This is an instrumentation diagnostic, not a physical negative frame or evidence of two render loops. Percentiles are reported over the preserved data, no silent filtering. Timer-query GPU performance is not measured here.
- Restore-sync34.0 ms; no sync-crop-resize witness. Initial capacity preparation remains effective in this observation.
- Snapshot Worker272.8 ms,473chunks, delivery576.1 ms, CPUassembly67.3 ms/10yields. These figures include different scopes and cannot be summed into player wait time.
- Verified progress1/readytrue/pending[]/no error; HUD day101/night. Saved worker readiness completed before GPU warmup. Night005 loop stopped at handoff; no remaining loading voices; console warning/error collection empty.

## Cleanup and scope

Raw progress and audio reports exported before leaving. Pause→Guardar y volver al menú succeeded; native-menu visible. App124 closed, only the explicitly created QA slot removed via fixture123 with visible confirmation, seed closed, viewport reset, browser inventory empty. No original save edited. Initial menu Continue click occurred during journey; the fresh save panel was observed before the actual start click. An early attempt to parse still-empty QA text failed and is not counted as a loading outcome.

Full GLB multiview/pose acceptance, repeated cancellation/restart, physical peak RAM/VRAM, paired baseline timings and remaining long frames still require verification. No production-ready claim and no PR.
