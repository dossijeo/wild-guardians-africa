# Staged A→B music handoff: rejected prototype

Baseline: `516ad00d9` (`main`, 2026-10-21). The production gameplay music cuts pack A before loading B's audible short MP3 windows. This isolated branch tests an opt-in two-phase handoff: load B's initial windows while A continues, then stop A and commit B. Production resources never enable the option.

The new unit cases establish that the old `MusicWindowPool` remains active until B's initial windows are ready, and that a cancelled day change leaves A intact. They do not prove an audible improvement.

Chrome 155 / WebAudio / 48 kHz stereo captured the actual `musicGain` output through `MediaRecorder` with identical assets and day scene. The short-capture switch happens after 2 or 4 real seconds. A means the existing handoff; B means staged handoff. Each order was A/B/B/A in one Vite session. During B preparation the capture continues calling `updateMusic` every 20 ms, as the live game does. This is essential: the first version of this capture blocked on the preparation promise, stopped pumping A's short windows, and could not test the staged design. The figures below supersede those initial recordings. `ffmpeg -af silencedetect=noise=-55dB:d=0.05` found the near-silent interval around the A→B change:

| First pack duration | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| 2 s | 0.4926 s | 0.4907 s | 0.4929 s | 0.4920 s |
| 4 s | 0.4976 s | 0.4934 s | 0.4935 s | 0.4924 s |

All eight corrected captures loaded both packs, reached 16 B voices, and reported no music, HTTP or console error. B made 14–15 transport updates during the roughly 0.3-second preparation, whereas A has already stopped its old transport. The 2-second A median is 0.4923 s and B median is 0.4918 s; the 4-second medians are 0.4950 s and 0.4934 s. Staging shifts the silence until the end of loading but barely changes its duration. That does not justify extra temporary PCM, cancellation state and another loading path. This is a signal-threshold measurement, not a listening verdict. The transition may require a different envelope or an explicitly aligned musical cut; simply preloading B does not solve it.

Reproduction, with Vite running on port 5219 and local Playwright/Chrome paths configured:

```powershell
$env:WG_QA_SHORT_MUSIC='1'
$env:WG_QA_FIRST_SECONDS='2'
foreach($run in @('A1','B1','B2','A2')) {
  $env:WG_QA_STAGED_MUSIC=if($run.StartsWith('B')){'1'}else{'0'}
  node tools/experiments/capture-music-ab-browser.mjs "test-results/music-handoff-pumped-$run.webm"
}
foreach($run in @('A1','B1','B2','A2')) {
  ffmpeg -hide_banner -i "test-results/music-handoff-pumped-$run.webm" -af 'silencedetect=noise=-55dB:d=0.05' -f null NUL
}
```

`tests/music-window-gameplay.test.js` plus the audio lifecycle, window-transport and pool tests pass. The prototype remains isolated and is not recommended for production. QA-156 still needs the user's device listening verdict for the existing transition.
