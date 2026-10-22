# Audible A/B music reference from Chrome

This is a listening artifact for the still-partial QA-156 case. Chrome 155 recorded the production `AudioSystem` and original gameplay stems on 21 October 2026, from `origin/main` at `89c35bd1a`. The capture taps `musicGain` through a `MediaStreamAudioDestinationNode`; it does not remix source files offline or modify a save. The same audio instance plays A and then changes to B.

- [Full stereo capture](ab-continuity.webm): 2 min 11 s, original browser Opus output, SHA-256 `8e19d33452cb6c68f873ae8ce56687675382e8904099c0006fce78e475a06fce`.
- [A→B listening excerpt](ab-transition.mp3): 21.7 s around the pack change, re-encoded only for convenient playback, SHA-256 `2d5c8e974054892b753401579709d6ff4b63dc198c8399b75b03f66368d9899d`.
- [Timing and browser report](ab-continuity.json): A day 0–39.5 s, night 39.5–52.4 s, attack 52.4–65.2 s; B starts after the 65.2–65.6 s load transition, followed by day, night and attack through 131.1 s.

Both packs reached the intended mixer scenes with 16 active sources at the end of each stage, 48 kHz stereo output, no music error and no failed HTTP requests or relevant console errors. The captured signal has mean level −31.5 dB and peak −10.1 dB; no digital clipping was observed. A threshold test at −55 dB found roughly 0.49 s of near-silence around the A→B change. That measurement does not determine whether the transition sounds musically acceptable. The separate page favicon 404 was excluded from the report after confirming it did not involve music assets.

To regenerate the full browser capture:

```powershell
npm run dev -- --port 5219 --strictPort
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_CHROME='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:WG_QA_URL='http://127.0.0.1:5219'
node tools/experiments/capture-music-ab-browser.mjs test-results/music-ab-continuity.webm
```

The browser recording proves that actual WebAudio output exists and provides a reproducible A→B listening sample. It omits world ambience, effects and the full 3D game loop. A second capture now covers those systems:

- [Native-world dawn excerpt](world-dawn-transition.mp3): the final 29.9 seconds of a paid Wild Engine Sabana/712 day, including raid resolution, the A→B dawn and 12 seconds of B with native ambience; SHA-256 `b94049b97a0467184e3c843d83577a5859e2ff80142082c558c02ded734adb13`.
- [Native-world report](world-dawn.json): Chrome 155, 4,170 gameplay steps, one crop delivery, one raid and one dawn; A/B windows loaded, wind source retained, old A buffers released, WebAudio context closed, zero browser errors. The full 225-second browser recording is reproducible but omitted from Git to avoid storing another large QA binary.

The native-world recording taps the production `musicGain` and `sfxGain` nodes. The fixture uses `?audible=1` only for this capture; its default automated mode remains muted. The captured native-world mix is 48 kHz stereo, mean level −29.8 dB and peak −6.8 dB, with no digital clipping. These measurements and functional assertions do **not** establish a perceptual verdict. QA-156 remains partial until someone listens for missing stems, doubled beats, an abrupt gap at the pack change, clipping or incoherent section changes and records the playback device and outcome.

Regenerate the native-world recording against a running dev server with:

```powershell
node tools/experiments/capture-music-world-dawn-browser.mjs test-results/music-world-dawn-audible.webm
```
