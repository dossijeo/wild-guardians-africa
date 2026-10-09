# Bounded loading — native New Game and first crops

Case86, feature runtime0fbc67bc, QA-only helper/flag commit755d2e5f (retention and shadow-program flags **disabled**). Sequential native IAB context at media/Sabana/Mapungubwe, 1280×720 CSS / 1600×900 world drawing buffer. No BufferRequests, TextureRequests, GL-call trace or GPU timer queries. No historical CPU campaign was active in the previously verified environment; this run did not independently take a fresh process inventory.

New Game reached verified readiness with logical state and intended camera preserved, errors empty. Initialization29,245.6ms; controls33,317.8ms. 1,941 recorded RAF intervals, maximum116.4ms;3 above50ms and1 above100ms. These are browser callback intervals and CPU wall-time proxies, not presented frames or GPU durations. This single run is not a matched before/after improvement or full fluidity acceptance.

Ordinary paid QA commands constructed a centre and planted one original maize, then one original millet. Maize first draw122.0ms; two-second RAF window maximum116.6ms with1 above100ms. Millet first draw69.8ms; RAF maximum66.4ms, none above100ms. The first-crop stall remains a release gate; neither bounded waits nor resource cleanup removes this cost by itself.

Explicit dispose reported context lost, errors remained empty, console warnings/errors empty, and the tab was closed with selected-browser inventory empty. The raw JSON retains all phases and actions.

## CPU contract corrections

Loading-only far compilation now owns its program polls (shared core, screen state restored synchronously), rather than leaving Three.compileAsync's internal timer alive after cancellation. A queued job can cancel while the previous owner's frame is suspended. An initial new queue test failed because its wait callback consumed a premature RAF; the first run ended71/72, exit1. The corrected gate wait consumes no RAF while waiting admission, and its fixture releases the previous frame in finally even on failure. Two subsequent runs passed72/72. Cooperative decode subsequently gained the same owner/deadline wait as its frame/fence paths;74/74 directed contracts pass, including suspended RAF, never-resolving decode and observed late rejection. Ordinary gameplay and root QA option defaults remain unchanged.

The texture uploader now checks the AbortSignal before material collection and on both sides of each native submission.12 targeted texture/yield contracts passed. These CPU tests do not demonstrate native timing, total RAM/VRAM neutrality or every loading cancellation phase. All wider visual/performance/integration gates remain open; no PR is approved.
