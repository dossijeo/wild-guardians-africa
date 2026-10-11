# Physical raid return with one-hit crops

The twenty QA-104 return cases (five cultures times initial watering, later watering, harvest and dropped cargo) failed before their return assertions because they still expected one destroyed crop per two warthog strikes. The current explicitly authorized resistance is one hit. A selected Mapungubwe case reproduces `2 != 1` at that destruction-count assertion; it is not evidence of a navigation failure.

Only that count is updated: every consumed physical strike destroys one distinct exposed banana decoy. Added uniqueness of destroyed target identifiers. The native hit count, exact spent strike budget, banana-only target selection, collision-safe worker paths, unmodified ledger, cancellation of repairs, original task preservation, physical return and reload checks remain intact.

All twenty cases pass after the change. No navigation, AI, crop resistance, pressure, player policy or economic code changes. The separately documented main worker seam fix is still required in the final integration; this test result cannot prove that fix unnecessary or that a running campaign did not encounter another navigation problem.

Original selected failure and full final output are retained as gzip files. The frozen live campaign was not changed. Together with the prior focused corrections and committed-target repair, 38 failures listed in Validate38161299163 have now been individually addressed in development; no updated full-repository pass is claimed.
