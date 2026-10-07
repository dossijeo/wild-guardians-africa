# Native building color candidate review

The hash-guarded color comparator now accepts `culture=suajili|etiope|mapungubwe|saheliana|musgum`. It obtains the actual descriptor from `public/content/destruction.json`, checks its original identity and candidate quality receipt, hashes both GLBs before loading, and constructs both houses with the production `Assets.building`, `NativeBuilding` and `BuildingDestructionPass`. It does not substitute the stock GLTF material for the native destruction shader. Source-derived candidate textures remain outside runtime.

The damage button cycles intact, 35% and 65% damage. Both houses retain the same descriptor, native seed, geometry, frozen elapsed time and damage. Only the selected house and its opening mask render; the QA opening-pass cache is explicitly invalidated when comparing representations. Day/night modifies actual sun, ambient and native night uniforms. The floor is flat QA geometry without HDR, world generation, economics or gameplay.

## Mapungubwe checkpoint

Temporary native tab 675 completed 24 screenshots (twelve reference/candidate pairs): front/opposite view, day/night and all three damage states. Every screenshot was visually inspected; no obvious additional motif, color, roof/wall seam or damage-edge artifact was found at this framing. The color is lossy and is not pixel-identical. The report panel conceals a small part of the lowest foreground pillar, so this does not establish every texel's visual appearance. Damage effects are frozen and the review does not establish collapse or repair behavior.

`mapungubwe/screenshot-pairs.json` verifies equal camera, target, damage, light, view and both GLB identity receipts for each pair, and records the image hashes. Six completed readback reports contain 72 pairs, all with zero WebGL and fixture errors; warning/error console logs are empty. The six biome labels repeat this fixture's lighting comparison: NativeBuilding's material does not use those labels. They are not evidence for six full biome scenes or independent biome palettes. Channel differences are byte units (0–255), not normalized percentages. Tab 675 was closed after archiving.

This candidate's numerical gate passed earlier with PSNR 32.93 dB, alpha unchanged, decoded geometry/animation byte-exact and no new conformance errors. Its potential GLB saving is 545,644 bytes. It is not installed: other cultures, closer inspection, collapse/repair, full-world appearance, build/package and device acceptance remain separate gates. No RAM, CPU, GPU or frametime improvement is claimed.

Reproduce: `/tests/browser/embedded-color-pilot.html?culture=mapungubwe&pilot=fedb713c0b32df33f11111a91e2c3e0616a0345ec9be9a8beeecaa0b93ef26cb-1`, using the archived batch's model-specific candidate cache. Stale runtime or candidate hashes are rejected before rendering. The edited inline module passed `node --check` and executed successfully in the native browser. Existing worker and beast branches retain their identity guards and pose controllers; their prior screenshots describe their respective earlier fixture versions.

## Suajili checkpoint

Temporary native tab 676 completed 24 screenshots (twelve reference/candidate pairs): front/opposite view, day/night and intact/35%/65% damage. All screenshots were visually inspected. No obvious added roof-straw, plaster, railing motif, color seam or damaged-edge artifact was found in the visible framing. The lossy candidate is not pixel-identical. The report panel conceals lower stairs and planters, so this review does not establish every surface or texel. Effects and pose are frozen; collapse, repair and closer inspection remain separate gates.

The archived screenshot receipts verify identical camera, target, damage, day/night, view, resolution, pose and GLB identities within each pair. Six completed reports contain 72 readback pairs with zero WebGL/fixture errors, and the warning/error console log is empty. As above, six biome labels repeat native lighting and do not establish six full-world scenes. Tab 676 was closed after capture. The first automation wait timed out on a text selector after the comparison had actually finished; the completed report was read and saved, then subsequent waits used the re-enabled compare button and reports were independently checked for completion. No failed comparison was counted as success.

The source-derived numerical gate previously passed at PSNR 34.89 dB, alpha preserved, decoded geometry/animation byte-exact and no new conformance errors. Potential GLB saving: 452,364 bytes. This candidate remains outside runtime and is not evidence of RAM/GPU/frametime gains or device acceptance.

