# Tutorial update invalidation

The Worker tutorial bridge previously submitted `tutorialCommand(update)` from the presentation loop, even when the authority had already evaluated the same inputs. Each command could produce a full publication and increase the load on the historical presentation channel.

## Decision

The authority remembers the complete serialized game state and the controller's internal state immediately before the last `update`, including the active narration, profile observations and a conservative generation for other tutorial commands. It reports `tutorialUpdate: {needed, narrated}` after each authority command. The status is clean only when all inputs are still exactly equal to those used by the last update. If an update itself changes an input, the status stays dirty and a subsequent update is permitted. Other tutorial commands invalidate conservatively; narration changes also bypass the clean certificate.

The host presents this status only with its corresponding confirmed publication. The bridge suppresses an update only for a confirmed clean certificate with the same narration; without a certificate it retains the previous polling behavior. The graphical stream receives publications with this metadata removed, including when normal publication flow supplies recovery snapshots. Status validation rejects unknown keys, invalid booleans and unknown narration IDs. Coalescing retains changes between dirty and clean statuses.

This does not move tutorial decisions into simulation ticks or change the rules for pauses, narration, actions or event ordering. Explicit presentation, dismissal and advance commands retain their existing roles. Internal tutorial commands invalidate the certificate even if they might have had no observable effect.

## Alternatives

- A partial JavaScript fingerprint would be cheaper but would require proving a complete set of dependencies across tutorial messages, timers, game state and future changes. Missing a dependency could silently suppress an update, so it was rejected.
- Automatically reevaluating tutorial logic in authority ticks would eliminate the command round trip but changes evaluation timing and could alter pause or event ordering. It is a separate architectural change requiring its own behavioral validation.
- The exact authority-side certificate eliminates only demonstrably identical requests without introducing a second source of truth. It preserves the existing ordered command boundary.

## Cost and limitations

The comparison includes the entire authoritative state, so ordinary simulation advances normally invalidate it. Visible tutorial advances and other tutorial actions also invalidate conservatively. The gate can therefore still issue one query per changed state; it does not promise to eliminate visible advances or solve publication backlog on its own.

For unprojected prepared transport, the comparison reuses the prepared representation but materializes its full snapshot string. Projected paths and compact unchanged publications require a separate complete serialization. The additional CPU time and memory cost have not been measured.

The real islets capture `.cache/historical-islet-gated-attack.json` still showed `tutorialUpdate.needed=true` and 71 updates at approximately 14.7 seconds; the gate alone did not eliminate the observed backlog. Two real picks were rejected as stale. These observations do not establish a GPU or performance improvement.

## Verification

The targeted suite passed 141 tests, including authority/bridge behavior, a native WASM authority fixture, voice and pause parity, strict status validation, dirty/clean coalescing, hosted runtime and recovery journal checks:

```powershell
.\.cache\tooling\node20.exe --test tests/worker-tutorial-update-invalidation.test.js tests/worker-tutorial-bridge-retry.test.js tests/worker-tutorial-atomic-resume.test.js tests/worker-hosted-runtime.test.js tests/host-publication-queue.test.js tests/presentation-recovery-journal.test.js tests/worker-game-runtime.test.js
```
