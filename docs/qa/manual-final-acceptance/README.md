# Manual follow-up: QA-156 and optional phone compatibility

The [acceptance register](../acceptance-progress.json) marks QA-014 `verified` and QA-156 `partial`. The [current Wild Engine Chrome run](../browser-visibility/README.md) observed a genuinely hidden paid farm for 300 seconds with an unchanged full-state hash, money, crop and worker state, then normal visible progress. The scenario written for QA-014 is therefore covered. The user's separate physical-phone checks are useful platform compatibility evidence, not a prerequisite for this acceptance case or a blocker for implementation. The A/B music checks still need a perceptual listening verdict.

## QA-014 — optional physical-phone compatibility

Use an actual phone running the current game build in its browser. Record the commit/build identifier, device, OS/browser versions, URL, and whether the page was installed or opened as a tab. A development build with `?qa-visibility` exposes `wildGuardiansVisibilityQa()` in remote DevTools; the production build intentionally omits it.

1. Start or restore a paid game with a living crop and a moving worker. Note the game day/time, coins, crop condition and worker position. If using remote DevTools, retain the full `snapshot` returned by `wildGuardiansVisibilityQa()` before hiding.
2. Switch to another app or browser tab for at least five measured minutes. Confirm that the game document actually becomes hidden when DevTools is available; locking the display alone is not a substitute if the browser keeps the page visible.
3. Return to the game. Before allowing several seconds of visible play, record the same fields. There must be no offline clock jump, crop growth/watering, damage, delivery, income or movement attributable to the hidden interval. A previously open menu or hiring pause must remain open.
4. Let the game run visibly for a few seconds and confirm that normal time and worker movement resume without replaying the hidden interval. Repeat once with a menu or hiring pause stacked over the hidden pause if the device permits.

For the optional device check, record the expected state behavior, any reload or page exception, and the hidden interval. A production visual check can show the user-visible result; remote DevTools snapshots provide stronger state-level evidence. Keep screenshots or a short recording and note any browser tab discard/reload separately from ordinary visibility restoration. A phone-specific defect should be reported and fixed, but lack of this device check does not reopen QA-014's verified Chrome behavior.

## QA-156 — audible A/B continuity

For a quick listening comparison, run `npm run dev`, open `tests/browser/music-mixer.html?audible=1` in a browser, and click **Cargar A** or **Cargar B**. The page uses the original game stems and WebAudio; it changes no save. Adjust the device volume first. Compare A and B in **Día**, **Noche** and **Ataque**, allow each to play long enough to hear a section transition, then use **Parar**. The same fixture without `?audible=1` remains muted for automated checks.

Listen for clipping, missing stems, abrupt silence, doubled beats, mismatched musical sections, or a pack that fails to stop. Record which pack/scene/time produced any issue. The isolated mixer verifies audition quality only; also listen in the actual game across at least one paid dawn changing A to B, and preferably the next B to A, with world ambience and effects enabled. Note whether the transition is musically coherent and whether the game remains responsive. Do not infer the whole 100-night audio campaign from the short fixture.

The [three-day Wild Engine run](../music-three-native-days/wild-engine-rerun.md) established technical A/B/A/B swaps and source cleanup with output muted. It did not establish perceptual quality, a physical-phone audio budget, or a 100-night listening result.

## Record

For each check, save the build SHA, device/browser, date, exact steps, duration, observed pass/fail and any screenshots or audio/video references. Note whether the result came from the production game, a development QA hook or the isolated mixer. Keep QA-156 partial until the audible observations exist. A failed phone or audio observation should become a reproducible defect rather than silently changing the scope of the existing evidence.
