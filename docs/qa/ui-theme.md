# Shared styles for production menus and controls

`public/ui-theme.css` is loaded by the game, original menu and original new-game selector. Their generators include the same stylesheet so regenerating those pages does not lose the theme. The packaged stylesheet links remain relative under the itch.io subdirectory build.

Shared tokens cover Banga control text, Ga Maamli dialog titles, paper/forest/gold colors, border radii, primary/secondary actions, keyboard focus, disabled states and reduced-motion behavior. Primary text buttons use the recruitment panel's original green palette. Recruitment confirmation, selector confirmation and ordinary text actions have a 44 px minimum height; illustrated HUD controls retain their native dimensions and backgrounds. Existing menu transitions, HUD frames and portraits remain in place.

Active press movement applies only to ordinary text buttons. A blanket transform was rejected during testing because projected menu hotspots already depend on their own transforms: moving them during pointer-down could prevent click activation. The final menu opens Options by mouse as well as keyboard.

Rendered checks cover the original menu's Options section and the original selector, plus the actual production recruitment markup and frame drawing through `tests/browser/ui-theme.html`. At 390×844, selector and recruitment have no horizontal overflow, all four portraits load, and recruitment confirmation measures 44 px with Banga text. Screenshots: [selector](ui-theme/selector-mobile.png), [recruitment portrait](ui-theme/hiring-mobile.png), [recruitment landscape](ui-theme/hiring-landscape.png), [menu options](ui-theme/menu-options.png).

The recruitment fixture renders production markup, CSS and art without a simulated world or saving a user slot. It verifies styling and asset loading, not hiring gameplay. This common theme is a first normalization pass; every gameplay modal and contextual panel still requires visual review in the complete game, including English and physical-phone interaction.
