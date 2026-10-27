# Cleared depth equivalence

Full-depth target is cleared before every sample; a cleared-only control must differ from real depth. Compare full capture to scissor and cropped-projection/viewport capture inside the conservative particle rectangle. Two particle scales and day/night. See report for exact results. This narrow static fixture is not full visual acceptance: moving cameras, render origin changes, multiple effects, screen edges and near-plane fallback remain.

Earlier soft-depth-equivalence run did not explicitly clear preceding samples and is not used as acceptance evidence.

Result: equivalence FAILED. Scale1 scissor matches, cropped camera differs70 pixels. Scale3 scissor differs222976 pixels and crop222979, repeated day/night. Region also unexpectedly expands between runs. Investigate test/state restoration and custom camera-dependent callbacks before further performance trials. Do not adopt either prototype.
