# Recovery sole orientation correction

The position-only two-bone IK rotated each foot with its lower leg. During
get-up this pointed the toes into the terrain and caused the shared contact
correction to raise the entire pelvis. Recovery now captures the standing
world orientation of each foot and blends back to that orientation with the
same contact weight as the leg IK. No contact samples are discarded.

Validation: 32 tests passed across beast-ragdoll, beast-combat-physics,
baked-beast-fall, baked-ragdoll-clip and actor-expression. A new five-species
check measures world-space sole orientation at full support. Existing tests
retain their initial-pose continuity, maximum frame displacement, terrain
penetration and displaced-root assertions.

This is a partial correction, not visual acceptance of get-up. The lion's
standing-pose diagnostic still identifies tail and rear-cloth contacts that
lift the body above reachable hand supports. Trials with a raised tail and
forward torso lean identify ClothRear_R_Inner_03 as the next limiting contact.
Simply lowering the pelvis increases that penetration and is not a solution.
Secondary appendages need a ground-clearing pose, with continuous restoration,
before hand support and the complete recovery can be validated visually.
No new graphical validation or performance claim accompanies this change.
