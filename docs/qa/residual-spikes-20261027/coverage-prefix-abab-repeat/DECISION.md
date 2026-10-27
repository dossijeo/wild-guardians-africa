# Prefix upload repeat: not adopted

Coverage bytes remain reduced about 88%, but end-to-end consistency is insufficient. A1/B1/A2/B2 presentation P95:116.35/49.97/116.34/116.41 ms; P99:166.19/66.63/149.76/149.52. GPU query P95:67.15/31.37/58.58/61.40 ms. Completed chunks:20/23/20/21. In the last pair only2/20 common completed keys arrive earlier; median delay worsens1385ms. First pair improves all20. Runtime/source/readiness checks pass.

Across the two series, three pairs improve presentation and one does not, with mixed delivery. This is not proof of a robust whole-game benefit. Keep the small candidate, raw evidence and Three attribute lifecycle test, but do not change production. Do not claim lower bytes proves the cause of the decoder stalls. No third identical series planned without a new causal hypothesis or stronger control of the observed session variability.

PR220 water integration is independent. Preserve its tested runtime; these experiments are QA only.
