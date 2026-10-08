# Fresh native restoration QA after ownership fix

Root ran this fresh native context from branch HEAD `20a46c75`, with the adapter introduced in `90499695`. Viewer and adapter hashes are recorded in the manifest. The report and all five exact comparison PNGs were copied from root's independent cache before another export.

The reported interaction sequence was day 150, native focus, angle once, two explicit original/candidate toggle cycles with a completed comparison after each selection, then SaveRepository restore while the candidate was active, Day and Focus without another Angle, a fifth comparison and Finish. Root observed a mouse timeout during capture 4, but the same handle showed capture count 4 and completed status; it did not rerun or restart that comparison.

The verifier passed for the exported functional fields: five pairs, unchanged paired logical state and cameras, reported shared growth binding, candidate-active exact save/restore and cleanup with context loss. The manual interaction sequence is root-observed evidence; the report does not log every toggle separately. All five exact PNGs are preserved rather than only the rolling endpoint's final PNG.

Root also observed Texture Unable Serialize warnings in the last 20 console entries. Those observations do not establish a total warning count, and no independent console file was supplied with this archive. Report errors are empty; that is not an assertion of an empty console.

This is functional restoration evidence, not physical GL buffer ownership or changing-growth upload evidence. The world is paused and draws use delta 0. Identical screenshots, renderer.memory counters or an exact save roundtrip do not prove GPU buffer identity, VAO binding, animated morph continuity, resident resources or net World GPU improvement. Actual user perceptual review and category approval remain pending, and no production asset is promoted.

Run `node tools/frontside_verify_world_maize_ownership_native.mjs docs/qa/frontside-model-pilot/maize-world/native-ownership-880/report.json` for the exported functional contract. The manifest hashes the raw report and each preserved image.
