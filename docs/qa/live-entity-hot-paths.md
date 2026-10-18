# Historical entities in active render and simulation scans

The crop simulation already maintains a live-crop index. The scene still filtered the entire crop history on every `sync()` and every crop pick. Delivered crates likewise remained in the scene scan, loose-crate task scan, carried-crate lookup and the dawn resource check. This change uses the existing live-crop index for rendering and a matching live-crate index for those repeated scans. Delivery invalidates the crate index; an appended crate is incorporated incrementally. A restored or replaced array starts with a fresh index.

Reproduce the isolated workload with `node tools/benchmark-live-entity-scans.mjs 20000 500 1000`. It performs the same visible-crop and undelivered-crate selections as the old and new paths, with 20,000 historical and 500 live entities of each kind. An ABBA run on this host produced identical checksums (640,000). The four full-history scans took 336.85, 129.20, 84.68 and 84.12 ms; the four indexed runs took 12.09, 12.38, 10.22 and 9.00 ms. The first scan includes extra warm-up variance. These are microbenchmark times, **not** a measured improvement in `Game.tick` or browser frame time.

The regression test invokes the real scene `sync()` repeatedly and verifies that, after its first index build, it never reads 20,000 dead crops or 20,000 delivered crates again. Existing delivery, economy and save/reload tests continue to verify that accounting and serialized data have not changed.

Historical records still exist in saved `plants` and `crates` arrays and are read when a complete save is validated. Removing them from the domain and revising the ledger/tutorial contracts is a separate change; this patch only removes them from the frequent selection paths and leaves the save format intact.
