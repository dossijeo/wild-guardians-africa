# Native impact and retreat audio routing

2026-10-30, production code at f722a13d1. Browser fixture uses `lightingReview=1`, reports `spatial-wasm`, and advances with actual Game.tick. Audio was explicitly unlocked and the existing SFX bank preloaded through its QA button.

In the retreat trial (`retreatTrial=1`, initial resilience deliberately set to one hit), hyena hurt and the quiet magic contact both successfully created audio sources at 0.26633 simulation seconds while the actor was falling. Guardian appearance, launch and disappearance also created sources. The hyena retreat cue was emitted once at 8.049915 seconds, with actor phase retreating, after recovery. The actor then leaves the raid at zero resilience. Receipt: native-audio-retreat.json.

`played: true` means AudioSystem returned a source, with AudioContext running. It does not prove listening quality, speaker output, waveform synchronization, clipping or perceptual mix balance. This was a routing validation, not a recorded listening review. The reduced-resilience fixture is not a balance test.

The focused animal, Guardian and combat audio suite passed all 46 tests, including species-specific routes, no retreat on ordinary hurt, delayed decode invalidation, pause/scene replacement, and camera-distance gain updates. Command: `node --test tests/animal-audio.test.js tests/guardian-combat-audio.test.js tests/guardian-audio.test.js`.

The ordinary-resilience control also completes on spatial-wasm: hurt/contact sources start at 0.266545 s while falling; no retreat cue occurs. The hyena returns to walking with 28 resilience and a neutral cue at 11.9622 s. All six requested audio sources return successfully, no runtime errors, maximum one Guardian. Receipt: native-audio-normal-hit.json. Neither case includes a continuous visual or listening review.
