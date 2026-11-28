# Worker autosave availability ordering

The autosave controller preserves a confirmed boundary when the Worker cannot
produce a restorable checkpoint. Previously it needed to observe an unavailable
state followed by an available one. If that interval fell between observed
publications, it could wait indefinitely even after the Worker reported an
available state again.

The gameplay Worker path now supplies the confirmed publication sequence with
the availability flag. The controller compares it with the sequence returned by
the failed snapshot: only a later confirmed, available publication rearms the
save. This works whether that publication arrives before or after the failed
snapshot result, and an older publication cannot overwrite a newer observation.
The same sequence cannot repeatedly trigger requests. Callers that do not provide
sequences retain the previous transition-based behavior. Storage errors and
disposal still stop automatic retries; no partially restorable state is saved.

`tests/autosave-events.test.js` covers both message orders, stale and repeated
sequences, and the real Worker save coordinator with mocked snapshot delivery
and storage. This is a protocol-level test, not a complete browser session or a
failure-injection test against a real Worker.
