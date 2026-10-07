# Worker candidate identity and first native appearance review

The new batch exposed a review-cache collision: two different worker GLBs share the same original color image, so an image-hash/index directory overwrote one model's candidate and receipt with the other. The native identity guard rejected the wrong-model comparison before rendering. Runtime assets and archived per-model candidate hashes were unchanged; this was an ignored candidate-cache defect.

Candidate storage now uses original **model hash + image index**, independently of the provider cache's upload-image hash. All sixteen distinct model candidates were rebuilt from reused provider outputs. `../embedded-color-batch-candidates/model-cache-rebuild.json` verifies every regenerated GLB against its previous archived model-specific hash; no new provider output or runtime installation occurred. Seventeen directed identity/cache/preparation/decoded-candidate tests pass. Two new identity regressions ensure shared images cannot overwrite different models and invalid path/index identities are rejected.

The browser comparator now supports the four gameplay worker profiles, validates their original model identity and quality gate, verifies both GLB hashes before loading, and exposes the camera/hash proof in its DOM report. It uses the production worker pose/tool visibility controller (`Walk_Skip`, frozen at .55), production toon recipe and fixed world lighting. Historical beast comparisons retain their own route and guards.

## Amara young: partial native acceptance

Native tab 670, actual 1280×720 rendering. Eight screenshots compare reference/candidate from the front and opposite view, in day/night. Visual inspection found no obvious added seam, loss of face definition or loss of the cloth/headwrap motifs at this framing. The texture is lossy, not pixel-identical. The two twelve-row readback reports cover six biome uniform configurations in day/night from both views, with zero GL errors, fixture errors and console warnings/errors.

Both readback runs preserve the fixed pose; each screenshot pair has identical recorded camera/target values. The tiny floating-point change after a complete orbit occurs between views, not between the members of a screenshot pair. This scene has a flat QA floor, no HDR environment or simulation; the walking pose's airborne foot is the same in both variants. These checks do not prove full biome-world appearance, all animation actions, phone/Tauri behavior, RAM/GPU/frametime or the other three workers. Tab 670 was closed after archiving; rejected tab 669 was also closed.

The initial Amara-young delivery installed no texture. The subsequent four-profile review below supports the worker recipes; terminal runtime rebuilding and packaging are recorded separately in [worker runtime evidence](../tinify-worker-runtime/README.md). Buildings/menu model and remaining candidates still require native appearance review. Crop candidates remain rejected under the current numerical gate.

Reproduce Amara young with `/tests/browser/embedded-color-pilot.html?profile=youngFemale&pilot=0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894-1` after regenerating the ignored model cache. Hash guards refuse stale references after a runtime change.

## All four gameplay profiles: partial native acceptance

Tabs 672 (youngMale), 673 (olderMale) and 674 (olderFemale) completed the same eight-screenshot review and two twelve-row GPU readbacks. All three temporary tabs were closed. Visual inspection of every new screenshot found no obvious additional face, clothing, headwrap, visible hat-brim or seam artifact at this framing. The older male's upper hat is partly hidden by the QA toolbar in both variants; this review does not establish that concealed area's appearance. The frozen walking pose, including any lifted feet, remains identical within each pair.

Together with youngFemale, `four-profile-pairs.json` verifies sixteen baseline/candidate pairs, 32 screenshot hashes and 96 readback pairs. Each pair preserves camera, target, pose, profile, biome, view, lighting and both GLB identity receipts. All fixture errors, WebGL errors and warning/error logs are empty. Readback mean differences use byte channel units (0–255); they are not normalized percentages. All six biome uniform configurations currently yield identical object-color differences for a given view/light, so these are configuration checks rather than six full biome scenes.

The reviewed four model candidates save a combined 1,418,728 GLB bytes if the exact candidates are installed. This is encoded download/storage size, not decoded texture allocation or a demonstrated RAM, CPU, GPU or frametime improvement. Full biome worlds, other poses/tools, mobile and Tauri appearance remain separate acceptance gates. These recipes cover four gameplay models, not the other four archived worker variants sharing their images.
