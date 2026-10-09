# Native menu generation parity

On runtime base `2f3334c8`, the published native menu retained three controls
missing from `src/ui/menu-integration.js`: delete saved game, language selection,
and world-resolution selection/restoration. `prepare_menu.py` inserts that source
into the authored menu, so regeneration would lose those integrated features.

The template now contains the complete existing production integration. The
published `public/menu/native.js` bytes are unchanged by this correction. No
save is deleted, settings changed, assets rebuilt or menu design replaced.

The new parity test fails against the previous template and passes after the
sync. It compares the complete inserted integration and requires the existing
delete/language/resolution controls and settings roundtrip, preventing a false
pass by copying the older template into production instead. Sixteen directed
parity, library lifecycle, fonts, world resolution and SFX tests pass. This is
source/controller validation, not rendered mobile acceptance or proof of every
other preparation pipeline stage.
