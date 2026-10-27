# Seam submission attribution

Real-game diagnostic completed without captured errors or dropped regional spans. During the 40-second measurement window: ground attachment max 22.52 ms; generic worker postMessage max 5.325 ms across 13 submissions; worker creation max 0.325 ms. Neither seam snapshot nor seam submission emitted a >=1 ms sample in the window. Absence is censored and does not prove execution or zero cost. Generic worker submissions must not all be attributed to seam work.

This does not support a seam rewrite as the explanation for the 22 ms attachment. Additional unmeasured setup, including material/toon constructors, remains to be instrumented. Keep worker submission costs separate from actual worker compute, GPU time and presentation. No optimization adopted in this diagnostic.
