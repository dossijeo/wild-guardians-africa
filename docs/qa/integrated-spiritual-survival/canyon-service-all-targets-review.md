# Canyon retained perimeter: complete target diagnosis

The read-only diagnostic now continues past the first rejected target. It tests the same retained, unpaid proposed perimeter against all 118 live crop/operational structure targets and all five distinct native animal body radii (1.55, 1.1, 0.97, 0.9 and 0.85). Each target/radius pair uses the original strict service-component proof, without changing its acceptance rules.

Of 590 checks, 589 return `native-service-poses-in-positive-closed-components`; one returns `native-service-origin-unproven`. Across the checks, 18,871 service poses were examined: 5,912 were body/contact blocked and 12,958 positively certified. The remaining pose belongs to plant-1668 at radius 1.1, at (-14.02818644229418, 53.88413519062497). No check reported an open direct route or an open native approach route. Absence of such reports does not prove the remaining pose enclosed.

The ambiguous pose has no usable connector among its nine native origin lattice nodes, with or without the proposed walls. The original diagnosis remains applicable: this is an intrinsic fractional navigation-pose ambiguity, not evidence that moving the perimeter will solve it. The group-level accessibility test remains false for `groupBlocked`, so group accessibility cannot be used to discard the pose either.

Two independent fresh runs produced byte-identical complete JSON. Each run asserts exact preservation of serialized native state, including RNG, navigation epoch and ledger. Snapshot and source hashes are included in `canyon-service-all-targets-v2.json`. No walls were purchased, no campaign source was changed, and no defense plan was accepted.

Reproduce from this source revision using a fresh output path:

```powershell
node tools/diagnose-native-service-origin.mjs docs/qa/integrated-spiritual-survival/canyon-river-service-proof-strict-v1.json NEW_OUTPUT.json all-targets
```

Next investigation should establish positive physical connectivity or isolation for this one pose. Do not weaken the proof to accept an empty native search frontier, and do not interpret 589 passing checks as certification of the entire perimeter. These results are geometry diagnostics, not paid-defense, economic, visual, GPU or mobile acceptance.
