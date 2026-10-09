# Browser-confirmed zero-download case

Sourcee7531564; transport-only metadata fixture in private5293server. No WebGL, world, actors or gameplay readiness. Original content/skies,models,ground-materials,biome-savanna JSON files were each fetched and parsed through the production LoadingTransferOwner and fetch wrapper.

Iteration1: four real network requests,33,633decoded body bytes,15.5ms overlapping transfer union; all four parsed and readinessconfirmed. Iteration2 within the same tab and URI: four ResourceTiming-confirmed browser-cache hits,0network/unknown/pending/failures,0downloadbytes and0estimated/observeddownloadtime. Monotonic=true, ownerdisposedbothiterations. A250ms metadata preparation estimate is declared explicitly and is not the game's14s work estimate. This proves the cache-only transport weighting branch, not a fully cache-resident game or benchmark.

Native slow cancellation server counters (separate earlier tab65):20assetrequests/42,404,872bytes,19completed/1cancelled. Completed bodies41,552,904bytes agree with pre-cancel progress; additional851,968bytes belonged to the interrupted response. Statistics endpoint reads counters only and makes no asset requests.

All tests used native keyboard Enter on visible controls; screenshots/reports are original browser results. Tab66closed. Full slow completion, accepted planting, actualmenu cold/slow and peak-resource/performance coverage remain acceptance gates.
