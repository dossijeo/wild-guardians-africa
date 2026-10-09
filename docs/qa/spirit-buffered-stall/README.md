# Buffered spirit narration survives stalled downloads

The narration controller previously treated `stalled` and `waiting` identically.
Either event armed a watchdog which released the clip after twelve seconds,
even if buffered audio was still playing. This could unlock timed caption
progression before the actual `ended` event.

The handlers are now separate. A download stall during unpaused playback with
`readyState >= 3` does not arm that destructive recovery timer. A real waiting
event, an already waiting clip, paused media or insufficient data retains the
existing recovery path. Initial loading timeout, errors, blocked autoplay,
manual interruption, volume changes and actual-ended progression are preserved.
No voice asset, dialogue, duration, save or gameplay parameter changes.

Browser semantics are documented by MDN:
[stalled](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/stalled_event),
[waiting](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event)
and [readyState](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState).

## Evidence and limits

The new buffered-playback regression fails against the exact pre-fix module
from 8df0e2cb: expected `playing`, actual `fallback`. Its raw negative log is
retained. The patched controller passes 22 directed tests across spirit media,
native caption lifetime, tutorial presentation and daily-message deduplication.
New cases cover a buffered download stall, a subsequent real wait and a hung
initial play promise. The buffered case pins the actual tutorial presentation
until ended. Existing interruption/replacement and recovery cases still pass.

Production build, audio-runtime verification and browser syntax pass. Timing of
the build is not a performance benchmark. The tests use media/DOM doubles and
do not prove audible playback on a physical device or identify the original
user-reported event sequence. Browser QA remains unavailable due to CUA kernel
asset initialization failure. No screenshot or physical audio acceptance is
claimed; full CI on the resulting commit remains separate.

The original logs and source hashes are preserved in `receipt.json`.
