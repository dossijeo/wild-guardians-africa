# Five paid music days on Wild Engine

The music/world fixture now accepts a requested horizon of up to 14 days and, after each dawn hiring, may request a legal repair of its damaged work center when it can afford one. It still starts with 1500 coins, plants one reachable mijo per day, hires one young worker per day, and uses the production Wild Engine, raids, economy, task planner, renderer and muted WebAudio. No balance value or game rule changed. The extra repair decision belongs only to this QA fixture; it is not a virtual-player policy change.

On 20 October 2026, Chrome 155 ran Sabana/Mapungubwe/712 on `origin/main` at `90fcef655e4c9e04a94e988e5fc59cc76fda5b72`. The unchanged driver has SHA-256 `01ed545d8b88ed077f0f29189e74946d1fc5276046d929087605d6bca4444589`; `spatial-savanna.wasm` has SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`. The tested fixture has SHA-256 `70940224a6015dae23205315963f95ca1565ed731b219f7baf51a53f418e1bc7`.

| Run | Outcome | Simulated steps | Crate deliveries / raids ended | Repairs requested / applied | Music packs captured |
| --- | --- | ---: | ---: | ---: | --- |
| [No repairs](without-repair.json) | `GameOver` during day 5 after `StructureRuined`; fifth dawn not reached | 20,692 | 5 / 5 | 0 / 0 | A→B→A→B→A |
| [Legal repairs](with-repair.json) | Fifth dawn reached, day 6 active | 21,754 | 5 / 5 | 3 / 3 | A→B→A→B→A→B |

The first report did not record `state.result` or center HP, so its event sequence supports a structural-loss diagnosis but does not identify the exact defeat reason. The second report records the center at 140/600 HP and 189 coins after night 5. Its repair requests were made on days 2–4 after the hiring pause had cleared; normal workers completed them. This farm is still too fragile to claim a 14-day or 100-night audio campaign.

The successful run kept eight original stems per pack through `MusicWindowTransport`, playback rate 1, and the same native wind source across dawns. At each switch the previous pack's window pool was disposed with zero owned PCM. Peak sampled pool ownership was 74,876,928 bytes; this is not process RSS. `stop()` left zero voices, disposal closed the `AudioContext`, and the browser and WebGL reported zero errors. The sound was muted, so this does not establish perceptual quality or mobile performance. QA-156 remains partial.

Reproduce with Vite on port 5217, an installed Chrome and a local Playwright module:

```powershell
npm run dev -- --port 5217 --strictPort
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_URL='http://127.0.0.1:5217'
$env:WG_QA_DAYS='5'
$env:WG_QA_HEADLESS='1'
node tools/experiments/check-music-world-dawn-browser.mjs test-results/music-world-day5.json
```

The 14-day input limit only enables further experiments. Reaching that horizon requires a legal farm policy that survives it; raising the limit does not certify the result.
