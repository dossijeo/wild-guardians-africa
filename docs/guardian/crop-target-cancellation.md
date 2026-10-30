# Removed crop presentation cancellation

Grow and Multiply previously validated neither queued nor active crop targets. If a crop was removed or died while its presentation waited behind Attack, the Guardian could still appear over its old location. Attack already had victim lifetime checks.

The renderer now rejects missing/dead crop targets at admission, skips obsolete queued crop presentations, and clears an active crop presentation when the crop disappears. Coordinate-only presentations and Shield retain their behavior. No game state, costs, cooldowns, or already-applied spell outcomes are changed. Awakening retains its separate committed-blessing interruption path.

25 singleton/pose tests pass, including four new combinations of Grow/Multiply and missing/dead crops, queued and active. Existing Attack sequencing, impact timing, guide handoff and resource disposal tests also pass. Production build passes in 22.20 seconds with existing warnings.

Native browser evidence: crop-target-cancellation.json. For Grow and Multiply, the fixture removes the real target between presentation frames at age 0.12 s and observes at 0.35 s. All six owned visual objects become hidden, active and pending counts are zero, and no errors occur. This is an artificial lifetime edge case with a presentation clock, not natural crop destruction or a performance test. The QA selector also retains the existing Attack removal case.
