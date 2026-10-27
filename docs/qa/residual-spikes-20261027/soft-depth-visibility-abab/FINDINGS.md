# First interleaved visibility-admission sequence

All source/invariant checks passed: same hardware/runtime/URL except treatment, 240 advancing camera frames,15 chunks each,no failed/queued chunks. CPU P95 A1/B1/A2/B2:27.01/24.83/23.88/17.99 ms. CPU maxima51.77/61.55/53.97/45.07 ms. Settled times15.215/16.362/19.235/7.764 s. Candidate omitted34/104 and98/157 requested captures. No slow GL calls recorded.

CPU P95 improved both pairs, but first pair worsened maxima and completion latency; second improved strongly. Variable wall duration changes actor movement/effect visibility and yields unequal sampled frame counts. A single sequence does not establish robust end-to-end improvement. Repeat unchanged before acceptance; do not discard the negative first pair. GPU queries include bubbles and are not exclusive GPU execution. No production activation.
