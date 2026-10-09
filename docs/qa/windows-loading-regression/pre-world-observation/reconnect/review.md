# Reconnect ownership correction

The previous974d9ef7 gap is retained in before.json: a boundary retaining the old tracker could invoke the prior hook and repopulate early rows after reconnect/abort. CPU reproduction is not a native render measurement.

One bridge now owns exactly one span tracker. connect rebinds its forwarding hook instead of allocating a new tracker. Active awaited spans, ongoing app-pre-world-setup completion and first early scalar summaries survive reconnection; the previous forwarding hook is released immediately. release terminates this same tracker and identity-restores only the latest external hook while the current hook is owned. An independently replaced hook is left intact. Late callbacks/boundaries/rebind cannot restore rows or prior hooks after terminal clear.

The reentry guard recognizes the same forwarded event object and event kind, preventing a direct forwarding hook from double-recording/calling itself. A different nested event still records and calls the previous hook with its original this/args/return/exception. It does not attempt to repair arbitrary malicious recursive callback graphs.

74 directed CPU contracts pass. New regressions cover ongoing boundary across reconnect, preserved early rows, old hook release, abort/late retained callbacks, one tracker over1000reconnections, external ownership replacement, direct forwarder and distinct nested events. Build/package logs and source hashes accompany this correction; SFX inventory/main/smoke/compiler/World/diorama/budget/workflow remain byte-identical to974.

The selected17labels include mutually exclusive ordinary/batched maize upload labels. A normal preparation uses at most16selectedlabels; unexpected additional selected modes produce an explicit dropped-event count, never silent acceptance. No new clock reads outside smoke, GL calls, timer, recipe or90s gate changes. No Windows dispatch, GPU, PR or promotion before root review.
