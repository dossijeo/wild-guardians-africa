# Confirmed terrain capture time

Each newly captured terrain payload may carry `capturedAt`, the simulation elapsed time at which the authority extracted it. It is a capture boundary, not the exact instant of the underlying modification. A checkpoint or bootstrap can capture an older revision again at a later boundary; this metadata does not supply terrain history or authorize visual extrapolation.

Publication coalescing retains the latest payload and its capture time. The terrain journal copies it before transfer; handoff preserves the latest capture time for each revision, and checkpoint data carry the checkpoint capture boundary. Legacy untimed payloads remain valid. Timed payloads must have a finite nonnegative value, and the confirmed receiver rejects one ahead of the state elapsed time at the corresponding confirmed sequence. Epochs, revision numbers, and manifests retain their previous meanings.

The receiver and journal contract tests cover batching, recovery data, handoff and invalid timestamps, and an authority test captures terrain using the real Wild Engine. These checks do not establish end-to-end browser recovery, historical terrain reconstruction, or performance characteristics.
