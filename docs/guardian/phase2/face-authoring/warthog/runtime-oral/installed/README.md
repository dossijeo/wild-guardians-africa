# Active warthog integration

The catalog now references source SHA256 `53c8f76ba3af3c972206a86e9fb4c9c25be3bb890077caa99c9c0b1bc3240b89`. The original is retained. Web delivery is 4,698,684 bytes; source is 75,278,672 bytes. Action and footstep calibrations and all 40 baked fallback clips were regenerated against the current catalog. Published gameplay radius remains 1.1 m.

The real WorldScene/Game.tick combat fixture was opened without `face`, so no QA model override was installed. Its trace confirms eleven expression bindings, one visible Guardian maximum, one active physical ragdoll, no rejected simulation, no fixture errors and zero actors left down after the completed cycle. The video and one-second contact sheet were visually inspected: impact, falling, rolling, standing and resumed movement are visible. The final still partly hides the recovered animal behind the building; the video is the useful body-motion evidence. Audio was not enabled.

Validation: 62 focused expression/action/ragdoll/footstep tests passed; asset verifier passed; production web compression verification passed with exact geometry/animation bytes and zero glTF errors. The saved model also passed the separate 287-pose original-animation audit. These checks do not close the broader night, repeated-hit, obstacle and performance matrix.

During installation, replacing the whole public catalog from the source manifest incorrectly removed its crop-specific metadata. This was caught by an actual scene-load error, corrected by updating only the warthog entry in each independently preserved catalog, and the successful no-override run above was performed afterward.
