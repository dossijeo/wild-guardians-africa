# Main-game Awakening wall check — 2026-10-29

Opened `tests/browser/attack-gameplay.html?awakening=1`, saved the separate `qa-awakening-gameplay` slot and loaded it through the normal main-menu Continue flow. Fixture uses seed 712, day 5, time 150, paid crop/center/worker/wall, 200 inspection credit and one manually filled charge. This is not natural campaign progression.

Production UI observations at 1280x720:
- Awaken and Grow fit their buttons; Awaken remains the label in target selection.
- Clicking the wall opens its confirmation with -25% local / -10% adjoining protection.
- Cancel returns to normal controls with charge 100 and balance 855 unchanged.
- Repeating selection and pressing Bless consumes the charge once (100 to 0), retains balance 855 and displays the permanent-blessing card.
- One Guardian was visible above the wall with turquoise energy immediately after confirmation. Afterward it disappeared and the wall retained turquoise magical detail. Final charge button is disabled.

[Final main-game screenshot](main-wall-result.png).

This checks one wall, daytime and one camera orientation. It does not establish exact pulse timing, continuous animation quality, audio approval, reload persistence, plant flow or the full visual acceptance matrix. At the default strategic distance the Guardian's hand details are small; close-up ritual evidence remains separate.
