# Main-game Attack input probe

Open the development server at `/?qa-main-attack=1`, continue an existing QA save and press **QA: attack next visible beast**. Resume any normal hiring/tutorial/pause dialogs. One attempt is armed; no new raid, health, energy, cooldown or camera state is injected.

The probe finds a visible animal using its rendered bounds and confirms the actual `WorldScene.pick` result, including occlusion. It opens the real Power menu, selects the enabled Attack button and dispatches a pointer down/up pair to the real canvas. The production tap handler and spell-selection route decide whether the command is accepted. Its pointer events are synthetic; this is an automated input integration test, not proof of human/touch usability. A consumed cooldown is the acceptance signal. It observes target state/health, down/recovery transitions and maximum Guardian count for 15 simulation seconds.

Read the JSON displayed in the probe panel after it finishes. Capture the rendered scene separately: state transitions alone do not prove artistic animation quality, palm launch position, audio synchronization or absence of mesh intersections. This development-only probe is removed from the production build.

Initial build check: production build passes in 20.82 seconds with existing mixed-import and bundle-size warnings. No `main-attack-probe`, `qa-main-attack` or probe button text is present in built assets. Graphical execution results will be recorded separately after a completed attempt.


## Observed run, 2026-10-30

Suajili QA save, day 3, normal hiring cost and night progression, real main game. First attempted synthetic input while widening the camera view was not accepted (cooldown remained zero); its precise cause is unresolved. A second user-armed attempt with a settled view hit buffalo animal-20 via the menu/canvas route. No captured console warning/error was returned before that successful attempt.

`main-ui-buffalo-probe.json`: accepted, cooldown 0 → 12 → 0, initial species resilience 140 → 112, maximum one Guardian. Falling sampled at +0.300 s, rolling +2.611 s, recovering +3.027 s, normal again +7.067 s, attacking +12.937 s. Recovery position differs by approximately 1.55 m from the contact position. The screenshot shows the recovered actor at strategic distance; it does not provide continuous visual evidence of the fall or precise palm/projectile origin. Synthetic DOM input is clearly marked in the receipt.

The second accepted cast after the natural cooldown is shown in `main-ui-buffalo-second-cast.png`: health 112 → 84; one Guardian. It shows early manifestation effects in the actual populated scene, but the distant view does not establish detailed cloth/hand or collision quality.

Second completed receipt: `main-ui-buffalo-second-cast.json`, normal again at +8.182 s and attacking at +14.534 s; final cooldown zero. The game reached the normal day-4 hiring pause. No game balance or animation changes were needed for these two accepted input-route tests.


## Continuous main-game recording (2026-10-30)

Add `&qa-main-attack-record=1` to the probe URL. Start the existing local receiver with `python tools/guardian/receive_video.py --port 5206 --output C:/tmp/guardian-main-attack-recording`. Recording begins before synthetic canvas input and stops after 15 simulation seconds, on scene close/change, or at the probe's 90-second wall-time cutoff. The receiver writes combat-cycle.webm; archive it before another run. Source audio buses are tapped without replacing audible connections. A missing/unlocked audio failure is explicitly recorded in the receipt. No HUD is included in canvas capture.

`main-ui-lion-recording.mp4` is a 15.24 s, 1600x900 H.264/AAC capture of the real day-4 Suajili raid. No health/cooldown or clock overrides. One accepted hit on entering lion animal-22 (112 → 84), cooldown 0 → 12 → 0, maximum one Guardian. The receipt records falling +0.250 s, rolling +3.294 s, recovering +4.807 s and normal +8.915 s; it then continues entering from its reconciled position. Recording and observation both completed.

Inspected `main-ui-lion-recording.jpg` (one frame/s overview) and `main-ui-lion-contact.jpg` (8 fps crop of the first 1.5 s). The bright discharge visibly connects Guardian and target, the lion moves sideways and falls, subsequently rolls/gets up and resumes moving. The body/vortex remain in view during the spell; mantle and ornament poses vary. Plants partly obscure the ground contact. This sampled inspection is not frame-by-frame continuous playback or proof of every palm/foot/contact surface; the first encoded frame is already in materialization, so anticipation is not certified. The file is continuous, unlike the sampled contact sheets.

An AAC track is present; source audio measurement mean -32.4 dB, peak -11.6 dB (non-silent). This is not a listening-based acceptance of SFX identity/mix or exact audiovisual synchronization. The rendered lighting is the game's current raid lighting, not a staged night-light preset. Camera framing was widened once during daytime before the raid; the existing raid camera remains active. This recording is not a performance benchmark.

Four existing capture-audio lifecycle tests pass. Production build passes (23.65 s, existing import/chunk warnings); final QA source syntax checks pass. The development-only capture remains outside production output.
