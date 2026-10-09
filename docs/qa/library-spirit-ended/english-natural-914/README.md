# English natural completion — 9 October 2026

Root CUA Browser 2, temporary tab 914, native
`/tests/browser/spirit-voices-event-cards.html` on port 5293. Served from the
loading worktree at e46a8da0. The voice, Guardian, tutorial controller and fixture
files were independently SHA-256 compared to root main 0b00111e: all identical.
This is functional QA; concurrent CPU work was permitted. No timing benchmark.

- Native language selection English, clip 2, Play: `en_02.ogg` started playing.
  Without skipping/closing, actual voice status `ended` and message callback
  occurred at 24279; the standalone message then closed and released its source.
- Native tutorial sequence Play, manual Continue from the introduction:
  `basic.center` started `en_02.ogg` at 57113. The manual introduction callback
  is distinct from natural media ended and is not counted as one.
- Native fixture button “Complete real center action” invoked Game placement:
  one centre, zero plants; tutorial logical step became plant while presentation
  stayed `basic.center`, voice playing at 6.878955 of 16.244563 seconds.
- Actual media status ended for that voice at 73422, followed by captured
  `basic.center` completion. The next presentation/clip began at 73424/73516:
  `basic.plant` / `en_03.ogg`, with zero plants. No automatic game action.
- Errors empty in both reports and captured browser warnings/errors. Spanish
  was restored through the visible selector; tab closed, inventory empty.

Raw reports and screenshots are retained alongside this note. The fixture uses
native UI/media/controller and real Game commands with a stub navigation view;
it is not a full farm/menu traversal, a listening/mixing review of all voices,
or physical mobile acceptance. The earlier English-retention evidence and its
limitations remain preserved separately.
