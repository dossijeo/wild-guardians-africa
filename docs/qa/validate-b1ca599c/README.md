# Validate Game — b1ca599c

[Run37975467986](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37975467986)
finished successfully for `b1ca599cf8e6f3d4f42aa2808e33c2e51dc44f79`.
The original run metadata and complete log are retained in `run.json` and
`full.log.gz`; `receipt.json` records byte counts and SHA256 values. Decompression
was checked byte-for-byte against the downloaded original. Every reported step
completed successfully.

- 3,757 tests passed; zero failures, cancellations or skips.
- Asset, web-asset, audio-runtime, plan, balance and browser-script checks passed.
- Web build and package checks passed:711 files,445,250,097 bytes,
  860 relative links and22 runtime GLBs.
- The direct itch ZIP was generated and uploaded:388,365,922 bytes; the packaging
  step verified CRCs.

The preceding run37973100718 failed one SFX inventory freshness assertion after
the configured centre-cost refactor changed two recorded source hashes.
`b1ca599c` regenerated those two hashes. Review confirmed that all126 catalogue
rows, assignments, callers and original audio bytes stayed unchanged; the three
directed inventory tests passed before this complete CI run.

This evidence covers the pinned revision's automated checks and web packaging.
It does not approve Windows loading, the current economic candidate, physical
mobile interaction or perceptual audio. Later revisions require their own
verification; archived files alone do not prove those checks.
