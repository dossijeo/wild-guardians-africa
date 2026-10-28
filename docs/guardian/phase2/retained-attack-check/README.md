# Attack replaced by Shield: runtime check

2026-10-28, branch codex/guardian-3d-animation, runtime f556d1e6b. Actual WorldScene fixture at tests/browser/guardian-combat.html on Intel UHD, 1600x900. Presentation clock frozen and advanced through visible controls; this is not a moving raid or physics validation.

Sequence: freeze, night, prepare hyena, Attack, advance 0.02 s, Shield, advance 0.12 s twice. An intervening Grow attempt was rejected by the fixture (no eligible crop at night); its error is preserved in the receipts rather than hidden. Only Attack and Shield were accepted.

At Attack age 0.14 s, one Guardian remained, Shield was materializing and the retained energy had one draw. At 0.26 s, contact.json records one Guardian, one retained attack, three retained draws, closed eyes and mouthOpen 0.802 on the hyena. Hurt and impact audio events were scheduled, but audio was disabled: no audible result is claimed. contact.png captures the scene; the QA panel obscures much of the contact region, so it is insufficient to approve the artistic quality of the impact.

At 0.62 s, cleared.json records no retained attack or retained draws, while Shield and the single Guardian continue. Maximum visible Guardian count stayed one. No additional runtime error occurred beyond the rejected Grow attempt. This verifies the presentation lifecycle only; the fixture was not running animal navigation or physical ragdoll.

The focused singleton, retained-energy and lifecycle suite passed 14/14 tests. Remaining evidence needed includes unobscured contact footage and the same interruption sequence during actual simulation, with sound and camera movement.
