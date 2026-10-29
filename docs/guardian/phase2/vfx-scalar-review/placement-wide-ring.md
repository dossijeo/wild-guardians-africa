# Edge-target placement fallback

The nearby 16 placement candidates can all crop the body at distant screen edges. Only when no clear candidate fits the conservative body/vortex envelope, evaluate ten additional positions at radius+5 and radius+6.6 toward the camera. Expand the crop/worker broad phase to cover those positions. Existing nearby choices remain available and retain their score; no camera or gameplay change.

All 19 placement/singleton tests pass. Repeated real daytime sequence after the change; inspected the formerly marginal second arrival at 4.7 s: full body and vortex are inside the viewport. Video, screenshot and final status accompany this report. This is one reproduced scenario, not all camera/terrain coverage or measured worst-case placement cost.
