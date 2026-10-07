# Worker candidate identity and first native appearance review

The new batch exposed a review-cache collision: two different worker GLBs share the same original color image, so an image-hash/index directory overwrote one model's candidate and receipt with the other. The native identity guard rejected the wrong-model comparison before rendering. Runtime assets and archived per-model candidate hashes were unchanged; this was an ignored candidate-cache defect.

Candidate storage now uses original **model hash + image index**, independently of the provider cache's upload-image hash. All sixteen distinct model candidates were rebuilt from reused provider outputs. `../embedded-color-batch-candidates/model-cache-rebuild.json` verifies every regenerated GLB against its previous archived model-specific hash; no new provider output or runtime installation occurred. Seventeen directed identity/cache/preparation/decoded-candidate tests pass. Two new identity regressions ensure shared images cannot overwrite different models and invalid path/index identities are rejected.

The browser comparator now supports the four gameplay worker profiles, validates their original model identity and quality gate, verifies both GLB hashes before loading, and exposes the camera/hash proof in its DOM report. It uses the production worker pose/tool visibility controller (`Walk_Skip`, frozen at .55), production toon recipe and fixed world lighting. Historical beast comparisons retain their own route and guards.

## Amara young: partial native acceptance

Native tab 670, actual 1280×720 rendering. Eight screenshots compare reference/candidate from the front and opposite view, in day/night. Visual inspection found no obvious added seam, loss of face definition or loss of the cloth/headwrap motifs at this framing. The texture is lossy, not pixel-identical. The two twelve-row readback reports cover six biome uniform configurations in day/night from both views, with zero GL errors, fixture errors and console warnings/errors.

Both readback runs preserve the fixed pose; each screenshot pair has identical recorded camera/target values. The tiny floating-point change after a complete orbit occurs between views, not between the members of a screenshot pair. This scene has a flat QA floor, no HDR environment or simulation; the walking pose's airborne foot is the same in both variants. These checks do not prove full biome-world appearance, all animation actions, phone/Tauri behavior, RAM/GPU/frametime or the other three workers. Tab 670 was closed after archiving; rejected tab 669 was also closed.

No texture is installed in this delivery. The other workers, buildings/menu model and remaining candidates still require native appearance review. Crop candidates remain rejected under the current numerical gate.

Reproduce Amara young with `/tests/browser/embedded-color-pilot.html?profile=youngFemale&pilot=0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894-1` after regenerating the ignored model cache. Hash guards refuse stale references after a runtime change.
