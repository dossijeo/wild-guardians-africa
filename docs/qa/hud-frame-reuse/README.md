# Retained HUD frame artwork

The cultivation/spell/defence and hiring panels share a fixed image loader. Concurrent openings share a promise; later openings reuse loaded image objects and paint synchronously. Failed URLs can retry while successful frames remain retained. A pending paint/error callback checks that its original panel is still mounted.

Native browser fixture `tests/browser/frame-image-reuse.html`, reviewed 2026-10-07: three openings, nine image objects created in total, two reuses of the same loaded frame set; all nine actual WebP frame assets ready. Screenshot visually inspected and tab closed. This verifies loader reuse and native frame painting in a 2D fixture, not the complete game, physical mobile, itch.io transfer sizes, or a measured FPS improvement. Portrait/crop DOM images continue to use stable URLs and browser caching; this change retains frame artwork only.

Directed tests: 9/9 (loader concurrent/repeated opening and failed-image retry, HUD shortcuts, additional hiring). Production build passed with the existing large-bundle warning. Browser syntax validation is recorded separately when terminal.
