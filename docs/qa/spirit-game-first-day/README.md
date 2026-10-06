# First-day walkthrough in the integrated game

Revision d048270, actual Vite game at localhost:5191, CUA Browser 2. This is the regular menu and app, not the voice fixture or simulation harness. Temporary viewport 844x390 then 390x844; restored afterwards. Spanish was the initial persisted language, switched to English in Settings and restored to Spanish before exit. A new regular game was saved through the menu at 12:07; prior saves were not removed.

## Observed sequence

1. Original menu -> new-game biome/culture selector -> Sabana / Mapungubwe. A world loading screen appeared before the HUD, with no early playable HUD visible in the loading snapshot.
2. At 07:34, the v2 introduction was visible in the integrated guardian/HUD; by 07:48 it advanced automatically to the centre explanation. This observation does not isolate ended from the textual fallback timer or prove subjective audio quality.
3. Build -> work centre -> ordinary canvas click on clear ground: 1500 -> 700 and tutorial changed to planting. No simulation commands or direct state edits were used.
4. Grow panel lists seeds in ascending order: 5, 6, 8, 10, 12, 18, 100, 150. Millet -> ordinary canvas click: 700 -> 695. Tutorial changed to hiring.
5. Hiring opened automatically by 08:13. All four portraits and four coin images had complete=true and nonzero natural dimensions (hiring-images.json). Mandatory initial dialog had no Close. One young woman was confirmed: 695 -> 655 and explanation changed to autonomous work. The worker appeared in the world. This does not prove completed watering/harvest/navigation from a snapshot.
6. Pause -> Settings -> English translated the regular HUD, pause, settings and hiring labels. Returning to the farm and using Back kept the farm visible.
7. Clicking the centre at 10:50 reopened Add workers. A young man quote was 25 rather than the full 40, consistent with remaining shift 10:50-17:05; balance quote 655 -> 630. It was closed without purchase; balance remained 655. Portrait layout captures the complete dialog, all portraits and closing controls. Initial hiring remains mandatory; additional hiring is closable.
8. Saved and returned to the menu at 12:07. Final captured warning/error console is empty (errors.json). No results/victory or first natural raid occurred in this run.

## Limits and next acceptance

This is an opening-to-midday walkthrough, not a full first day, mobile physical test, GPU benchmark, campaign balance test or audio mix acceptance. It uses one crop to isolate the tutorial; the separate intensive campaigns cover planting budgets and large farms. Event cards were not forced in the regular app here. The 2D/3D tutorial hand sequence was not visually accredited by these captures; the hand was not clearly visible in the placement screenshots and needs a focused follow-up. The crop delivery, automatic-harvest physical route, first night, shield reminder, notifications and terrain/camera protection remain to be checked in the integrated app. Existing unit/fixture evidence does not replace those checks.
