# Canyon submerged normal basis correction

Reproduce: `node tools/experiments/capture-canyon-bank-normalbasis-review-20261022.mjs` with Vite5190. Seed712, media, 1280x720, three views day/night. Twelve real captures; all six pairs have identical camera/target/time/draw calls/triangles and no captured errors (audit.json). Comparison sheets show old mixedbed left, corrected normalbasis right.

The candidate extracts sampleTurfN410 from the native ground shader source and uses it directly, replacing the manually reconstructed sand normal. This corrects reversed lateral normal-map orientation and shares the native minimum normal-Z guard. No color, reflection, geometry, textures, sample count or production code changes. No timing benchmark was run; unchanged counters do not prove equal GPU time.

All six paired views visually reviewed. Difference is very small: whole-frame mean RGB absolute difference .024-.064 byte units daytime and .007-.019 nighttime. These values quantify change, not artistic improvement. Correct basis retained as QA groundwork, but the pale edge and uniform river remain. No native adoption or final-quality claim.

Revisited the original Canyon mockup (ART-REFERENCES.md): the desired bank reads through broad material continuity, irregular shoreline detail, existing vegetation and light/shadow masses. Small changes to a submerged sand normal cannot provide those features. Further trials should address complete bank/material response and distribution at game scale, preserving authoritative terrain and model silhouettes; avoid another isolated normal-intensity adjustment.
