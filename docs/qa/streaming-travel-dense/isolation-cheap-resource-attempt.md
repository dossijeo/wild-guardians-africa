# Cheap isolation resource comparison: pending browser recovery

On 8 October, after FrontSide tabs 842–845 and loading first-crop tab 77 had
completed and closed, root attempted a paired buffer-resource audit at main
`23b44304811c4c8804d8f420f8a4b8aa0096f65e` (runtime helper from `56b492d4`).

Control URL:
`http://127.0.0.1:5350/tests/browser/streaming-travel.html?fixture=gran-rio-suajili-100&quality=media&seconds=15&speed=12&awaitActors&residentPrograms&residentTextures&crateShadow&resourceProfile`

Native IAB tab 846 appeared in inventory with this URL and title `about:blank`.
Navigation timed out; repeated inspection of the same tab timed out before
command dispatch. No ready/done report or resource measurements were obtained.
The Vite process 45796 and CPU campaigns 41304, 41320, 48904, 49032 were confirmed
live. The control was not restarted and no candidate context was opened.

Closing tab 846 also timed out. An inventory still listed the tab afterwards;
it was marked for handoff. This is not proof of GPU/context cleanup. Other agents
were told to hold GPU work until actual recovery/closure is confirmed.

The paired audit remains incomplete. This attempt supplies no memory, frametime,
visual or optimization acceptance. Resource probes would perturb timing even if
the run succeeded; they must not be used as a frametime comparison. Production
isolated preparation remains disabled pending resources and visual regressions.
