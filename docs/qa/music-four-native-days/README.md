# Four paid music days on Wild Engine

On 20 October 2026, the existing `music-world-dawn.html?days=4` fixture
completed four Sabana/Mapungubwe/712 workdays and incursions on the production
Wild Engine world. Base `main`: `d51fbe4a479e938cf9eb7473379a3372cda18d04`.
Chrome 155.0.8059.84 ran headless at 1280 × 800 with WebGL and muted WebAudio.
The test paid for its center, four mijo seeds and four daily young-female
contracts from the normal 1500-coin start and crop deliveries. It did not
inject money, skip the night, force a raid or change game rules.

The 17,162 simulation steps produced eight completed waterings, four physical
pickups and crate deliveries, four raids spawned and ended, and the ordinary
day-five hiring pause. Music changed **A → B → A → B → A**. Each of the five
captures used `MusicWindowTransport`, eight original stems at 48 kHz and
playback rate 1. At every dawn the previous window pool was disposed with zero
owned PCM; the same native wind source remained active. Peak sampled window
ownership was 74,876,928 bytes, equal to the earlier three-day Wild Engine
run. `stop()` left zero active voices and disposal closed the `AudioContext`.
The fixture and browser reported zero errors, including WebGL errors.

The [raw report](result.json) records each stem, transport, event and resource
assertion. It also records nine `AnimalRouteUnavailable` events across four
raids. All four raids ended; this audio test does not certify every animal
route. The output was muted, so the run does **not** establish perceptual
quality, physical-phone performance, FPS, GPU cost or a 100-night audio
campaign. QA-156 remains partial.

Reproduce from the repository root with an available local port:

```powershell
npm run dev -- --port 5194 --strictPort
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_URL='http://127.0.0.1:5194'
$env:WG_QA_DAYS='4'
$env:WG_QA_HEADLESS='1'
node tools/experiments/check-music-world-dawn-browser.mjs test-results/music-world-wild-engine-day4.json
```

The tested fixture SHA-256 is
`668161e9a69308c598733d72083ca9029e8edd3d1c31ced800ee10c262939e22`,
the browser driver SHA-256 is
`01ed545d8b88ed077f0f29189e74946d1fc5276046d929087605d6bca4444589`,
and `spatial-savanna.wasm` SHA-256 is
`6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`.
