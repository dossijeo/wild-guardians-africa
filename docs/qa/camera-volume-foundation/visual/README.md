# First native visual check: Mapungubwe

Runtime base: `7449d39`, with the diagnostic-fixture changes in this commit. Sabana / Mapungubwe, case 1, medium quality, daytime, paused simulation. These are desktop-browser checks, not physical mobile acceptance.

The existing biome fixture rendered a static frame. Wheel input changed its camera without refreshing the world image. The fixture now runs a reversible animation-frame loop only while camera exclusion is enabled, and the report button refreshes the world before exporting its visible report. Generation tokens stop superseded loops. Separate world-unit inputs let centers and village houses be tuned independently; their candidate values are not approved gameplay defaults.

- `mapungubwe-margin06-counterexample.png` and its report show the first check with the original 0.6-unit margins. Geometry safety reported no unresolved recovery or terrain conflict, but the close-up still exposes enlarged, washed texture details. This contradicts visual acceptance of that margin.
- `mapungubwe-margin24-zoom.png`, report and status record a second check with center margin 2.4 and village margin 1.6. After wheel zoom, exclusion is explicitly enabled, 11 volumes are registered, two root revisions occur and the final pose reports one contact, no unresolved recovery and no terrain conflict. The view remains quite close; it is a candidate, not approval of the minimum visual distance.

The first capture used the visible app's portrait viewport (3D resolution 802×1609); the second used the background browser's landscape viewport (1600×900). They are **not** a controlled image-equivalence comparison or a frame-time measurement. Wheel timing and input sequences also differ. No claim about performance, every culture, full orbit, touch gestures, overflight, Continue/Back or raids follows from these captures.

Temporary tabs 630 and 631 were closed. No saves were created or changed. Normal gameplay exclusion remains off. Further work must include model/category tuning, controlled same-viewport views, complete camera routes, physical-device testing and measured cost.
