# Scoped cancellation repeat

Passed using per-world/probe counters. Cancellation released group, water geometry and material exactly once; residency keys/identities unchanged and no map mutations recorded. Streaming was not idle: before queued=2/busy=true/preparing=0; after queued=1/busy=true/preparing=2. This confirms concurrency exists during the probe, but does not prove the cause of the earlier failed run.

Night live bed: 23364 bytes identical, 26 yields, resident chunk 2,0 retained. This is functional evidence only. A git push overlapped the run, so its performance measurements must not be used for comparisons. No runtime changes.
