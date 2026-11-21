# Main-game audio capture

The development-only `?qa-game-audio=1` route installs a recording tap on the existing SFX and music buses. The gameplay recorder requests this tap synchronously before the selected world click reaches the game, combines it with the canvas stream, and releases capture connections and tracks after recording. Audible destination connections remain untouched. Locked or unavailable audio produces an explicit failure, not silent video presented as audio evidence.

This captures neither DOM HUD nor HTML tutorial narration. It does not complete the requested voiced tutorial recording. Existing `attack-main-gameplay.webm` remains the historical silent recording; no new audiovisual acceptance is claimed by this change.

Validation: four Node tests pass for bus capture, idempotent cleanup, partial connection failure, locked context and rejected receiver/listener removal. Production Vite build passes (7.81 s, existing chunk/import warnings). Searching production assets finds neither the capture event nor its diagnostic text. Actual browser recording and perceptual synchronization review remain pending.

Browser follow-up found that the fixture's local `location` descriptor shadowed the browser URL, dropping the audio opt-in on navigation. Qualified the flag read with `window.location.search`; this is a fixture routing repair. Audiovisual acceptance still requires an actual recording.

## Camera diagnostic capture

The development recorder now samples camera eye/target, raid director travel, animal recovery phases, structure health/status and camera collision-correction counters every 100 ms only while recording, with a separate downloadable JSON. This instrumentation distinguishes raid framing from scene collision resolution without changing either controller. It is not performance measurement. The summon system's inspected paths read camera state for placement/aiming; this alone does not prove what moved the camera in the prior video. No attribution is made until a trace reproduces the movement.

Four capture cleanup tests pass; production build passes in 8.33 s with existing warnings. Production asset search finds neither raidTravel nor the capture event. Graphical trace recording remains pending.
