# Removed crop presentation cancellation

Grow and Multiply previously validated neither queued nor active crop targets. If a crop was removed or died while its presentation waited behind Attack, the Guardian could still appear over its old location. Attack already had victim lifetime checks.

The renderer now rejects missing/dead crop targets at admission, skips obsolete queued crop presentations, and clears an active crop presentation when the crop disappears. Coordinate-only presentations and Shield retain their behavior. No game state, costs, cooldowns, or already-applied spell outcomes are changed. Awakening retains its separate committed-blessing interruption path.

25 singleton/pose tests pass, including four new combinations of Grow/Multiply and missing/dead crops, queued and active. Existing Attack sequencing, impact timing, guide handoff and resource disposal tests also pass. Production build passes in 22.20 seconds with existing warnings.

Native browser evidence: crop-target-cancellation.json. For Grow and Multiply, the fixture removes the real target between presentation frames at age 0.12 s and observes at 0.35 s. All six owned visual objects become hidden, active and pending counts are zero, and no errors occur. This is an artificial lifetime edge case with a presentation clock, not natural crop destruction or a performance test. The QA selector also retains the existing Attack removal case.

## Pending audio follow-up

Grow/Multiply launch audio now checks crop existence/liveness when draining delayed simulation cues, before dispatch, and when asynchronous decoding completes. The decode guard also rejects result, clock rollback, scene replacement, pause and expired audio requests. Already-playing audio is not cut and gameplay is not rolled back. Coordinate-only events and calls without a supplied state retain compatibility.

Forty focused combat/animal/presence lifecycle tests pass, including removed/dead crop cues both queued and decoding, and the seven invalidation conditions for each agricultural spell. These are deterministic audio-routing tests with mocked sound calls; they do not claim a new listening-based browser validation. Production build passes in 16.29 seconds with the existing warnings.

Integration follow-up: four delayed-decode tests now exercise AudioSystem.process, the real sound method and buffer cache (with a controlled fake AudioContext). Removed/dead crops produce zero source nodes, voices or active entries after decoding. A subsequent valid cast reuses the decoded buffer and starts one voice, then stop disconnects it. All 13 presence lifecycle tests pass. This is stronger than inspecting isCurrent alone, but still not browser listening evidence.


## Attack launch cancellation follow-up

The same target-lifetime gate now covers Attack launch audio: removed/gone beasts discard a pending launch and invalidate a decode that completes after cancellation. Previously only the impact cue had this protection for beasts. Targetless compatibility events remain supported. This does not stop an already playing source or change damage/cooldowns. Six regression combinations cover missing/gone targets at queued, immediate and decode phases. The existing emitter-routing fixture now supplies a live beast rather than a nonexistent target. Combat-audio plus presence-lifecycle suites: 23/23 passed; production build passed in 15.52 seconds with the existing chunk/import warnings. This is automated audio-path verification, not a new browser listening review.
