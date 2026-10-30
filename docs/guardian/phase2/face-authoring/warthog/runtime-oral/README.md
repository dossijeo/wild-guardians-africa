# Warthog oral candidate: Three.js validation

The v5 oral candidate remains outside the active actor catalog. These are actual browser captures from `tests/browser/actor-expression.html?actor=warthog&view=mouth`, with the candidate copied to the ignored `test-results/warthog-face-candidate.glb`.

- `running-pain`: Running at 0.35 s, both eyelids closed and mouth 0.85.
- `attack-side`: Charged_Upward_Slash at 1.2 s, both eyelids closed and mouth 0.85. The opposite anatomical profile follows the posed head; the raised arm still partly occludes the face.
- `compressed-partial`: compressed v5, rest pose, eyelids and mouth 0.65, three-quarter view. The cavity, tongue and lower tusks remain visible; no obvious snout or collar stretching in this sample.
- `compressed-walking-neutral`: compressed v5, Walking at 0.55 s, all facial morphs zero, opposite profile. No protruding tongue is visible; the native tusk base and angular lip remain visible. This is one sampled moving pose, not a full-cycle clearance check.

The fixture's profile buttons now derive their target and orientation from the current head pose. Previously, an animated head rotation could show the mane instead of the requested facial profile. This change only affects the inspection camera.

## Compression

The project compressor reduced 75,278,672 bytes to 4,698,684 bytes. Run:

```sh
node tools/compress_web_assets.mjs --candidate source.glb packed.glb
node tools/verify_web_assets.mjs --candidate source.glb packed.glb
```

The standalone verifier reads the compressor sidecar, validates both hashes, and leaves the production manifests untouched. Attached reports verify 1,822,842 geometry/animation bytes exactly, texture checks, the local decoder, and zero decoded glTF conformance errors. The compressed model loaded in Three.js with seven clips, eleven facial bindings, four draw calls and no fixture errors.

## Limits

These sampled poses do not prove every animation frame, tooth attachment or collision. Four draw calls in this isolated fixture are not a game performance benchmark. Full gameplay Attack, ragdoll and recovery with this candidate, as well as broader closed-mouth moving-pose inspection, remain required before promotion.

## First real combat cycle

`combat-cycle.mp4` and `combat-cycle.json` record a daytime run of `guardian-combat.html?face=warthog&recoveryDay=1`. The explicit QA override loads the compressed candidate through WorldScene; the production catalog is unchanged. The fixture now supports an explicit warthog override and rejects unknown species instead of silently selecting hyena.

Game.tick, Attack, Rapier and the existing stand-up controller ran together. The trace contains falling, rolling, recovering and walking; final down count is zero, peak physical ragdolls one, peak visible Guardians one, and fixture errors empty. Eleven expression bindings loaded. The recorded sequence and its one-second contact sheet were inspected: the animal falls, rolls, rises and resumes walking without a visibly stuck pose.

This medium-distance shot does not resolve lip, tusk or eyelid clearance during the impact. It also does not cover night, repeated impacts, walls, every camera angle or the baked overflow path. Sound was not enabled for this recording. The report retains measured timings, but this single run is not an A/B performance comparison. Promotion still requires close facial inspection during real events and the remaining integration checks.

## Event-driven facial reaction

`combat-impact-face` and `combat-pain-face` retain screenshots and state at spell ages 0.26 and 0.50 s. Game.tick was stepped through the actual Attack contact; facial values were not overridden. At contact both blink channels reached 1 and mouth reached 0.8205. At 0.50 s they relaxed to approximately 0.7944 / 0.7944 / 0.6847 while the animal was falling. The eyelids visibly cover the eyes and the tusks remain attached in these front views. The snout and beard obscure much of the mouth interior from this angle, so this proves the gameplay trigger and visible eye response, not full interior clearance. The fixture now exposes its paused state and labels the pause button, avoiding ambiguous toggles after a measured cycle auto-pauses.

## Portable review package

The candidate is now saved under `content/source/actors/warthog`, including a packed editable Blender source and the verified compressed GLB. Both fixtures reference that package instead of the scratch file. The production catalog remains unchanged.

`combat-impact-profile` records the side inspection attempt; the strategic camera minimum distance limited facial detail. `combat-impact-close` records a rejected close-view framing attempt: projection zoom enlarged the actor but the head is clipped above the viewport. Neither is accepted as proof of detailed mouth clearance. The new QA profile controls need their framing corrected before that remaining inspection can be counted.

## Corrected close inspection

The camera constraint also resets target height to terrain height; increasing zoom could not fix that. The fixture's facial inspection now uses WorldScene's existing cinematic camera mode, directly aims at the head and reduces the toolbar height. Returning through the regular camera controls disables that mode. No production camera code changed.

`combat-close-corrected` and `combat-other-profile-corrected` show the same actual impact at age 0.26 s from two sides. The three-quarter shot resolves the open oral pocket and its reddish interior behind the lower tusks, both closed eyelids, and the snout without a stretched chin or collar. The opposite profile shows the large tusk attachment intact; the tusk itself obscures much of the pocket. These samples show no obvious detachment or neck stretching. They are sampled visual acceptance of this impact pose, not proof across all motions.

`packaged-animation-audit.json` compares the saved compressed candidate to the original: 21 bones, seven clips and 287 sampled poses; maximum position difference zero, maximum angular difference 6.664e-8 rad.
