# Spirit voice stall recovery

2026-10-07. A controlled media double reproduces waiting before the outstanding play promise resolves. Before correction, that later promise clears the recovery timer and leaves status playing indefinitely; the new test failed (playing instead of fallback). The promise now preserves recovery while waiting; an actual playing event cancels recovery once media resumes. Both waiting and stalled handlers share this state.

30 directed tests passed, covering the 54 original ES/EN clips and exact text lookup, media replacement, denied autoplay, load failure, stalled playback, action guidance and its independent simulation pause. The recovered case advances only on ended; the unrecovered case releases media and falls back without claiming the clip finished.

This is a deterministic handler-order regression with media doubles. It does not establish the frequency of this event order in Chrome, prove playback on a physical phone or certify perceptual audio quality.
