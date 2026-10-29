# Main-game Attack acceptance: incomplete

New tests/browser/attack-gameplay.html prepares a dedicated qa-attack-gameplay slot through prepareWildEngineWorld, the shared spatial session, frame scheduler and BrowserSaveRepository. It pays for the center/crop/worker, credits 200 QA coins, advances to night five and injects one rhino. It is explicitly not a naturally reached campaign.

Browser verification: prepared state saves successfully; Continue loads it in the real main application and displays the native HUD. Opening Power shows all four original cards, including Attack with its 12-second cooldown detail (attack-main-menu-pending.png). This supersedes the initial legacy-terrain fixture which the application correctly rejected.

Acceptance NOT passed: the injected beast subsequently triggers Native attack intention rejected: -5; the game stops and all spell cards are unavailable. Earlier invalid qa-attack-rhino ID was corrected to the native animal-N format. The remaining actor initialization must be reconciled with native raid spawning before this scenario can verify targeting/casting. Do not interpret this screenshot as a successful Attack integration run. The isolated card/cooldown test remains valid within its documented scope. No production navigation change made for this QA issue.
