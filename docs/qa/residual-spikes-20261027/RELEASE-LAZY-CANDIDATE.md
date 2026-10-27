# Deferred replacement visual composition

Experimental source candidate; official WASM binaries and main unchanged.

Batch eviction now restores the replacement selection from resident lattice, ponds, visible/solid props, reconstructs its small collision buckets and nearby-settlement list, and marks its visual composition pending. Native navigation removal/graph publication is still synchronous and complete. No additional resident per-chunk texture/geometry cache is introduced.

The first visual buffer getter composes all visual outputs from the selected spatial data. Selection state moves through PreparedChunkData with the pending flag, so temporary selection save/restore cannot silently discard pending work. JS buffer consumers obtain the pointer before capturing memory.buffer to tolerate memory growth. Single-chunk removal remains the full procedural reference.

Validation: standalone profile build succeeded; six differential biome tests passed, now checking exact props, halo count, heights, colors, water mask/levels/mesh and ground mask in addition to all profile components and routes. Candidate pthread build succeeded; six-biome batch eviction/concurrent generation, stale result rejection, retry and complete eviction passed (release-lazy-concurrency.json).

Isolated native diagnostic native-release-lazy/report.json shows no populate or visual composition during removal. Its timings were collected while the pthread build ran and are NOT valid comparative performance evidence. They confirm call attribution only.

Still required: real-game A/B/A/B, handling of actual reads after eviction, memory/lifecycle and world-edit tests, and broader visual validation. Deferred composition may still block if a consumer immediately requests the payload; no frametime improvement is claimed yet. Production binary adoption remains gated on real-game benefit.
