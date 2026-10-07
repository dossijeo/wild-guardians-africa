# Physical screen-awake acceptance — 2026-10-07

The user reports that the currently published itch.io Jam build was tested on their Pixel and successfully kept the screen awake past the normal timeout. This is physical device evidence reported directly by the human tester, rather than a desktop/browser fixture inference.

Published game: https://dossijeo.itch.io/wild-guardians-africa . The device was previously identified by the user as Pixel 10a with Chrome; this update refers to the Pixel. The exact published commit, Chrome/Android versions and elapsed duration in minutes were not provided. The observed acceptance criterion is exceeding that device's normal screen timeout while the game is running.

Screen-awake behavior is accepted for that published Jam build and reported device. Per the user's instruction, further Wake Lock work is no longer a priority unless a regression appears. Earlier reports of failure and pending physical acceptance remain historical evidence; this update supersedes the pending physical screen-timeout finding for the tested build.

This does not establish which native API or fallback kept the display awake, hidden-tab simulation behavior, all mobile devices or a later unpublished main revision. No additional implementation change, deployment or physical test was performed by the agent for this record.
