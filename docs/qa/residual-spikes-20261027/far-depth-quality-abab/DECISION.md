# Full far depth preparation: wait fixed, throughput acceptance failed

Four interleaved attributed runs pass source-treatment, runtime, fixture, hardware and active-stream checks. Existing24 compiler warnings in every run remain visible. No clean-console claim.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Main CPU max ms |142.53|52.59|231.48|67.90|
| Main CPU P99 ms |50.35|26.16|56.99|35.08|
| Callback cadence P99 ms |99.72|132.94|132.94|116.40|
| Settled wall seconds |10.79|14.75|13.87|16.61|
| GL calls >=10ms |1|0|4|0|

All runs create15chunks and sustain240/240 advancing frames, no paused or failed/pending stream jobs. Long blocking program waits disappear in both candidates. However settled time is36.7% and19.8% worse, and callback cadence is not consistently improved. Candidate is NOT approved for main. It is retained only as an experimental starting point to remove redundant preparation/admission cost, with a demonstrated exact-variant correctness hypothesis. No visual-equivalence or full-lifecycle acceptance yet.

The next investigation must count preparation submissions and distinguish changed resources from repeated requests, including the native asset-group route and program lifetime across quality changes. Avoid recompiling/preparing the same already-ready depth variants or serializing useful publication unnecessarily. Do not fix throughput by allowing incomplete graphics or removing depth coverage.

GPU query times include command bubbles and overlapping preparation; increases are not proof of more shader execution. Transition interval samples cover variable-duration windows, so callback cadence over the whole run and total useful completion time are reported separately. Only two repeats, one historical Volcanes save; these are attributed diagnostic measurements, not final player-performance acceptance.
