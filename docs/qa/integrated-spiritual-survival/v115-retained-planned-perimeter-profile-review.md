# Exact retained planned-contour CPU diagnosis

This diagnostic uses a copy of stopped v115 at day twelve, time 276, with 233 living crops. It restores the saved planned contour directly, rather than starting a new policy search. All 449 retained source hashes match the loaded sources. It does not issue purchases or advance the copied game, and serialization is unchanged afterward.

The native quote contains one remaining piece, one gate update and cost ten, matching the retained remaining cost. Quotation took 156.17 ms. The cold worker-first-v4 integrated proof passed all five animal-radius checks and took 22,274.12 ms. It was not rejected at the worker precondition. Terrain tiles served 103,539,255 requests, with 1,647 misses and six resident tiles (55,296 typed-array bytes).

The V8 sample report attributes approximately 93.05% of sampled time inclusively to `staticAnimalCertificate`, through its cold `certifyAnimals` computation. Largest self-time frames are lattice lookup (17.14%), coarse segment clearance (13.75%), wall collision bounds (11.58%) and fluid containment (10.15%). These inclusive and self percentages are different measures and must not be added together.

The probe ran concurrently with v116. Profiler overhead and other workloads affect timing; this is a hotspot diagnosis, not an isolated A/B benchmark, gameplay frame-time measurement or acceptance of performance. A cold reconstructed view also cannot demonstrate the warm-cache behavior of the historically running policy.

The first probe failed before certification because the diagnostic incorrectly required `quote.valid`, a field absent from the native wall quote API. The corrected probe validates the actual quote shape and allows the native integrated proof to decide validity. The initial profile remains preserved as `.cache-v116-copied-planned-perimeter.cpuprofile`; this was a diagnostic-tool error, not a campaign failure. The successful original trace is retained compressed as `v115-retained-planned-perimeter.cpuprofile.gz`, with its uncompressed SHA256 in the CPU summary.

The next optimization must address repeated animal certification while preserving physical validity. A retained positive proof may only be reused when the complete prospective collision geometry, terrain providers and vegetation suppression are demonstrably equivalent. Fresh crops still require their native contact-pose checks and workers require fresh service routes. Gate changes, destroyed/modified geometry, changed props or terrain must invalidate coverage. Do not remove physical proofs or count hypothetical unpaid walls as protection to accelerate the campaign.

Reproduce with `node --cpu-prof tools/probe-retained-planned-perimeter.mjs <stopped-directory> <fresh-output>`. The JSON report, CPU summary and compressed trace retain the concrete measurements. v116 continues on its original runtime; no optimization was promoted during this diagnosis.
