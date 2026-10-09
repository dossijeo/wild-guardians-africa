# Last successful main Windows loading reference

[Run37922095376](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37922095376)
on `57527dc9` passed build, executable/installer checks, actual production smoke
and genuine minimization/restoration. Its retained smoke records a nonzero
1028 × 720 Gran Cañón/Mapungubwe world, model decoding, audio, storage and worker
checks without errors. Both executable artifacts were available at this review.

This source precedes interactive-loading PR18 (`53a4a996`). The original
`src-tauri/smoke.js` is byte-identical to current main at the receipt's review
base and already requires production readiness within90 seconds. The current
failure cannot therefore be explained by a newly stricter main smoke deadline.
Candidate diagnostic branches add observers separately from this unchanged
main test; their sources and measurements must remain distinct.

The old success is a functional reference, not a controlled performance pair.
Its report does not identify the same GPU backend as later diagnostics. Neither
the diorama nor the software renderer is established as the exclusive cause by
this comparison. Attribute the actual pending initialization work before changing
the production recipe. The old green build does not approve current loading,
later library fixes or the complete gameplay acceptance matrix.

`receipt.json` pins the raw smoke artifact and common test-source hash. The
separate visibility artifact remains in the linked workflow; it is not copied
or independently re-audited here.
