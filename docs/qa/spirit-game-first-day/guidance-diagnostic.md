# Optional guidance observation

The opening walkthrough did not capture the tutorial hands clearly. This is an unresolved observation, not proof that a hand is absent or that the underlying selection is broken.

Run the regular Vite app with `/?qa-guidance=1`. In development only, the hidden `#stats` element exposes a JSON snapshot of the tutorial step, reading/automatic guidance, pause reasons, selected tool, world hand geometry/opacity, HUD hand visibility and image readiness, voice status, camera and crop/worker state. It does not issue simulation commands or change the selected target. The element is excluded from translation. This data supplements screenshots; it does not substitute for visual acceptance.

The production build was checked for `qa-guidance`, `worldHand` and `handsEnabled`; none occur in its generated asset bundles. Thirteen existing hand-sequence, placement-focus and action-pause tests passed. These checks cover selection and pause invariants, not a new native walkthrough.

Next native checks: before opening Build, capture the visible HUD hand and paused time; after choosing the centre, capture the world hand and its legal target; place the centre and repeat for Grow/first seed. Check automatic narration completion preserves required guidance, explicit dismissal removes it, and a second new game restores both hands. Observe physical watering and harvest delivery afterwards, then the first natural raid and its event/tutorial presentation.
