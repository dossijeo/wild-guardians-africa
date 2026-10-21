# Experimental A→B pack handoff

This branch tests retaining Gameplay A while Gameplay B's first audio windows load. It is **not an adoption recommendation**. No change to `main` is proposed from this single comparison.

The production `AudioSystem.gameplay()` stops A before fetching B's bank and decoding its windows. This prototype prepares B while A keeps playing, then disposes A and starts B. It never plays both compositions together. The pending pool is disposed on cancellation or failure. The fallback for unsupported sample rates remains unchanged.

## Comparable browser evidence

| Chrome 155, 48 kHz, −55 dB threshold | Production | Prototype |
| --- | ---: | ---: |
| A→B transition reported by browser fixture | 65.22–65.57 s | 65.472–65.760 s |
| Near-silence in captured WebAudio output | 0.486 s | 0.411 s |
| Music/HTTP/console errors | 0 | 0 |

The production [capture and report](../music-audible-ab/README.md) and this branch's [candidate report](candidate.json) and [candidate listening excerpt](candidate-transition.mp3) use the same music assets. The excerpt is a re-encoding of the browser output for listening, not a remix of stems. The source audio files have no changes between the production reference and this branch. The measured difference is about **75 ms in one run**, so it is not a statistically established improvement.

The B pack's `s4` keyboard stem is below −55 dB for its first **0.383 s** in the original MP3. Its `s2` bass stem is below that threshold for **1.284 s**. The B mix therefore has a quiet opening even when its decoded windows are ready. This explains why loading B earlier does not remove the observed gap. The prototype adds a period when both packs' decoded windows may coexist in memory, and the integrated fixture's `peakPoolPcmBytes` counts only the active pool, so no reliable total peak-memory comparison is available yet.

## Verification and scope

The directed audio suite (58 tests), `npm run build`, and the muted integrated Sabana/Mapungubwe/712 one-day Chrome fixture passed. The integrated run advanced 4,170 steps through one delivery, one raid and the A→B dawn, with no browser errors. This establishes a functional smoke test, not a long-campaign result or a perceptual verdict. The candidate has not been ABBA-tested or compared on a listening device. QA-156 remains partial.

Reproduce with the existing browser fixtures while the dev server runs on port 5219:

```powershell
npm run dev -- --port 5219 --strictPort
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_CHROME='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:WG_QA_URL='http://127.0.0.1:5219'
node tools/experiments/capture-music-ab-browser.mjs test-results/music-pack-seam-candidate.webm
node tools/experiments/check-music-world-dawn-browser.mjs
```

For the silence measurement, run `ffmpeg -i <capture.webm> -af 'silencedetect=noise=-55dB:d=0.02' -f null NUL`. A useful next experiment is a short, explicitly approved musical crossfade that spans B's quiet lead-in, measured for perception, memory and deterministic behavior. Merely moving the load boundary is not enough evidence to merge this prototype.
