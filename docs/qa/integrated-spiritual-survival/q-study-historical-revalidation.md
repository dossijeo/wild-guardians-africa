# Historical Q-study reporting compatibility

The read-only Q-study now selects the immutable recipe identified by each recorded pressureFacts.candidateVersion (missing means historical 1). Quantity, hit ranges and damage/radius remain the historical inputs; only the hypothetical Q multiplier varies. It asserts native baseline composition and budget at that version's actual multiplier rather than assuming every recorded campaign used multiplier 1.

Revalidation: 64 rows for retained candidate 1, 36 for candidate 2 and 8 for candidate 3 all pass native composition/budget assertions. Every original field of all 64 archived candidate-1 counterfactual rows equals the regenerated historical calculation exactly. New diagnostic outputs remain in separate cache paths; original studies and native receipts are unchanged. Report and tool hashes are recorded in the companion JSON.

This reporting-only repair is not imported by native campaign policy or game runtime. It does not alter the three active fourteen-night candidate-3 pilots, inflict damage, approve balance or claim new simulation evidence.
