# Controlled HTTP cache: first native pair

Source cc3e9ce2, Sabana/Mapungubwe, private5293 QA server with unchanged original bodies and immutable cache headers. Fresh scope `rt-cache-20261008`. These are functional transfer/readiness cases, not a before/after performance comparison.

| Case | Verified cache hits | Network | Unknown | Network-body bytes | Observed transfer union |
| --- | ---: | ---: | ---: | ---: | ---: |
| First scope load |5|208|0|97,837,975|3521.2ms|
| Subsequent tab, same scope |177|36|0|45,443,642|3904.7ms|

The first load's server counters exactly match208requests and97,837,975bytes. Its five cache hits come from repeated/resident requests within the actual pipeline. The second tab is **partially retained**, not entirely cached:177verified hits contribute zero download bytes/time, while36remaining requests contribute real transfer work. Do not relabel it a complete warm cache or guess why the browser did not retain the remaining bodies.

Both reached genuine world readiness with exact intended camera/logical state and no reported errors; explicit disposal/context loss and tab closure were confirmed. First load initialization20,594.8ms/controls24,693.6ms, max scheduling interval66.6ms; second20,572.6ms/24,669.1ms, max117.2ms with one intervalover100ms. Timings are single functional observations under historical CPU load, not a gain claim, and the latter retains the performance gate.

Next checks: native deliberately missing GLB/HDR subset, throttled original streams, cancellation, and cached-only metadata transport to verify the zero-network-weight case without claiming world/GPU readiness. A metadata-only check does not replace full-game acceptance.

## Deliberately partial cache

Native partial64 kept the same scope for ordinary resources and used a new URI only for GLB/HDR bodies: 204 verified cache hits,9 network requests,0 unknown/pending/failed,63,226,378 body bytes and750.0ms observed transfer union. World readiness, camera/logical parity, errors[] and explicit disposal/context loss passed. Initialization17,228.1ms/control21,355.8ms; max scheduling interval116.4ms with one interval over100ms, so performance acceptance remains open.

The initial mouse action timed out in CDP dispatch before initialization. Fresh DOM showed Ready; Enter on the native Run button started the test, and Enter on Dispose released the renderer. This proves keyboard operation, not mouse/touch acceptance. Tab64 was closed before the next agent's GPU window.

## Transport completion versus native preparation

Review found that pending GLTF parse previously withheld completed ResourceTiming evidence until onLoad. Thus intermediate download-time estimates could include parse time despite final reports being correct. Apply the completed timing immediately while retaining the native pending flag until loader completion; verified cached responses contribute zero bytes/time even during parse. Two new regressions test fixed network duration during delayed parse and cache-zero/native-pending separation. No100% readiness guard is weakened.

The controlled QA server was restarted after these three reports, resetting counters, to include a cancellation-safe backpressure wait (drain/close/error). Earlier reports remain tied to cc3e9ce2, without silently rewriting their source.
