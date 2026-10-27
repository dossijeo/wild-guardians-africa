# Rejected candidate-bounded transitions

All four processes completed, but the strict comparison gate rejected the fourth run: one audio .opus request failed with net::ERR_ABORTED. No page or console errors were recorded. Its timing/cause was not captured, so do not silently waive the failure or label this a clean comparison.

Descriptive A1/B1/A2/B2 CPU render P99:21.000/21.070/20.900/20.830ms. CPU P95:14.785/14.860/14.845/15.000ms. Presentation P99 remains about50ms. Presentation maxima83.150/99.810/83.250/116.095ms. Far-update P95 falls3.435/3.075/3.545/3.045ms, but no corresponding total-frame improvement is established. The first clean pair already fails the benefit criterion. These observations do not prove all larger maxima were caused by the change.

Decision: revert both production changes, retain the experiment in history, and avoid adding complexity for an isolated method saving. Restored native coverage/standby/prepared tests:36pass,0fail,0skip. This does not affect the native eviction improvement merged through PR218.

Reproduction of the rejected implementation: commit7d41449b7 contains the candidate, runner and diagnostic override; use an isolated checkout at that commit and run tools/experiments/run-far-candidates-abab.mjs with a new WG_FAR_ABAB_OUT. The latest comparator supports mode far-candidates. Current production has been restored, so running the old runner from current HEAD would no longer compare the rejected candidate. Raw gzip files and decompressed hashes in review.json preserve all evidence. Do not remove the failed request from raw data to make the gate pass.
