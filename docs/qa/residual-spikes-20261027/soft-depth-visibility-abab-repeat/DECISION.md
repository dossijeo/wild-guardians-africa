# Decision: do not enable current soft-depth admission prototype

The unchanged repeat passed source/runtime/hardware and functional invariants,240 advancing frames and15 new chunks each. CPU P95 A1/B1/A2/B2:19.17/18.04/18.59/23.57ms. CPU maxima40.32/37.59/39.44/44.98ms. Settled8.550/8.052/8.067/8.618s. Both candidate runs skipped ZERO captures (87 and81 requests). No slow GL calls.

Combined with the prior sequence, offscreen-only demand is real but scenario dependent. The first sequence skipped34/104 and98/157, with mixed latency/maxima. The repeat does not demonstrate an end-to-end advantage and the final pair regresses. Differences when zero passes are skipped cannot be credited to the admission optimization. Do not force artificial offscreen workloads to justify adoption.

The code remains QA-only and production rendering is unchanged. Preserve tests, exact color controls, initial failed control, positive attribution and both ABAB sequences. Future reconsideration requires independent evidence of substantial offscreen-only demand during representative play, not another identical trial. Overall fluency remains open; shift attention to other confirmed work rather than indefinite particle micro-tuning.
