# Watering checkpoint resource availability

An active watering effect needs its validated emitter profile to reproduce the
historical work state. A failed network request previously made checkpoint
preparation fatal even though the profile loader could recover. Once the
presentation journal reached its limit, it could therefore lose its live
presentation stream rather than retrying the complete checkpoint.

The live checkpoint now defers on a network error or transient HTTP status (408,
429, 5xx). While confirmed work still needs watering, the loader retries after
one second independently of rendering. Completion uses the existing work-input
availability signal to rearm the journal; the next publication still creates a
complete checkpoint. Removal of the work prevents another request, and disposal
cancels the timer and in-flight fetch. Invalid JSON, incompatible profile hashes
and permanent HTTP failures remain definitive errors. Recovery replay still
refuses to acknowledge a watering effect whose inputs are missing.

`tests/confirmed-presentation-stream.test.js` exercises the real journal,
publication channel and VFX checkpoint with a transient download failure,
including a saturated journal, resumption and ordered confirmed events.
`tests/webgpu-agriculture-vfx.test.js` covers retry without render activity,
incompatible data, removed demand and disposal. Run both with:

```
node --test tests/webgpu-agriculture-vfx.test.js tests/confirmed-presentation-stream.test.js
```

These are deterministic integration tests with mocked asset requests and terrain;
they do not replace a browser or GPU run.

## Recovery replay

`ensureRecoveryWorkReady()` also waits through transient failures during replay.
The wait is cancelled when the attempt or surface closes and is limited to eight
seconds, inside the host's ten-second overall recovery deadline. Permanent asset
errors still fail immediately. Timeout fails the recovery rather than accepting
an incomplete effect; a new attempt requires the retained journal.

The legacy receiver awaits work inputs before acknowledging the publication.
The temporal receiver applies each boundary once, then awaits work inputs before
delivering its events or acknowledging it. On cancellation or failure the hidden
surface is discarded, not partially handed over. The existing terrain-pending
condition remains a separate error and is not automatically retried by this wait.
`tests/temporal-recovery-pipeline.test.js` exercises the real journal, temporal
channel, terrain/state receivers and VFX loader with a failed first request and a
gated retry; it verifies the boundary is applied once and its events and ACK stay
pending until the complete work effect is ready.
