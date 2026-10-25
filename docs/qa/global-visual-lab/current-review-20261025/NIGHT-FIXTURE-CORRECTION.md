# Night fixture encoding correction

The initial `prepare-current-night-fixtures.py` used `read_text()` without an
encoding. On this Windows host it decoded UTF-8 input as a legacy encoding.
Serializing that already-corrupted text preserved the error in JSON escapes.
`Zona común` became `Zona comÃºn`; the exact comparison that excludes communal
areas from solid building polygons then failed. The village home was blocked.

This invalidates gameplay and equivalent-appearance claims for earlier runs using
`.codex-tmp/current-night-fixtures`, including the six `*-low-night-*` controls,
`sabana-worker-retention-active-roundtrips`, and
`sabana-night-stationary-worker-control`. Keep those files as negative evidence.
Their numbers must not be used to claim correct worker movement or equivalent
night artwork. The six-biome summary of those controls is superseded.

Original day fixtures, the day round trips and exit tests, and unit tests did not
use this conversion. This finding does not invalidate those results.

The generator now explicitly reads UTF-8 and verifies the written state against
an independent UTF-8 decode of the original, excluding only the requested time.
`low-night-fixtures-invalid-encoding.json` preserves the former hashes;
`low-night-fixtures.json` records the corrected hashes.
`night-fixture-encoding-diagnosis.json` records the differing code points.

The stationary control (retention disabled, no chunks created) reproduces the
immobile workers, so that symptom is not evidence against the retention policy.
Native reconstruction before correction finds the home unstandable; after
correction both home routes are found and both endpoints are standable.

Corrected browser reports use `valid-night` in their names. The corrected control
without retention still raises `SpatialChunkUnavailable` while streaming. Thus
the residency problem is real, independently of the encoding error. Corrected
active validation is required before any production enablement.

No navigation rule, village footprint, worker coordinate or home destination was
changed to obtain a favorable result. The correction preserves the source strings.

Corrected Sabana endurance completed 12 legs / 6 round trips, 175 installations,
with both workers at home (60,0), no new errors and no paused leg-boundary samples.
Elapsed simulation advanced from 120 to 175.73. The no-retention control raises
SpatialChunkUnavailable (72 paused frames). These protocols differ, so no FPS
comparison is inferred. The other five night biomes require corrected reruns.

## Interrupted serial validation, 2026-10-25

The user requested termination of Chrome during the Volcanes run. The browser
closed error in `volcanes-valid-night-active-roundtrips.failure.json` records
that external interruption, not a demonstrated game regression. Gran Canon
was not started; no benchmark process remains.

The independent verifier `summarize-valid-night-workers.py` confirms completed
corrected runs for Sabana, Gran Rio, Manglares and Desierto: twelve settled
legs, both workers at their original home coordinates, no unexpected errors,
and no paused leg-boundary samples. This is correctness evidence, not an FPS
comparison or continuous per-frame pause audit. The summary deliberately
fails its six-biome completion assertion while the last two reports are absent.
No production enablement or visual-equivalence conclusion follows from this
partial result.
