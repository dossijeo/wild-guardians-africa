# Browser visibility acceptance limitation

On 7 October, the existing `tests/browser/visibility-probe.html` was opened in the Codex in-app browser at port 5183, with the UI hidden. Its DOM report recorded `initial` and `pageshow` with `document.hidden=false`, `visibilityState="visible"` and focus true. Opening a second probe tab did not add a visibilitychange, blur or hidden entry to the first report. Both agent-created tabs (667/668) were closed afterward.

This proves that these two automation actions did not exercise the game's hidden-document path. Browser UI visibility is not equivalent to document visibility in this surface. No synthetic visibility event was dispatched and no hidden-page pause acceptance is claimed. QA-014 remains partial; the earlier WebView2 hidden/restore evidence has a different scope. A supported browser surface or physical device producing genuine hidden/visible transitions is still needed for that acceptance case.
