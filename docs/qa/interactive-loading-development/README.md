# Interactive loading development evidence

These are diagnostic pilots, not completed acceptance or a performance claim. The branch is still under development and no PR is open.

- `first-diorama.png` and `gameplay-after-transition.png`: first actual New Game integration. The original ground atlas experiment was subsequently replaced after visual review.
- `diorama-native-day.png`, `diorama-native-night.png`, `diorama-native-input.json`: isolated native crop/shader fixture. Mouse planting added a fifth seedling; after its catch-up it matched the initial four at 55%. Clicking the occupied position did not add a sixth. The day/night toggle uses the real clock threshold. The fixture slider is a manual presentation control, explicitly distinct from production progress.
- `pilot-integrated-sabana.json`: real weighted initialization and cinematic with CPU duration wrappers. Diorama ready 1,109.8 ms; visible world 18,832.6 ms; control 22,905.7 ms. Maximum delivered interval 1,596.4 ms, primary world render 1,583.8 ms. This fails responsiveness acceptance.
- `pilot-batched-sabana.json`: same recipe with native screen/shadow draws in batches of four and a full final shadow pass. World ready 16,024.1 ms; control 20,170.9 ms. Maximum interval 515.5 ms; two draws still cost 508.1/505.4 ms. This remains above acceptance; further investigation required. These independent warm-cache pilots are not ABBA and cannot establish a loading-time gain. Transport/cache differed, notably walls.

Both integrated pilots used Sabana/Mapungubwe, seed 712, media. Four previously inventoried Node campaigns remained active (35912, 49032, 41304, 41320); root and FrontSide avoided overlapping GPU/Blender/heavy suites. These runs do not claim device-independent timing, GPU timer results or exact peak RAM/VRAM. Heap/resource snapshots are coarse observable proxies.

Native tabs were disposed and closed after each run; the context reported lost after disposal. Latest isolated visual run had no console errors/warnings. The earlier integration had existing environment shader warnings recorded in its console JSON. Lifecycle tests cover borrowed ownership, compilation cancellation, worker cancellation and camera restoration; full production lifecycle/coverage is still pending.
