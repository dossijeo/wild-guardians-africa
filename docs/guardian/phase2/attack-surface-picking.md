# Surface-contact integration check

Added guardian-surface-pick.test.js for all five catalog beasts. It loads each catalog GLB with actual skin/morph geometry (texture references removed only for Node decoding), casts through WorldScene.pick, and passes that result through castPickedSpell and the real Attack command. The selected mesh point must survive exactly in magicImpact, SpellActivated.contact and GuardianMagicHit coordinates, even without any terrain intersection. All five checks pass.

This closes the previous test gap where a test titled surface-contact retention injected a point directly into Game.cast. It does not establish animated-pose picking, screen readability, shader appearance, or exact skin contact during ragdoll. The QA forced-direction fixture uses an approximate incoming-side contact and remains separate from production raycast selection.
