# Full protected flat replay protocol, still OFF

The bounded surface/slope/coarse profile demonstrates exact warm-query improvements, but not full protected performance. Run one fresh protected A1/B1/B2/A2 fixture with the same input snapshot, native hire, IDs, funded-defense policy, protected reserve35 and ordinary tick as prior replays. A uses diagnostic native lattice, B uses flat memo. Closed-approach shortcut stays OFF in both; no policy, Game, nav geometry, crop or price changes.

`tools/replay_native_flat_lattice_cache.mjs` writes raw decision/state before parity checks, validates source hashes before/after each arm, and restores OFF in finally. Full action, decision report and serialized ledger/workers/crops/events/clock/RNG state must match. Failed or partial arms remain preserved; no retry. Flat out-of-domain/zero-axis coordinates use native lattice, reported separately as coordinate bypasses. No numerical approximation or collision bypass.

CPU profiling is enabled for this single replay. Per-arm actual proof start/end monotonic microseconds are recorded only in diagnostic rows, permitting later profile attribution if the profile's clock domain validates against those boundaries. Profile setup/hash/read/write time must not be summed into proof timing or counted twice. A large gain is required before a protected campaign, not just high memo hit ratio or one favorable arm. Defaults remain OFF; no PR/merge/100-night acceptance follows automatically.

Preflight: 17/17 directed tests pass (2808.6536 ms), syntax and diff checks pass. Existing negative terrain/nested results remain byte-exact on their original branches/archives. Inactivity is outside acceptance. No main/cinematic branch, rendering, GPU or gameplay changes are included.
