# Current buffalo lateral Attack cycle — 2026-10-29

After positioning changes through fcb3830f2, 163 tests in the selected Guardian/spell/agricultural-guide files pass (no skips). [Exact selection and receipt](post-placement-integration.json).

Executed the actual WorldScene fixture with buffalo, lateral direction and **Medir ciclo físico real**. It uses continuous Game.tick and Attack, with fixture health/cooldown setup; not a natural campaign or a paired performance comparison. Completed 12.006 simulated seconds in 12.031 wall seconds, 402 frames, zero hidden frames/errors. Phases include falling, rolling, recovering and return to walking. Peak one physical ragdoll, zero baked; final down count zero; max one Guardian. Full [diagnostic JSON](buffalo-lateral-current.json).

Recovery contact samples have minimum non-tail support between 0.0100 and 0.0461 world units above terrain. These are sparse sampled vertices, not an exhaustive no-intersection proof. [Isolated recovery screenshot](buffalo-lateral-current.png) does not establish natural motion throughout the complete cycle. No subjective audio review occurred.

Frame p95/p99/max 33.445/49.90/66.475ms. Physics total p95 4.9ms, max 21.46ms; setup max 19.44ms. Diagnostic support sampling adds overhead, so this does not close performance acceptance or identify the cause of each frame spike. Current source has changed since older recordings; this run checks that this directional heavy-animal path still completes after integration.
