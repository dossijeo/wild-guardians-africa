# Skip depth preparation for wholly excluded roots

Predicate matches depth capture: at least one visible, non-transparent, depth-writing material in a visible subtree. Transparent parent materials do not exclude opaque descendants. No material UUID readiness cache. Three focused tests cover ownership/error/cancellation, transparent-root exclusion and opaque descendant preservation.

Attributed pilot:87 in-game submissions instead of179, no GL calls>=10ms, CPU callback max40.64ms, travel11.705s,settled11.723s,240active frames,15new chunks,zero failed/pending stream jobs. This is promising but not AB acceptance; diagnostic counts and single-run timings cannot establish improvement. Next compare against original7d00e96a7 with detailed trace disabled, then validate visuals/lifecycle.
