# Guide return after consecutive spells and Attack

Native browser review, 2026-10-30, branch codex/guardian-3d-animation.

Opened tests/browser/guardian-combat.html?lightingReview=1 in the in-app browser. The visible status explicitly reported spatial-wasm. Enabled the QA tutorial guide, then used the six-command agricultural burst (alternating Grow/Multiply, fixture cooldown resets). After the burst the queue was empty, one Guardian was visible, and maximum visible Guardians remained one. The overview screenshot shows the restored guide with its vortex next to the crops.

Kept the guide enabled and ran the actual Attack physics-cycle control. One hyena received damage (56 to 28 health), completed ragdoll/recovery, and returned to walking. The cycle completed after 12.073 simulation seconds, with zero remaining downed actors, zero rejected physics and no reported errors. The guide was again active, with maximum one Guardian. Saved both a close view (head partially cropped by the QA detail camera) and a wider view showing the full figure and recovered hyena.

Evidence:
- [DOM receipts](guide-cast-return.json)
- [After agricultural burst](guide-after-consecutive.png)
- [After Attack, close](guide-after-attack.png)
- [After Attack, complete figure](guide-after-attack-wide.png)

Scope: the guide is the fixture world-target override, not the full tutorial HUD or its narration. Audio was not unlocked: recorded audio events explicitly have played=false. Screenshots establish sampled final appearance, not continuous transition quality. The burst uses a presentation clock; the Attack cycle runs Game.tick. This is not a balance or paired performance test. Frame p95 was 66.64 ms with a 316.06 ms maximum; no fluidity claim is made. This evidence does not close the remaining tutorial-video, collision or artistic acceptance work.
