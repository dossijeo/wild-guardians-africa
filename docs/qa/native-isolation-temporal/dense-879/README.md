# Native animated traveling isolation — dense 879

Source `6b22698e`; one native browser context, authored Execute, Gran Río/Suajili archived dense fixture. This follows the explicit negative pose witness in dense-878 rather than discarding it. No production option was enabled.

The native renderer samples actor poses from fixed simulation time, overwriting a prior mixer.update. This QA fixture now samples each currently authored clip on an independent presentation clock after the native pose update. It repeats clips for this diagnostic; it does not reproduce task completion, live walking, attacks or simulation advancement. All 952 bones are observed; measured maximum pose-component delta is 0.04345887156909964, with different final pose. Mixer clock deltas remain zero because fixed-pose sampling uses update(0); the bone witness, not mixer clocks, proves animated presentation.

Across the requested 120-unit route, 21 synchronous samples preserve the framebuffer exactly during zero-pixel isolated uploads, including restoration of visibility/culling/shadow scheduling and borrowed shadow resources. Chunks created increase 25 to 35, with no failures/fallbacks/pending work. All 34 actors were ready; 1,257 living plants and serialized logical state remain unchanged. World disposal/context loss, empty browser logs and closed tab/empty inventory were verified.

Subsequent normal renders have tiny differences (maximum 68 channels); ordinary-render controls also differ (maximum 116). These measurements neither prove perfect temporal image equivalence nor identify an isolation-induced defect. Explicit camera poses and all raw differences are retained. No GPU timing or RAM/VRAM measurements were taken. Readbacks and extra draws invalidate frametime comparisons. Remaining biome/mobile/motion/attack and paired performance gates remain open.

The report is retained losslessly in report.json.gz, including its embedded screenshots. Source copies and exported captures are hashed in receipt.json. No assets were promoted or user saves changed.
