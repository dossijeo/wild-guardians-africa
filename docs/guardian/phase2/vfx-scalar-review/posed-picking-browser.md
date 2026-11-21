# Posed selection in WorldScene

Added opt-in pickProbe to the existing combat fixture. It records the actual WorldScene pointer pick (entity, terrain point, mesh hit point and simulation time) without issuing another spell. Normal fixture behavior remains unchanged without the query flag.

Loaded the installed hyena, enabled real Game.tick, issued Attack, paused and advanced with the existing .12-second step control. Clicked the visible body once in falling state and once in recovering state. Both returned qa-beast-0 and a finite mesh hit point distinct from the terrain point; no errors. Raw statuses and screenshots: fallen-surface-pick.* and recovering-surface-pick.*. The probes did not spend another cooldown or apply damage.

This is two graphical posed-selection samples after the prepared-bounds fix. It does not certify every limb, all species, continuous physical motion or support contact. In particular, step-driven recovery screenshots must not be treated as an acceptance recording of fall/get-up timing or ground support.
