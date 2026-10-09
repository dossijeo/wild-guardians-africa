# Temporary sanctuary music pause in the SFX lab

The actual sanctuary viewer now pauses its existing menu audio when opening
`sfx`. Every gesture/visibility/start path uses the guarded existing music
starter. A play promise resolving after entry cannot reactivate music. Leaving
restores playback only when music remains enabled and the document is visible.
Changing SFX to SFX never restarts music between viewers; changing to another
lab restores it once. Volume, currentTime and the user's audio preference are
not changed, and the lab's own effects are not touched.

Canonical `src/ui/menu-integration.js` and its published `public/menu/native.js`
insertion match. No renderer, model, gameplay or loading pipeline is changed.
The existing English/default-language markup remains intact.

Directed viewer tests: 11/11 PASS, including pause/resume, disabled/hidden
preference, replacement, pending play, fullscreen ownership, focus and both
parent/child Escape paths. Generation-parity and i18n checks: 13/13 PASS. Syntax
check of the published menu passes. These execute production controller methods
with DOM/media edges substituted; they do not establish audible mobile playback
or the outstanding mobile layout acceptance.

The actual native music starter and all three gesture handlers are also executed
with substituted media, preserving the real function-declaration/wrapper order
and autoplay rejection handling. Vite build passed in12.24s with its existing
bundle-size/dynamic-import warnings; web-package validation passed711files,
445252409bytes,860relative links and22runtime GLBs.

The first viewer check produced 9/10 PASS because Python regeneration used
CRLF while the source integration used LF. The equality fixture now normalizes
only line endings, as the existing generation-parity test already did. The
regeneration also temporarily omitted the previously injected i18n loader;
the original index bytes were restored before acceptance, and only the menu
integration block was refreshed. Unrelated published code remains intact.

Browser initialization currently fails with os error3, so native/browser
listening and mobile visual acceptance remain pending. Windows loading and
horde preparation continue in their independent branches.

The additional real-starter test initially failed (10/11) because two microtask
flushes did not drain the cross-VM media promise chain. It now observes the next
event-loop turn before checking successful-play state. The runtime did not
change for this fixture correction. Commit20773112 was inadvertently pushed
before that correction; this negative is retained rather than presented as a
passing source. The corrected complete viewer suite is rerun separately.
