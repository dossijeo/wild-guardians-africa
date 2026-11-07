# Recovery contact sampling diagnosis

The native rhino pose in `tests/fixtures/rhino-recovery-surface-pose.json.gz`
replays with a floor-minimum difference below 1e-15 m. Comparing its entire
non-tail skin against the runtime recovery support samples gives:

- Full skin minimum: 0.00418247 m, Mesh_0 vertex 22693.
- Runtime sampled minimum: 0.01000000 m, Mesh_0 vertex 22687.
- Sample count: 1830; missed surface depth: 0.00581753 m.
- Recovery age: 1.182595 seconds.

Receipt: `rhino-contact-sampling.json`. Reproduce from the repository root:

```sh
node tools/guardian/audit-recovery-contact-sampling.mjs tests/fixtures/rhino-recovery-surface-pose.json.gz
node --test tests/guardian-surface-pose.test.js
```

This pose does not penetrate. It demonstrates a small support-sampling error,
not the cause of the earlier -0.020417 m entry observation. The authored recovery
deliberately retains physical entry clearance and blends it toward 0.01 m over
0.65 seconds to avoid an instantaneous vertical snap. A negative entry therefore
needs an actual captured physical-entry pose to distinguish collider fit from
support sampling. The positive later pose cannot establish that distinction.

No production support margin, collider, animation or geometry is changed by this
diagnostic. Increasing every animal's height would risk reintroducing floating
feet. Next evidence needed remains a negative native entry capture with its
vertex witness and physical pose. Full visual acceptance remains open.

## Negative native capture now reproduced

A new real WorldScene/Game.tick repeated-hit run captured penetration at recovery
age 0.05 s. The native report completes both knockdowns, has no errors, and never
shows more than one Guardian. The full-pose fixture is
`tests/fixtures/rhino-recovery-negative-surface-pose.json.gz`.

- Full non-tail skin minimum: -0.01364654 m, Mesh_0 vertex 30255.
- Runtime support-sample minimum: -0.00587140 m, vertex 34768.
- Additional depth missed by samples: 0.00777514 m.
- Exact replay discrepancy: zero.
- Negative minima also occur at ages 0.15 and 0.26666 s.

Receipts: `rhino-negative-contact-report.json` and
`rhino-negative-contact-sampling.json`. The added replay test passes and
intentionally preserves this defect as diagnostic evidence; it does not assert
that penetration is acceptable or fixed. The three pose-replay tests pass.

This rules out sparse sampling as the entire explanation: even sampled skin is
below ground. However this capture is already 0.05 s into recovery, not the
exact incoming physical pose. The next targeted capture should retain the
incoming physical snapshot, entryClearance and fitted colliders so that their
support and the entry blend can be evaluated independently. No production
animation or support margin has changed.
