# Eight-view ritual inspection — 2026-10-29

`guardian-combat.html` now exposes **Inspeccionar ritual en ocho vistas**. It commits one plant blessing using a QA charge, builds one legal thorn wall, and replays that presentation at four fixed camera headings (0.7 plus quarter-turn increments), alternating distances 10/22, in day and night. The canvas sheet samples 0.9s and 3s. Click it to close. It freezes simulation; it does not measure physics, audio, live control responsiveness or frame performance. It consumes no user save.

Camera is set directly in cinematic QA mode, bypassing the normal obstruction-adjusting camera controller; these are deliberately harsh fixed viewpoints. Early exploratory sheets were rejected because normal camera updates changed the intended views. Final sheet is [eight-views.png](eight-views.png), raw accessible UI result [eight-views-ui.txt](eight-views-ui.txt).

Lifecycle checks succeed for all eight: one visible scene object at 0.9s, none at 3s, no reported errors. The JSON passed field ONLY represents those lifecycle checks, not optical visibility/artistic acceptance.

**Visual acceptance fails for heading 5.4124 / distance 22**, both day and night: the tower masks the Guardian and target. The first three headings show the Guardian and its disappearance, although distant hand detail is too small for facial/pose approval. This new reproducible obstruction case must be investigated; it is not closed by object.visible=true. Building bounds / candidate fallback and final ritual elevation need scrutiny before changing the production solver.

Syntax and whitespace checks pass. No runtime source changed in this inspection commit. The full visual matrix remains open.
