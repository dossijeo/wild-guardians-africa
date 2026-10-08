# Current first-appearance and contact coverage

Production runtime `23f2bce3`, unchanged by this work. The existing native
animal-preload fixture now accepts validated `culture` and `quality` parameters,
selects the matching village payload and creates a game with that culture.
Defaults remain Mapungubwe/media. Reports record actual culture, quality and
drawing-buffer dimensions rather than implying a common resolution.

IAB desktop, seed 712, controlled buffalo spawn in Gran Río. The two motion
cases place a paid centre and seed, use the fixture's empty initial contract,
and advance native simulation/navigation in 50 ms steps until the first logical
hit on the plant. These are isolated contact tests, not natural full nights,
HUD/audio flows, populated farms or physical phone acceptance.

| Case | Buffer | First two render CPU ms | Motion maximum CPU ms | Contact steps | Compile/link in first renders and motion |
| --- | --- | --- | --- | --- | --- |
| Mapungubwe/media, appearance only | Not recorded by baseline fixture | 23.3 / 10.8 | Not run | Not run | 0 / 0 in appearance |
| Etíope/baja | 642×1287 | 27.7 / 10.5 | 23.1 | 523 | 0 / 0 |
| Musgum/alta | 1280×720 | 42.2 / 16.9 | 37.8 | 523 | 0 / 0 |

Both contact cases report zero actor wait frames, zero errors and seven GLB
downloads before appearance, after appearance and after contact. Animal program
IDs remain prepared; no new program appears during the initial appearance.
The reported animal has a visible mesh and bounds intersecting the camera at
contact. The Musgum inspection screenshot confirms a rendered buffalo after
contact; its camera-only inspection records identical logical state.

There is still first-use submission work: 87 bufferData calls in the first
Etíope render and 171 in Musgum, versus zero in their second renders. These
counts do not prove bytes, exclusive stall cost or a defect. Quality, culture
and resolution differ; the timings are individual diagnostics, not an A/B
benchmark or proof of eliminated stutters. CPU campaigns 44164 and 49032 were
verified live. No other agent GPU test was running during these captures.

Reports are complete deterministic gzip archives read from the page DOM;
proof.json hashes compressed/plain reports, baseline/current fixture bytes and
all production sources. Syntax parsing passed for 145 inline scripts in 148
tracked QA pages; the focused final fixture parse is archived. Unrelated
untracked pages were excluded by the existing verifier.

Reproduce using `/tests/browser/animal-preload.html?biome=gran-rio&culture=musgum&quality=alta&attack-species=buffalo&motion=1&timing=1&appearance-profile=1&frame-profile=1&cpu-passes=1`.
Inspect the animal only after the report completes. This does not complete
coverage of all cultures/qualities/species/biomes, first-use buffers, load cost,
RAM, night transitions or mobile hardware.
