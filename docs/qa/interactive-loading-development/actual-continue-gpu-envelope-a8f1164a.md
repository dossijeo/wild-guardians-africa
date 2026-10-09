# Actual Continue: optional GPU presentation envelope

Source: `a8f1164a`, application `http://127.0.0.1:5290/?qa-loading&qa-loading-gpu`, native menu → Continue → temporary validated archive copy at day 101/time 360. Viewport 1280×720. The archive contains 23,894 historical plants and 36 workers. No other agent rendered or ran a heavy local build during this window. This is a profiled attribution pilot, not an uninstrumented benchmark or an acceptance of smooth loading.

The existing application RAF remained the only presentation loop. The optional asynchronous timer surrounds synchronous diorama-render and cinematic-step invocations, including their submitted subdraws. It excludes asynchronous far preparation/uploads outside those calls. CPU wall witnesses and every RAF interval remain in the raw report; query polling itself may affect pacing. Nested CPU witnesses must not be summed twice.

| GPU envelope | Resolved samples | Median ms | p95 ms | p99 ms | Maximum ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Diorama | 819 | 4.967 | 10.139 | 11.090 | 11.631 |
| Cinematic | 108 | 8.940 | 59.287 | 64.532 | 78.840 |

Extension supported; zero disjoint events, discarded queries, allocation failures, foreign-query conflicts or overflows. There were 931 labelled invocations and 927 resolved samples. **Four queries were still pending at owned close and were disposed; they are not zero-cost samples.** The report retains `pendingBeforeDispose: 4` and `unresolvedAtDispose: 4`. No late query was kept alive after close.

931 RAF intervals are preserved, including the first negative diagnostic capture interval (-82.1 ms). Four intervals exceed 100 ms: 116.4, 116.3, 116.4 and 116.4 ms. The first is before the cinematic and contains a 5.098 ms diorama GPU sample. The other three contain cinematic samples of 32.292 ms, 56.413 ms and one unresolved query respectively. Their timing is evidence for attribution, not proof that any one draw caused the entire RAF gap. The maximum synchronous cinematic invocation was 36.2 ms.

The first/last cinematic invocation timestamps span 3,991.8 ms. Using offsets from the first invocation as approximate phase bins (the clock advances by RAF dt, so these are not exact branch boundaries), late panorama/travel samples are materially more expensive than leaving the diorama. The travel bin has 18 resolved samples, median 57.278 ms and maximum 78.840 ms. This gives a concrete GPU cost to investigate without blaming only JavaScript or reducing quality speculatively. It does not attribute unqueried preparation or approve 60 FPS.

Readiness was genuine (`progress: 1`, `ready: true`, pending milestones empty), no recorded loading errors. Snapshot transport: 473 chunks, Worker decode 232.8 ms, delivery 497 ms, assembly CPU 53.6 ms with eight cooperative yields. All 36 actor jobs completed, zero failed/pending, 19 yields, 193.6 ms accumulated CPU, maximum individual job 13.1 ms; the queue closed. No crop resize was introduced.

Audio trace records an unlocked running context, one `amb_night` loading ambient request on the ambient bus, and its stop at sky handoff; no loading voices remained. No warning/error console entries were observed.

Cleanup used ordinary UI: final victory notice → Continue in this world → required hiring confirmation in the disposable slot → Pause → Save and return to menu. The menu was verified before closing the application. The temporary slot was removed through the fixture with visible confirmation; the fixture closed, viewport reset, and browser inventory was empty. The original archive/save was not modified. Hiring occurred after the loading report closed and is outside its measurements.

**Status:** attribution obtained, fluency gate remains open. Retain this negative pacing evidence and all unresolved results. No production asset or quality change, no PR, no peak RAM/VRAM claim.
