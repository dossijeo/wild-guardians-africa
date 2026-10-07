# Building relocation distance and rotation

The requested post-Jam automatic relocation cap is twenty percent of the building's length. Previously the resolver measured the world-axis bounding rectangle of the proposed footprint. Rotating a square by 45 degrees increased the cap by roughly 41%; other proportions could decrease it.

Single work centres now measure their footprint after transforming it back into building axes. This respects the native hull's dimensions and current scale while keeping the same candidate ordering, terrain/obstacle checks and final revalidation. Village proposals retain the extent of their complete multi-building layout.

All 74 directed tests passed across relocation, fluid-centre placement, native wall placement and shield collisions. New coverage checks five cultures at five rotations, rejects a rotated four-unit square requiring more than its 0.8-unit cap, and still accepts a slight shore overlap. Existing tests cover real Grand River/Volcano hydrology on flat bank platforms, paid placement, saved coordinates, deep-fluid rejection and playable volcanic openings. Platforms and fake flat shores are explicit fixtures; these tests do not establish every naturally occurring shore or seed.

The 27 canyon-village and canyon-water-audio tests also passed: both-bank openings across five cultures, saved/restored crossing routes, continued construction rejection on water, catalogue numbers 012/006, movement contact selection and river-loop lifecycle. Audio uses controlled emitters; this does not establish subjective listening, visible foot immersion or ripple appearance on a physical phone.

`npm run build` passed with the existing large-bundle warning. No rendering or per-frame work is introduced. Physical mobile placement and all-biome visual acceptance remain separate requirements.
