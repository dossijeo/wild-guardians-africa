# User references for final loading-screen polish

2026-10-08: two supplied mockups (12609 day,12610 night) refine the visual
direction for `feature/interactive-loading-screen`. Originals are preserved in
that feature's `docs/qa/interactive-loading-development/references/` as
`user-loading-day-mockup.jpg` and `user-loading-night-mockup.jpg`; they are design
references, not screenshots of the implementation or replacement backgrounds.

Prioritize the maize and naturally spaced initial plants, a small textured soil
patch with softly disappearing borders, and atmospheric depth. Day uses warm
sand/cream mist; night uses blue mist with restrained illumination that keeps
the plants readable. Preserve the original shared skybox and resource ownership.
Use low-cost lighting/shaders rather than volumetric simulation.

The latest reference supports a modest stylized wooden main-progress frame with
vine detailing, a parchment planting hint and a wooden cancel control at the
upper left. Reuse existing HUD artwork/fonts where practical. Keep real milestone
text/percentage, responsive safe areas, ES/EN and touch/click hints. Do not cover
the plants or obstruct planting. Background mountains, stars and light shafts
in the mockups guide composition/color; they do not require expensive new scene
content or replacing the shared sky asset.

The existing loading subagent has these references and instructions. Polish
follows ongoing fluidity work; before integration compare actual day/night and
portrait/landscape captures against the references and verify frame/memory cost.
Original functional, lifecycle, compatibility, performance and PR gates remain.
