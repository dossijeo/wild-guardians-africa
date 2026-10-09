# Music streaming when disk storage is unavailable

At base `2931d3a9`, the active music service worker awaits Cache Storage open
and lookup without a fallback. A denied or revoked storage promise therefore
rejects its audio response before the ordinary network streaming request runs.
This is independent of the bounded initial registration correction.

The worker now catches only disk open/lookup failure. Online playback forwards
the original request, preserving its byte range and other request properties.
An explicitly cache-only request receives 503 without accessing the network.
Network failure is propagated without retries or duplicate downloads. Successful
disk reads/writes, range slicing, cache filling and SFX exclusion are unchanged.

Four new disk-denial tests fail on the previous implementation. The corrected
combined preparation/disk/range/stream/audio-lifecycle suite passes 48 tests;
the final independent 11-case service-worker suite also covers network failure
without a duplicate request. Syntax, original audio runtime hashes and SFX audit
freshness pass. This validates injected failures and response behavior, not a
physical browser outage or audible acceptance. No compression, gain, decoded
PCM allocation or world-loading behavior is changed.
