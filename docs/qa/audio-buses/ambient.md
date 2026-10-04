# Original ambient loops

The game frame now updates six original ambient clips through the ambient bus: soft wind, day birds, night insects/night bed, river and mangrove coast. River/coast layers require an active hydrological field and a finite shoreline distance. Water gain falls with distance. Field sampling is cached by biome, four-metre listener cell and navigation revision; it adds no raycast, chunk regeneration or scene traversal.

The controller coalesces pending loads, cross-fades changed layers, prevents stale decoded sources from starting after exit/state replacement, and limits failed/evicted-source retries to once per audio second. Pauses attenuate the existing layers; stopped contexts launch no new sources. Ending a scene releases active and fading sources. Every original loop retains playback rate1. Technical initial gains still require listening validation. No weather or animal-death trigger is invented.

63/63 directed tests and1262/1262 full local regression tests pass. Build passes in37.47 seconds; the web-package audit passes with578 files,406683552 bytes,816 relative links and20 runtime GLBs. Routing now records33 connected and93 reserved entries; original126 MP3 identities remain verified.

The native browser diagnostic decoded all six original stereo48kHz clips, observed day/night/river/mangrove and paused layers, and completed without errors. Counts were2,3,4,4,4; the old river source was removed after changing biome. Paused gains approached one quarter of their previous level. Stop left zero voices and disposal closed the AudioContext. Evidence is in ambient-web-audio.json and ambient-web-audio.png.

This diagnostic deliberately uses controlled hydrology and muted output without a3D scene. It does not establish perceptual quality, native water-field rendering, actor mixture budgets or campaign music alternation. QA-155/156 remain partial. The earlier native mixed-scene tab207 still has no readable completion result.
