# Installed-chunk mask prototype

QA-only groundResidentMask=1. The distant ground previously discarded the entire requested near rectangle, including chunks not yet installed. This prototype retains coarse distant ground in unoccupied cells, using one nearest-filtered 8x8 RGBA texture (256 source bytes, no mipmaps). Existing Three.js ownership is retained and disposal is idempotent. No extra draw call or render pass is introduced. The data source is installed graphical chunks, not native-only worker leases.

Sabana, media, 720p, current recipe, sparse GL checking, same 40-second authored day excursion. No recorded console errors, final GL error or simulation pauses. Direct inspection of checkpoints at 15 and 20 seconds shows the previously blue gaps covered by coarse terrain. Near grass remains visible. This does not certify every frame, night, other biomes, internal height seams or GPU cost. The mask remains opt-in.

Nine ground tests pass, including installed/hidden/removed chunks, shifted bounds, avoidance of redundant texture upload and one-time disposal. The historical full-rectangle path remains unchanged when the flag is absent. Native generation, navigation and simulation rules are untouched.

Remaining work: night and Gran Rio/Volcanes, camera/quality transitions, and controlled GPU cost. Coarse fallback must not be mistaken for final near detail or used to excuse permanent streaming delay. Canyon and Desert use a separate horizon implementation and are not covered by this shader patch.
