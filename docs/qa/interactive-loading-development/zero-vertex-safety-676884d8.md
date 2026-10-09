# Zero-vertex safety follow-up (runtime dd0f51d0, QA 676884d8)

The experiment remains QA-only and OFF. The four-arm native comparison did not establish a net cinematic/RAF benefit. This closes the bounded safety follow-up; it does not approve production promotion or overall loading performance.

## Requested resources

Resource A/control and B/zero-vertex used the same dense Sabana/Mapungubwe save. Both restored isolation and zero-vertex flags after verified loading readiness. Both observed 2,197 bufferData calls, 109,160,798 requested bytes, 94,956,936 peak tracked bytes and zero live buffers/bytes after disposal. These are requested API storage commands, not physical VRAM, RAM or uninstrumented frametimes. Binding probes perturb scheduling.

Both immediate disposal snapshots retain exactly five observed texture handles (108-112), each one-level RGBA32F 12x12. Their ownership is not proven by the texture probe. These match the size/type expected for animal skeleton textures; AnimalPreload.dispose schedules spare rig skeleton disposal through resolved-promise continuations, while this fixture snapshots and removes its hooks immediately after World.dispose. Late explicit deletion and implicit context-loss release are therefore not observed. No physical memory neutrality or leak-free texture lifetime claim follows from these snapshots. Cancellation earlier in loading observed zero live textures and buffers.

## Temporal readback

The separate Gran Rio/Suajili dense temporal fixture completed 21 samples, ten newly installed chunks, 34 actors and 952 animated bones. Every immediate framebuffer following the upload matched exactly, every zero-vertex upload reported zero triangles, the renderBufferDirect method and borrowed flags were restored, logical state was unchanged and cleanup/context loss completed without console errors. Following ordinary-frame variation reached 168 changed channels versus 154 for ordinary control; this is retained as a diagnostic, not blanket visual equivalence. Readbacks invalidate performance claims. Three capture PNGs remain embedded in the raw report.

## Cancellation

Native cancel occurred at 61.4 percent, last milestone warmAnimalModels:end. cancelled/done/disposed/contextLost were true; the owner rejected with the expected cancellation diagnostic, errors and console were empty, and observed live buffers/textures were zero. The raw fixture's 183 ms RAF interval is preserved; this resource-instrumented synchronous fixture is not an actual-application loading benchmark. Dispose was then explicitly pressed, the tab closed, viewport reset and browser inventory verified empty.

Source inspection identified a QA-only heartbeat omission: Cancel did not cancel its RAF or disconnect its long-task observer until Dispose/pagehide. The subsequent fixture correction now stops both at Cancel. The captured run predates that correction and must not be described as validating it or as evidence of a production loop defect. Production uses the existing single application RAF and separate cancellation ownership.

Next work resumes the required native wood/parchment mockup polish and original compatibility/lifecycle/progress gates. No additional zero-vertex optimization campaign is planned from this evidence.
