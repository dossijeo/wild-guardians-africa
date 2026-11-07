# Main-game continuous Attack recording

Recorded the actual main application, loaded through Continue from qa-attack-gameplay. tests/browser/guardian-gameplay-recording.html wraps the ordinary application in a same-origin iframe and captures its world canvas at up to 30 fps for 20 wall-clock seconds after the next canvas pointerdown. It does not cast, advance simulation, clear cooldowns, change actor state or move the camera. The only prepared state changes are disclosed in attack-gameplay.html. No production recorder dependency is added.

Operator used normal pause/resume to locate the target before recording, then Power -> Attack -> click the rhino. Recording ran uninterrupted after that click. Downloaded 10,832,161-byte WebM, copied to attack-main-gameplay.webm. The file has no audio and excludes DOM HUD/tutorial overlays; it is not the requested voiced tutorial video.

Reviewed the 1 fps contact sheet attack-main-gameplay.jpg: initial single Guardian vortex, fall by roughly 2 s, prone/rolling recovery through roughly 6 s, upright by roughly 8 s, then walking and returning to attack near the center. Guardian disappears; no camera transition occurs. This proves one main-page cycle is visibly represented beyond unit/isolated fixture tests. The strategic distance and sparse inspection do not establish all-frame skin clearance, anatomical quality, audio synchronization, every direction/obstacle or performance. Broader visual acceptance remains open.

## Detail inspection and playback container

Inspected attack-main-gameplay-detail.jpg: 18 cropped frames at 2 fps over the first nine seconds. Lateral collapse settles before the supine transition; the animal then turns into hand support and stands rather than instantly snapping to walking. No large ground gap is apparent in these sampled views. Grass occludes parts of the support surface, and half-second sampling cannot exclude transient penetration or discontinuities; no all-frame anatomical approval is implied.

Remuxed the browser WebM without re-encoding to add seekable duration metadata. Compared all decoded frame MD5 rows including timestamps before and after: all 418 match. Final duration is 19.641 seconds, VP9 1600x820, 10,832,551 bytes; receipt attack-main-gameplay.metadata.json. The recorder's 30 fps request is not a measured game FPS guarantee, and this recording is not a performance benchmark.
