# Disappearance cue alignment

Inspection found the world summon emitted spirit_disappear only after age > 2.2 seconds, when hide() immediately removed the body. The shader starts dissolution at 1.5 seconds. Cue now fires once at that boundary while the body is still visible; a reused summon resets its cue flag. If an update jumps beyond the entire lifetime, the vanished summon does not emit a late disappearance cue.

Existing world audio callback retains distance attenuation, family/emitter limits and asynchronous freshness checks. Existing species hurt routing and impact cue queue remain unchanged. AnimalAudio separates down/stunned from retreat, so recovery/retreat observation governs its retreat vocalization independently of the impact sound. No new sound asset or dependency added.

49 singleton, GuardianAudio and AnimalAudio tests pass. New lifecycle regression checks no early cue, one cue at dissolve while visible, no duplicate, reset on reuse, and no stale sound after a large time jump. This is scheduling evidence; no perceptual sound or mix acceptance claimed. The silent main-game video predates this sound-timing correction.
