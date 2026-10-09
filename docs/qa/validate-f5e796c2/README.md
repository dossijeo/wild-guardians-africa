# Full validation after native library and watering routing fixes

[Validate game run 37934148381](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37934148381)
completed successfully on exact commit
`f5e796c276ff844298ffa17776ebee9cd8489eff`.

The complete suite passes **3719 / 3719**, with zero failures, in 544206.477 ms.
This supersedes the previously archived local 3713 / 3715 initial run plus
targeted repairs; those original failures remain preserved. Four native-library
controller tests account for the additional four checks in the CI suite.

Asset provenance, compressed web assets, audio runtime, master-plan rules,
balance reproduction and browser-script syntax checks pass. Production build
passes in 7.23 seconds. The web-package check covers 711 files / 445245944 bytes,
860 relative links and 22 runtime GLBs. The direct itch package and its upload
steps also succeed; this does not mean it has been published on itch.io.

This validates the actual native menu integration and routing code at this
commit. Controller checks do not prove rendered fullscreen layout: visual QA
of all four labs in both orientations is still pending because CUA cannot
initialize its kernel assets. It also does not establish Windows smoke success,
mobile visual acceptance, GPU performance or the thirty-case 100-night matrix.
The later budget-observer commit a5184191 has its own CI and is not reattributed
to this run.

`run.json.gz` and `run.log.gz` preserve the original GitHub CLI outputs.
`receipt.json` hashes compressed and original bytes, the exact SHA and scope.
The download saved both raw files successfully; printing a Unicode build glyph
then hit the local cp1252 console. The raw log was subsequently read as UTF-8
and the job conclusion, complete totals and package output verified directly.
