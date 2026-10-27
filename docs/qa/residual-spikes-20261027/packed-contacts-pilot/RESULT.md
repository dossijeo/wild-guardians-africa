# Packed contact topology: pilot only

QA-only runtime substitution; production source modules remain unchanged. The encoder reuses final indices, adds dense cell offsets and contact flags, removes nested contactCells and diagnostic-only contactAnchors from the worker response. Exact contact lookup uses the original index order. Seam requests forward the packed arrays; no main-thread reconstruction of nested arrays.

Nine targeted tests passed; added differential coverage confirms exact height values over16641 grid points plus authored contacts, exact seam output, unchanged position/color/index array identity, transferred metadata ownership and malformed topology rejection. This does not establish whole-game visual equivalence by itself.

Real-game pilot passed with active simulation and streaming, no page/console errors. All four intended source substitutions loaded. Large-message getter wall times were8.485/8.075ms during loading and9.360ms during the streaming window. The earlier diagnostic baseline had10.315ms for the streaming message, but these are separate runs, not controlled ABAB evidence. No adoption or performance conclusion. Small added typed metadata:3649 bytes for this grid; this is not a GPU allocation estimate. Metadata observation overhead remained below.165ms.

Next: interleaved A/B/A/B using run-packed-contacts-abab.mjs, with same fixture/quality/camera trajectory and chunk delivery, whole-frame/GPU evidence. Preserve both positive and negative outcomes. Current close-ground screenshot does not show enough far terrain to accept remote artistic parity; unchanged geometry and seam tests are stronger evidence here, with matched far captures still required before adoption.
