# Depth preparation submission attribution

Corrected QA instrumentation records submission/readiness spans and material UUIDs. Previous directory far-depth-submission-attribution failed with a generated syntax error; that attempt is not performance evidence. Production sources unchanged during either run.

Full recording including initial loading:215 submissions,173 unique material objects,131 material objects seen more than once, maximum101 appearances. This does not prove101 redundant programs: renderer recipe and lifetime may change.

From first measured main frame onward:179 submissions,174.335ms total synchronous CPU,max5.71ms;92 native-tree-standby,80 native_merged_assets,7 other roots.179 awaited readiness spans total1266.825ms,max253.98ms. Awaited durations overlap and are NOT additive blocked CPU or wall time. These figures alone do not explain the entire ABAB throughput regression.

Next: establish exact selected-program identities and live material/context/configuration invalidations before skipping requests. Avoid an unsafe material-UUID-only cache. Shared program readiness can potentially be reused; preserve actual depth-target recipe, shadows disabled, geometry features, current world lighting, cancellation and resource release. Candidate remains unapproved.
