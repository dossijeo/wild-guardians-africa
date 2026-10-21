# Staged A→B music handoff: rejected prototype

Baseline: `516ad00d9` (`main`, 2026-10-21). The production gameplay music cuts pack A before loading B's audible short MP3 windows. This isolated branch tests an opt-in two-phase handoff: load B's initial windows while A continues, then stop A and commit B. Production resources never enable the option.

The new unit cases establish that the old `MusicWindowPool` remains active until B's initial windows are ready, and that a cancelled day change leaves A intact. They do not prove an audible improvement.

Chrome 155 / WebAudio / 48 kHz stereo captured the actual `musicGain` output through `MediaRecorder` with identical assets and day scene. The short-capture switch happens after 2 or 4 real seconds. A means the existing handoff; B means staged handoff. Each order was A/B/B/A in one Vite session. `ffmpeg -af silencedetect=noise=-55dB:d=0.05` found the near-silent interval around the A→B change:

| First pack duration | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| 2 s | 0.4934 s | 0.4908 s | 0.4921 s | 0.4910 s |
| 4 s | 0.4931 s | 0.4924 s | 0.4909 s | 0.4930 s |

All eight captures loaded both packs, reached 16 B voices, and reported no music, HTTP or console error. The 2-second A median is 0.4922 s and B median is 0.4915 s; the 4-second medians are 0.4931 s and 0.4916 s. A difference near 1 ms does not justify extra temporary PCM, cancellation state and another loading path. This is a signal-threshold measurement, not a listening verdict. The transition may require a different envelope or an explicitly aligned musical cut; simply preloading B does not solve it.

Reproduction, with Vite running on port 5219 and local Playwright/Chrome paths configured:

```powershell
$env:WG_QA_SHORT_MUSIC='1'
$env:WG_QA_FIRST_SECONDS='2'
foreach($run in @('A1','B1','B2','A2')) {
  $env:WG_QA_STAGED_MUSIC=if($run.StartsWith('B')){'1'}else{'0'}
  node tools/experiments/capture-music-ab-browser.mjs "test-results/music-handoff-two-$run.webm"
}
foreach($run in @('A1','B1','B2','A2')) {
  ffmpeg -hide_banner -i "test-results/music-handoff-two-$run.webm" -af 'silencedetect=noise=-55dB:d=0.05' -f null NUL
}
```

`tests/music-window-gameplay.test.js` plus the audio lifecycle, window-transport and pool tests pass. The prototype remains isolated and is not recommended for production. QA-156 still needs the user's device listening verdict for the existing transition.