Reproduce: `/tests/browser/embedded-color-pilot.html?culture=suajili&pilot=3ba902fd9bfc99589348ba9202513e9daa63442a6c2b21bb23a15bf58bd546f7-1`. The archived baseline runtime SHA-256 is `17b726c16ac0dad0cf3350df9cb816d70bede0905c01a998ead9bf4e6a35e6fb`; candidate SHA-256 is `42cb87456448aff663296dfc46616d1eb381ac733adc7b452c2406b4b8f45fb5`.

## Etiope checkpoint and receipt verification

Temporary native tab 677 completed and closed after 24 screenshots and six finished readback reports. Every day/night screenshot was visually inspected for both views and all three damage states. No obvious added artifact was found in the visible triangular wall motifs, straw roof, color edges or destruction openings. Lower steps, baskets and plants are partly hidden by the report panel. This does not establish all texels, close views, collapse/repair or device appearance. The candidate remains outside runtime. Numerical PSNR was 32.87 dB; potential GLB saving is 456,884 bytes.

`node tools/verify_native_building_color_evidence.mjs etiope` independently checked twelve screenshot pairs, six completed reports and 72 readbacks. It also passed for Suajili and Mapungubwe. The verifier checks original culture/model identity, the hashes of the currently available runtime and model-specific cached candidate, pose/damage/light/view, exact cameras within each screenshot pair, PNG/JPEG encoded dimensions and screenshot hashes, the twelve expected day/night rows, zero GL/fixture errors and empty warning/error console logs. Later comparison-report camera values allow only 1e-12 absolute round-trip orbit error; the screenshot pair cameras must match exactly. It writes the pair/summary receipts only after every check passes. It does not automate visual approval. Re-running after a runtime replacement appropriately rejects historical baseline hashes.

The screenshot API returned JPEG bytes despite the archived filenames ending in .png. Bytes are preserved unchanged; pair manifests now explicitly record the actual encoding. These screenshots support perceptual inspection and are not lossless GPU pixel evidence. The readback reports are the independent direct GPU measurements.

Reproduce: `/tests/browser/embedded-color-pilot.html?culture=etiope&pilot=6c43390aa864c32555795b2be638f8e1e8d4154fa85e6991580ebb0d7fcde309-1`. Baseline SHA-256 `4bb83ba28b6150477a54074f2510441c78961a4de0c41617555448589ab075d8`; candidate SHA-256 `6596a82a37bb7095b6f076dc1d0d57184efb45e12d20de7f7fc2ef5f16d32b60`. No performance or RAM improvement is claimed.

## Saheliana and Musgum checkpoints

Native tabs 678 (Saheliana) and 679 (Musgum) each completed 24 screenshots and six readback reports, then closed. All 48 screenshots were visually inspected: no obvious added artifact was found in Saheliana's painted sun/triangle motifs, projecting beams, doors and red roof, or Musgum's ribbed surfaces, red/black motifs and damaged openings in the visible framing. The report panel masks some lower bases and props. The candidates are lossy and this is not every-texel, close-camera, collapse/repair, full-world or device acceptance.

The independent receipt verifier passed for both cultures: twelve screenshot pairs and 72 readbacks each, current runtime/candidate GLB hashes confirmed, expected damage/view/light states and camera pairs, zero GL/fixture errors and empty warning/error logs. A stale closed-tab handle in the first Musgum helper call failed before its first click; the helper was replaced with explicit current handles and the existing intact Musgum tab completed without reload. No failed attempt is counted in the reports.

Saheliana's earlier numerical gate was PSNR 33.99 dB with 442,648 bytes potential GLB saving; Musgum's was 34.27 dB and 359,056 bytes. Geometry/animation and alpha passed the independent candidate gates. Both remain outside runtime; no new distributed saving or GPU/RAM/frametime improvement is claimed.

Reproduce with `culture=saheliana&pilot=f3ae53d5ce3b57419fd31e74e2572ada9cc61392c2e7ac20dac484ec194d5e9f-1` or `culture=musgum&pilot=eddde4e46932cf9fd056315e34af03f07595cd1ce4de61b4d7d6ac7be5d873e9-1` on the same comparator. Run `node tools/verify_native_building_color_evidence.mjs saheliana` and `node tools/verify_native_building_color_evidence.mjs musgum` while their frozen baseline/candidate files are present.

The five-culture intact/damage checkpoint now contains 120 inspected screenshots and 360 readbacks. The next integration gate remains native lifecycle (collapse, ruined state, repair/reconstruction), followed by installation and independent rebuild/package verification.
