# Actual menu Continue: bounded snapshot delivery14893449

Runtime14893449 frozen during both runs; actual native menu → Continue → temporary IndexedDB copy → loading → HUD → pause → Save/return-menu. No fixture gzip/hash/serialization during presentation, no GL/resource probes and no additional RAF loop. Existing application RAF diagnostic collects every interval until immediately before final HUD draw; it is not GPU timer/presented-frame data. Viewport1280×720. Root/repair confirmed no concurrent heavy CPU/GPU tasks. Browser caches were not deliberately cleared; no cold-cache claim.

Dense copy: native audited b485768f1cc172c5b174138f2c678e2bfa2d0b544d5316a3e9cb3dddf33f9103, day101/23,894historical plants/36workers. Only temporaryslot identity/save timestamp and explicit testclock360 changed. Native validation retained. Smallcontrol: production menu QA day1 snapshot, same diagnostic/runtime/viewport, original single-message transport.

|Metric|Dense114|Small116|
|---|---:|---:|
|Recorded RAF intervals|887|728|
|Maximum interval ms|266.100|116.500|
|p95 interval ms|49.800|33.300|
|p99 interval ms|83.300|66.400|
|Intervals >50ms|34|13|
|Intervals >100ms|7|1|
|Presentation elapsed ms|18570|13891.700|

Dense native Worker parse/complete validation295.5ms; delivery533ms,473ACK chunks, accumulated measured handler assembly60.3ms,9cooperative frame yields. Completion diagnostic timestamp20543ms; containing RAF ends20551.8ms and interval16.7ms. The32recorded RAF timestamps inside the estimated delivery window range16.2–17.1ms. This is a local witness of responsive result delivery, not proof of structured-clone-only causality or paired overall improvement. The older034ccc0f containing interval132.9ms is retained independently.

All7dense intervals >100ms occur after Worker completion:116.3,266.1,231.7,132.9,116.4,116.3,116.3ms. Maximum266.1ms at24974.9ms follows chunks milestone finish24710.8 and precedes GPU milestone start27428.1; marker containment does not identify the individual blocking operation. No frames are removed. Overall loading fluency remains REJECTED/open. Smallcontrol Worker1.1ms returns the original mode:worker diagnostic without streamed/chunks fields; containing RAF16.6ms. Its later maximum116.5ms is retained.

Both progress traces finish closed:true/cancelled:false, ready:true,progress1,pending[] and no error. Dense HUD shows day101/21:29; small day1/07:06. Logs warn/error[] in both. Real audio005night/004day starts before soilinteraction, stops at handoff, running context and zero remaining loadingVoices; no028initial plants. Save/return-menu verified, tabs114/116 closed, temporary slots113/115 removed with visible confirmation, seedtabsclosed, viewportreset, final browser2 inventory[]. Actual-app context loss was not queried; do not infer a measured GPUcleanup count from menu return alone.

Build14893449 PASS:Vite6.08s,310modules, snapshot Worker11.55kB; existing bundle-size warning retained.28directed tests PASS0skip. No physical peakRAM/VRAM claim, no total-time paired ABBA, no featurePR. Final UI/mockup polish, broader matrix/lifecycle and performance acceptance remain pending.
