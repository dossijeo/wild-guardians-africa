# IndexedDB open ownership regression

Before source: main `5e717e08`. Three independent request-event regressions fail against that source: a blocked request later succeeds without closing its orphaned database; an old versionchange invalidates a new connection and its certified snapshot; a synchronous open error permanently retains the rejected connection. The original failing log is retained.

The fix gives each open promise ownership of its connection-cache entry, closes late results from rejected blocked requests and clears synchronous failures for retry. Old callbacks close only their own database and cannot invalidate a newer connection or its certified snapshot. Ordinary concurrent opens still coalesce; the slots schema remains unchanged. No save data, format, camera or loading deadline changes.

Nineteen directed tests pass: four request-lifecycle regressions, six durable snapshot/cache tests and nine prepared-load tests. `node --check src/persistence/browser-saves.js` exits 0. Media/browser storage doubles prove callback and transaction contracts; this is not a native browser multi-tab or physical-device acceptance claim, nor a diagnosis of the separate Windows world-loading timeout.

Reproduce:

```powershell
node --test tests/browser-save-open.test.js tests/browser-save-cache.test.js tests/prepared-save-load.test.js
node --check src/persistence/browser-saves.js
```

Receipt hashes the original uncompressed logs and repaired source. Full CI remains separate.
