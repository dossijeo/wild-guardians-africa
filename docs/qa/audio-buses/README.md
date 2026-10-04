# Audio buses and emitter admission

Plan 19.2 now has separate music, ambient, world and UI gain buses. Ambient/world/UI feed the existing public SFX master, and music retains its own public master. Changing scenes stops/disconnects voice nodes, while the reusable buses stay connected until AudioSystem disposal closes them and the context.

The existing budgets (20 SFX overall and 4 per sound family) now also constrain an identified emitter to 2 concurrent voices across families. Admission happens after decoding; all saturated constraints are checked before any lower-priority voice is evicted. A rejected cue leaves existing voices untouched. Danger/results retain their priority and global UI placement. Music stems do not consume these SFX budgets, and playbackRate remains 1 at every simulation speed.

Real work-completion facts carry workerId; structure contact carries animalId. The production frame supplies the current state and camera-control target. World one-shots attenuate by horizontal distance using 1/(1+(distance/24)^2); UI feedback, danger and results remain unattenuated. Audio reads these facts without updating simulation, money or RNG. Older events lacking actor metadata remain readable and can use their target identity.

`tests/audio-buses.test.js` covers the graph, controls, disposal, concurrent decoding, independent saturated constraints and positional metadata. Together with existing audio lifecycle/routing tests, 26/26 pass. Build passes.

`web-audio.json` and `web-audio.png` come from the actual browser WebAudio context with original MP3s. Against 100 queued requests, admission accepts 2 for one emitter across different families, 4 for one family and 20 overall; danger/victory are accepted under saturation, stop leaves zero voices, and no errors are reported. The three SFX sub-buses exist and all rates remain 1. The output is intentionally muted: this measures admission and resource behavior, not audible balance or the perceptual suitability of these numeric budgets.

QA-155 remains partial pending the native mixed worker/animal/collapse scene and perceptual evaluation. QA-156 remains partial for the listening/campaign alternation checks. No reserved environmental loop, weather mechanic or animal-death trigger was added to satisfy an inventory count. The complete suite is running in `.cache/audio-buses-full.log`; its result is recorded separately when finished.
