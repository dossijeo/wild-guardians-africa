# Hand emission origin

The original GLB hand bones start at the wrists. Their strongly weighted hand vertices lie approximately 0.055 model units farther along the local hand axis (around 0.13 world units at the summon scale). Using the bone origin placed energy at the wrist.

GuardianHandEmitters now fits one local point per hand from vertices with at least 0.5 hand weight at load time. Duplicate positions from UV seams are ignored. This is the center of the authored hand region, not a claim to reconstruct a detailed anatomical palm surface. Each frame only transforms the fitted point by the already-updated hand matrix. Grow, Multiply, Shield, Attack and Awakening share these anchors; projectile timings and gameplay are unchanged.

Seven tests pass: real hand region bounds and articulation, lap pose, mixer stability, Attack flight to the contact point at its shared impact marker, and frame-rate-independent spell pose. The flight test uses the new local emitter transformed by the actual animated hand. Production build passes in 21.60 seconds with existing import/chunk-size warnings.

Native spatial-wasm inspection: paused day Attack at 0.14 and 0.16 seconds. hand-emission-release.png shows the buildup orb over the hand; hand-emission-side.png shows the ray leaving the extended hand toward the hyena. No runtime errors. This sampled visual review does not certify all spell views or the ritual after this anchor change; those remain to be inspected. No geometry, texture or bone-weight changes.

Follow-up: inspected Grow at 0.36 s and Multiply at 0.60 s in daytime, with both beam roots visibly attached to the hands (hand-emission-grow.png / hand-emission-multiply.png). The targets and branching junction are outside those close views, so these images verify roots only. Shield at 0.60 s was first occluded by a building in the QA detail camera; the left-side view clears it and shows both roots (hand-emission-shield.png).

The eight-view plant ritual replay succeeds after switching the fixture to daytime for legal wall construction: one Guardian at 0.9 s, none at 3 s in each day/night view. The receipt deliberately retains the initial failed night-construction error; it is not an error-free run. The fixture now explicitly sets day before constructing its paid wall, matching the successful manual preparation. Ritual framing is too distant to certify fine palm alignment; the sheet verifies continued leaves, appearance and disappearance only. Existing Shield geometry remains in this shared scene. Fifteen awakening/persistence/path tests pass.
