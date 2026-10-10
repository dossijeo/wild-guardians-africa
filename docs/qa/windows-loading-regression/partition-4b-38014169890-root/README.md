# Independent native crop-partition trial review

Exactly one isolated Windows run: 38014169890, job114100676498, frozen commit `4b1108180210d2155e7d5e254b025209e7cc8f46`. Terminal success. Crop partition enabled; all other experimental recipes disabled. Original 90-second readiness bound and full-model preflight retained.

Root independently downloaded the smoke, visibility and PNG artifacts and matched every byte count and SHA256 to the official GitHub API digests. Original run/job metadata and complete workflow log are retained separately. Verify with `python docs/qa/windows-loading-regression/partition-4b-38014169890-root/verify.py`.

- Packaged world readiness reached after 70924ms in Gran Canyon/Mapungubwe.
- WebView2 context not lost; all25 desired chunks loaded, queue empty, no chunk failure.
- Genuine native minimization lasted300113.2ms; restoration resumed1.2 simulated seconds. No synthetic visibility override. The original report defines the exact simulation comparison and exclusions.
- Root visually inspected the official PNG: canyon ground, river, buildings and trees are rendered. The capture contains no crops and cannot prove crop-stage/morph/material fidelity or loading-diorama appearance.

This is the first positive isolated native readiness result after retained normal-main failures. It is not an AB/BA performance comparison: runner hardware/cache/seed conditions are not matched. The report identifies Microsoft Basic Render Driver; no GPU/frame-time improvement is inferred. It does not approve all biomes, continuing populated saves, physical devices, or main integration.

Before promotion, remove the40.85MB temporary duplicated runtime payload and validate actual native crop/diorama rendering, resource ownership and the final packaged default path. Production remains unchanged by this evidence-only commit.
