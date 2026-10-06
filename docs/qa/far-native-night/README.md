# Far ground and fog day/night coherence

The opt-in native Sabana fixture now exposes day, midpoint and night controls. They change only this paused QA state, with no save writes. The actual `skyNight` function drives fog color, the prelit atlas blend and the shared ground night uniform.

Far ground preserves its washed linear daytime vertex colors. A vertex-stage multiplier approximates the fixed-light Sabana palette at night; its endpoint is the native night sun palette (.31, .48, .78) times 1.12 divided by the Sabana day sun palette (1.85, 1.78, 1.32). This is a simplified grading recipe, not a reproduction of the native terrain's tone mapping, shadows or slope lighting. It adds no fragment texture reads, terrain noise, geometry uploads or draw passes. No measured GPU improvement or zero-cost claim is made.

Fog interpolates from the experiment's daytime haze (#b5d9e8) to the game's night background (#263747) in linear color space, using the current simulation clock rather than wall time. It remains exclusive to the experimental adapter. Ordinary games are unaffected.

Captured day, midpoint (~0.5) and night (1) retain the same camera, 25 native chunks, 646 far trees and one native preparation. All three reports have no runtime errors and WebGL error 0. The browser console capture is empty. The five focused regional-ground/layer tests pass, including shared uniform identity, dynamic night value and resource disposal. The visual comparison confirms that the far floor and haze no longer retain their daytime appearance at night; detailed near/far grading equivalence remains unproven.

Reproduce with `tests/browser/far-native-world.html`, using the lighting selector after loading. Previous daytime GPU cost evidence predates this vertex-stage change and must not be presented as a new performance measurement.
