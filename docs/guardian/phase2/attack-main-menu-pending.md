# Main-game Attack acceptance: incomplete

New tests/browser/attack-gameplay.html prepares a dedicated qa-attack-gameplay slot through prepareWildEngineWorld, the shared spatial session, frame scheduler and BrowserSaveRepository. It pays for the center/crop/worker, credits 200 QA coins, advances to night five and injects one rhino. It is explicitly not a naturally reached campaign.

Browser verification: prepared state saves successfully; Continue loads it in the real main application and displays the native HUD. Opening Power shows all four original cards, including Attack with its 12-second cooldown detail (attack-main-menu-pending.png). This supersedes the initial legacy-terrain fixture which the application correctly rejected.

Acceptance NOT passed: the injected beast subsequently triggers Native attack intention rejected: -5; the game stops and all spell cards are unavailable. Earlier invalid qa-attack-rhino ID was corrected to the native animal-N format. The remaining actor initialization must be reconciled with native raid spawning before this scenario can verify targeting/casting. Do not interpret this screenshot as a successful Attack integration run. The isolated card/cooldown test remains valid within its documented scope. No production navigation change made for this QA issue.

## Native footprint correction

The injected rhino used radius 1.1 rather than ANIMAL_SPATIAL_PROFILES.rhino.radius (1.55). The fixture now imports that authoritative profile and selects an initial site through native walkable with the animal profile. Browser preparation found (87,-12), saved successfully, and the main game then continued through several minutes of game time without the prior rejection banner. Power now enables Shield and Attack; attack-main-menu-enabled.png records the real panel. Selecting Attack closes the panel. Click attempts at stale moving-animal positions produced Select an active beast, so a successful main-game hit is still unverified. No production navigation was changed.

## Successful main-game casts

Repeated with the normal pause/resume controls to inspect target position without letting the animal leave the captured location during operator review. Resumed, opened Power, selected Attack, and clicked the visible moving rhino through the real canvas. First successful cast at game clock 00:57 showed the Guardian vortex and beam/contact flash; immediate menu inspection showed disabled Attack with 12 / Cooling down. After the ordinary cooldown expired, a second successful cast at 01:50 is saved in attack-main-game-impact.png; attack-main-game-cooldown.png and full accessibility snapshot attack-main-game-ui.txt show disabled Attack with 11 / Cooling down. No QA direct-cast hook or cooldown reset was used in this main-page sequence.

This establishes normal menu selection, surface targeting, visible summon/connection and cooldown in this prepared native-world night. It does not establish continuous ragdoll/get-up quality, sound quality, all camera/obstacle cases or performance. The pause menu was used between observations, so no uninterrupted cadence claim. Earlier failed targeting attempts above remain historical evidence; initial setup rejection is resolved by the native profile/clear-site fix.
