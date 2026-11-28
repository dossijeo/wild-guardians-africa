# Guardian presence audio in the WebGPU Worker

The guardian presentation sends `spirit_appear` once when an active gesture's
model has been admitted and reaches its visual update, and sends
`spirit_disappear` once at the existing gesture outro. Positions are presentation
origins. Confirming a provisional gesture preserves those markers, and seeded
event history does not replay them when a presentation Worker is reconstructed.
The messages do not change simulation or apply gameplay results.

The client validates the two event names and finite coordinates and ignores
messages while the Worker is not running or after disposal. Its owner must also
verify the current world and client generation before playing audio, because a
message from a superseded Worker can already be in flight.

Automated tests cover a provisional cast, confirmation, repeated visual ticks,
reconstruction from event history, invalid messages and disposal with simulated
WebGPU resources. Real audio and timing in a playable integrated scene remain
unvalidated. This integration does not demonstrate a performance improvement.
