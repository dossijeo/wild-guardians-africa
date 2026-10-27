# Coverage prefix first ABAB

Identical source hashes, hardware, initial camera/residency verified by comparator. No runtime errors. Selected prefix candidate leaves selection, arrays, capacity, shaders and density unchanged. Coverage uploads A1/B1/A2/B2: 402.24/47.94/390.96/48.70 MB over approximately 40.8 seconds.

Presentation P95: 116.14/99.78/132.71/83.30 ms; P99:149.72/133.06/149.98/133.01. GPU query P95:61.31/58.60/64.31/51.75 ms. Render CPU P95:22.22/24.63/21.56/20.59 ms. Completed chunks:22/19/20/23, with censored delivery P95:5725/10729/8431/5252 ms. Thus presentation improves in both pairs but streaming and CPU are mixed. Maximum presentation stays about199.5ms.

First pair screenshots inspected, no obvious coverage loss; camera exposes only a limited fern area and dynamic time differs. Not complete visual equivalence. Actual Three WebGLAttributes test passes shrink/regrowth/zero/deferred updates and shared consumers.

Provisional: promising, not adopted. Repeat ABAB before drawing a performance conclusion due known device/session variability and delivery tradeoff. Preserve negative and positive results.
