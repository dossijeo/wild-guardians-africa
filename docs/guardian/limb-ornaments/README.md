# Rigid limb ornaments and nighttime revalidation — 2026-10-28

The remaining worst Attack edge after the hem repair was not cloth. Its welded connected component is a detached 62-vertex wrist ornament, approximately 26 mm across in source coordinates. Spatial shoulder relaxation had mixed nearby cloth weights into it: the two edge endpoints carried 8.5% and 17.9% non-forearm influence. The arm gesture and mantle wind therefore pulled a rigid ornament apart.

`tools/guardian/limb_ornaments.py` reconstructs connected components including coincident UV seam vertices. It binds only small components (at most 200 vertices and 35 mm largest extent) whose average existing influence is over 75% Forearm or Hand. Fifteen components qualify; see bindings.json. Larger components and other bone categories are excluded. This runs after shoulder/hem smoothing in the build recipe. The editable Blender source and GLB contain the corrected weights.

## Validation

- Blender sampled all ten body/cast clips with Float and the relevant wind layer. Attack maximum edge ratio drops 3.259 -> 2.787; Grow 2.895 -> 2.408. Idle remains 1.544. Full report: deformation.json. Some residual maxima remain elsewhere; this is not a claim that every deformation is ideal.
- The actual Three.js inspector passes all 84 assertions; three-quarter Attack screenshot shows the wrist ornaments retaining their shape.
- Wild Engine night recording executes six Attack/Shield commands with camera and zoom changes, hyena/rhino targets and successive attacks. No runtime errors, maximum one visible Guardian, no active summons, ragdolls, baked recoveries or rigid bodies afterward. The final hyena is retreating and no longer has magicDown. See night.json and night.mp4.
- Contact-sheet frames were inspected: appearance, shield, downed hyena, recovery and disappearance are visible. These sampled frames do not prove continuous visual perfection or all terrain/contact combinations. Audio was not activated in this recording; this is not a new SFX validation.
- Build and package pass: 993 files / 494,970,113 bytes. Guardian remains 2,765,144 bytes, 37 bones and 3 primitives. No new runtime calculation or dependency.
- Recorded physics peak step 16.63 ms and setup 11.02 ms are single-run diagnostics, not a paired performance comparison. Existing comparative performance work remains open.

## Reusable modeling lesson

Spatial weight smoothing can bleed across adjacent but disconnected surfaces. Inspect the welded component and bone contributions before broadening smoothing or weakening animation. Rigid beads/bracelets should follow their owning limb, while cloth should keep its own deformation chains. Include UV seam duplicates when identifying components. Use size and dominant-bone guards, inspect qualifying components, then verify combined extreme poses in the runtime. Do not treat a numerical maximum alone as proof of a visible fabric defect.
