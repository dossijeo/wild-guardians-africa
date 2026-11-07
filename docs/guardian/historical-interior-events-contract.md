# Historical presentation: interior events

The opt-in `VITE_HISTORICAL_EVENT_BOUNDARIES=true` profile connects the
simulation authority, presentation stream and historical clock. It also
requires `VITE_HISTORICAL_PRESENTATION_RECOVERY=true`; both are off by default.
The same profile is fixed before authority startup and when its renderer is
attached or replaced.

During an unchanged simulation cadence, the authority captures a version-2
delta at each event observer, followed by a silent delta at the end of a tick
that emitted events. Quiet ticks are not serialized for this feature. The
consumer validates the complete delta chain privately before use. Events at the
same simulation time are applied in their recorded order against their own
states; the silent delta installs later mutations without re-emitting events.

The historical clock stops at each subboundary. The pump slices the confirmed
motion and clock observations at actual sampled ticks, and the participant
group independently certifies each slice, including terrain support and actor
separation. Presentation hooks receive the reconciled state and time before
the event observers. The external publication sequence remains unchanged and
its ACK is emitted once, after the final state. The final presentation hook
does not replay events already delivered inside the interval.

The receiver refuses the experimental path when evidence is incomplete,
ordering is ambiguous, an intermediate state is invalid, or recorded causal
states and post-tick endpoints cannot be validated. Changes to `suppressed`, `structures`
or `villages` remain on the ordinary boundary path because their spatial and
visibility consumers do not yet have an interior revision contract. Physical
activity, unrepresented lifecycle facts, changed world or terrain and missing
support likewise retain their existing safety barriers. A transient failure
after applying a subboundary invalidates the presentation; a replacement
generation replays from the retained external checkpoint. It does not rewind or
re-emit already delivered events in the same generation.

Capture and decode use bounded intermediate data. Complete actor paths replace
their projected form while this profile is enabled, increasing transfer cost.
The producer also snapshots state at each event to compute its delta, and the
decoder materializes bounded intermediate states. No performance improvement
is claimed without measurement.

`tests/historical-event-boundaries.test.js` covers a real Wild Engine night
transition, observer-time mutations, multiple events at one timestamp, silent
post-tick reconciliation, invalid data, pause and a replacement generation.
That integration uses test doubles for graphical rosters and terrain.
`tests/historical-event-auto-recovery-integration.test.js` covers the recovery
coordinator with real authority and stream. The clock, slice, event playback and
surface-hook tests cover timing and dependency contracts separately.

```text
node --test tests/historical-event-boundaries.test.js tests/historical-event-auto-recovery-integration.test.js tests/confirmed-historical-event-playback.test.js tests/confirmed-historical-clock.test.js tests/slice-historical-preview.test.js tests/webgpu-historical-boundary-sync.test.js
```

The real WebGPU/Worker native-islet raid now completes an admitted publication:
four events at two subboundaries, one completed external publication and no
automatic recovery. It uses real rigs and canonical terrain, on an NVIDIA
Turing hardware adapter with no fallback. The final run and a preceding run
both pass. See [hardware evidence](b-close-20261107/historical-events.json).

The necessary fix was an explicit, transactional continuation of GPU motion
inside the same publication, including a certified stationary interval between
moving intervals. Ordinary reset still rejects reused versions. See the
[continuation contract](historical-event-motion-continuation.md).

This closes the implemented event contract in the integration profile, not
every possible event or visual effect. Unsupported intervals keep the normal
endpoint path. Combined interior events with active physical impacts, device
loss during that combination, prolonged campaigns and artistic parity remain
outside this hardware test. The feature remains opt-in.
