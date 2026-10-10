# Independent terminal review

Root obtained official artifact 11653083083 directly from GitHub and verified
37358 bytes and SHA256 `de21668923d149a66a032f6aaaf6ab5f5db11ad6568b764e6282c8c635140a33`.
The retained payload is byte-identical to that independent download. The archive
verifier passes, including source, inputs, original logs and chronology. A first
root equality check used the wrong local filename; correcting it to the retained
`.payload` file passed without changing any original evidence.

Source `93d584ef`, run 38009458201: build/installer pass; readiness fails after
90016.9 ms, displayed 85%, world not ready. Native minimization is skipped.
Serial image scheduling is exercised with the other three candidates disabled.
All 242 observed transfers completed, with zero pending or failed. The world
compiler is active in batch 1 of 78 (619 objects); the observed pending program
selection is only about 1.225 seconds old, not proof of a stuck shader.

The prepared await is 24.9885 seconds. That measurement and the image-chain
ordering do not prove total loading improvement: the world is unfinished and
the previous runs differ in seed, scene size, runner/cache and compiler progress.
World/warm/compile spans are nested, not independent costs to sum. The candidate
remains OFF and unpromoted. No retry, combined recipe, removed variant/fence or
relaxed readiness deadline is justified by this result.
