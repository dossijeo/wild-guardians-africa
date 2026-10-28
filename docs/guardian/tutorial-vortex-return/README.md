# Tutorial vortex and floating return

2026-10-28. Reuses GuardianVortex for HUD and world guidance with a continuous flow clock, preserving the spell envelope for casts. Two additional persistent draw calls in the HUD renderer (5 total observed); no particle allocations per frame.

The HUD actor retains its screen position when guidance ends and interpolates toward the dialogue: left in landscape, above in portrait. World guidance supplies its projected screen position to seed that return, without retaining a second visible body. Reduced motion uses an immediate positional change and static vortex.

Visual checks executed in the production HUD/Guardian fixture: pointing with visible vortex, withdrawing the hint and returning to landscape rest; 390x844 portrait return above the text. Screenshots attached. 22 lifecycle, singleton, tutorial sequencing and free-center tests passed. The singleton test now explicitly expects the tutorial vortex to remain visible while spell-only effects are cleared.

The world-to-HUD projection is integrated; a full graphical map-to-dialogue transition has not yet been revalidated in this change. No new overall performance claim is made.
