# Continue and HUD home share the camera operation

Continue previously selected the centre nearest the first village, then aimed at
the live crops' bounding-box centre with its own yaw and distance. The HUD home
button selected the first operational work centre and applied the native home
pose. This produced different views of the same farm.

Both now call `WorldScene.focusFarm()`, including the legacy toolbar shortcut.
It preserves the HUD's existing destination rule and uses `focus()` to cancel
raid camera travel, consume pending damping and restore the native terrain pose.
Without an operational centre it targets the first village.

Validation:

- Camera/farm/horizon/raid suites: 63 tests passed. The farm regression compares
  eye and target before and after panning/zooming in all six native biome fields,
  checks raid cancellation, and preserves simulation state.
- `npm run build` and `npm run test:web-package` passed (819 relative links,
  20 runtime GLBs).
- The real Continue menu loaded an isolated Gran Cañón QA save, then the real
  HUD Volver button was pressed. Both calls produced byte-identical eye/target
  arrays. No browser errors were recorded. The controlled fixture holds time
  with a QA-only pause; this is camera validation, not campaign balance evidence.

Evidence: [camera report](farm-home/gran-canon.json),
[rendered view](farm-home/gran-canon.png).

Reproduce at `tests/browser/mobile-first-day.html?resume-camera=1&biome=gran-canon`.
The opt-in setup stores a paid work centre and four paid millet sprouts in the
fixture's separate QA database. Player saves are not modified.
