# Actual menu scoped transport failure — 31a5fa3e

Root executed the native menu with `qa-transfer-mode=fail` in slot 902. The private transport server returned HTTP 503 only for the existing `/content/biome-savanna.json` request. Other assets retained their original bytes and routes. The source and server stayed frozen during observation.

The existing application report finished with `ready:false`, progress 0.22110100137529956, one failed download, `closed:true`, and `cancelled:true`. The latter records failed presentation teardown; the player did not manually cancel. The exact error was `No se pudo cargar /content/biome-savanna.json`. Configuration and subsequent initialization stages remained pending. Failed readiness never became 100%.

Root observed return to the native menu, zero world canvas and loading overlays, no dialog and no console errors, then closed the tab and confirmed an empty inventory. Audio/owner counters were not observed in that DOM capture; this test does not establish their cleanup. Raw report and returned-menu photograph are retained alongside this note. This functional test does not establish loading performance.

At the later menu inspection, no error remained visible. Existing generic errors create an alert banner and remove it after six seconds; the observation does not prove that the error was never displayed. A persistent, dismissible loading-failure notice remains a follow-up, scoped separately from ordinary six-second errors.
