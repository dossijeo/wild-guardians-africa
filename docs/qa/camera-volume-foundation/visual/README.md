# First native visual check: Mapungubwe

Runtime base: `7449d39`, with the diagnostic-fixture changes in this commit. Sabana / Mapungubwe, case 1, medium quality, daytime, paused simulation. These are desktop-browser checks, not physical mobile acceptance.

The existing biome fixture rendered a static frame. Wheel input changed its camera without refreshing the world image. The fixture now runs a reversible animation-frame loop only while camera exclusion is enabled, and the report button refreshes the world before exporting its visible report. Generation tokens stop superseded loops. Separate world-unit inputs let centers and village houses be tuned independently; their candidate values are not approved gameplay defaults.

- `mapungubwe-margin06-counterexample.png` and its report show the first check with the original 0.6-unit margins. Geometry safety reported no unresolved recovery or terrain conflict, but the close-up still exposes enlarged, washed texture details. This contradicts visual acceptance of that margin.
- `mapungubwe-margin24-zoom.png`, report and status record a second check with center margin 2.4 and village margin 1.6. After wheel zoom, exclusion is explicitly enabled, 11 volumes are registered, two root revisions occur and the final pose reports one contact, no unresolved recovery and no terrain conflict. The view remains quite close; it is a candidate, not approval of the minimum visual distance.

The first capture used the visible app's portrait viewport (3D resolution 802×1609); the second used the background browser's landscape viewport (1600×900). They are **not** a controlled image-equivalence comparison or a frame-time measurement. Wheel timing and input sequences also differ. No claim about performance, every culture, full orbit, touch gestures, overflight, Continue/Back or raids follows from these captures.

Temporary tabs 630 and 631 were closed. No saves were created or changed. Normal gameplay exclusion remains off. Further work must include model/category tuning, controlled same-viewport views, complete camera routes, physical-device testing and measured cost.

## Suajili: close-up clearance comparison

Runtime main `811db06`, case 2 (Sabana / Suajili), medium quality, seed 712, daytime paused fixture. All three native screenshots use the same 1280×720 viewport and 1600×900 3D resolution. Browser screenshot bytes are JPEG, preserved without recompression. Production sources/defaults and saves were not changed.

`suajili-margin24-close-counterexample.jpg` and report: center margin 2.4 / village margin 1.6, close-view reset, exclusion enabled, native wheel up two pages then three. Exclusion reports eight volumes, one contact and no unresolved recovery or terrain conflict. The facade nevertheless fills the frame, exposing enlarged textures: 2.4 is not accepted as a universal visual margin.

`suajili-margin60-close.jpg` and report: exclusion disabled, center margin set to 6, close-view reset, exclusion enabled, identical wheel commands. Eye X/Y match exactly; Z differs by 3.6 units, matching the margin difference. More surroundings are visible, but the roof is still cropped. Six remains an experimental candidate, not approval for this or other models.

`suajili-margin60-retreat.jpg` and report: subsequent horizontal/vertical native drags and wheel down two pages change both camera and target. The final report has no unresolved recovery/terrain conflict; console errors are empty. The drags also move the target, so they do not prove a full orbit or roof overflight. Temporal smoothness, all cultures/villages, touch gestures, damage, nearby crops and Continue/Back/raid routes remain unverified.

Next adjustment: tune clearance per model and consider separate horizontal/vertical margins, then test finite roof overflight. Blindly enlarging all dimensions is not approved. Still images do not prove CPU/GPU/FPS/RAM behavior. Temporary tab 632 was closed; GPU access returned to the impostor agent. Normal gameplay protection remains off.
