# Frozen integration regression — first attempt retained

Source24684383, terminal exit1 after1079.548649 seconds:3037/3038pass, one failure, zero skipped/cancelled. Recorded source files match before/after; tracked source/tests/tools/content/public also match the launch commit. Later documentation commits do not change that attribution.

The one failure is the atlas hash assertion in impostor-hull.test.js: its native-sun receipt predates the reviewed premultiplied-linear baobab update. The failure remains here; this attempt is not described as green. A new current-public hull receipt regenerated from all44atlas phases preserves every conservative hull coordinate, area and opaque union count exactly. Only the two baobab file hashes differ. The original historical receipt is preserved and the test continues to verify SHA256 and every nonzero alpha sample against the hull. Four directed tests pass with the current receipt; a new full run follows separately.
