# Edge-target placement fallback

The nearby 16 placement candidates can all crop the body at distant screen edges. Only when no clear candidate fits the conservative body/vortex envelope, evaluate ten additional positions at radius+5 and radius+6.6 toward the camera. Expand the crop/worker broad phase to cover those positions. Existing nearby choices remain available and retain their score; no camera or gameplay change.

All 19 placement/singleton tests pass. Repeated real daytime sequence after the change; inspected the formerly marginal second arrival at 4.7 s: full body and vortex are inside the viewport. Video, screenshot and final status accompany this report. This is one reproduced scenario, not all camera/terrain coverage or measured worst-case placement cost.

Added a regression case with a target at z=-12 that requires the expanded search. It verifies all eight envelope corners within the .92 NDC margin, then places a crop and an incapacitated worker separately at the selected outer position, beyond the old broad-phase range. Both must produce a grounded, framed alternative with the required clearance. Placement and singleton suites now pass 20 tests. This mathematical fixture supplements the earlier recording; it is not new graphical evidence.
