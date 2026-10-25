# Gran Río: exposed soil riverbank

The opt-in `visualLab=global-lighting&riverSoil=1&riverBank=soil` raises only the visual wear channel beside the river, using deterministic world-space variation. It reuses the existing soil material and makes existing grass recede. No authoritative terrain, navigation or simulation data changes. The original mask is copied, not mutated. Defaults remain unchanged.

Day/night screenshots compare worldbank and landbank at three identical poses. Native integration matches the QA prototype exactly in all six RGB comparisons (`../river-land-bank-native-parity-20261022/audit.json`). Water edges in these captures still use the QA worldbank implementation; this is not a claim that all shoreline work is integrated.

## Cost

Intel UHD, 1280x720, medium, ABAB, 60 warmup and 90 GPU samples per phase: 720 valid queries. GPU medians in ms, original bank to soil bank: day 16.801→16.028 and 18.337→16.011; night 17.213→18.313 and 16.932→16.440. CPU submission: day 4.478→4.633 and 4.484→4.590; night 4.516→4.472 and 4.547→4.614. No consistent FPS improvement is established. Grass triangles decrease because bare banks intentionally reduce coverage: this is an artistic comparison, not an equivalent-work optimization. Draw calls remain equal. Timing excludes mask construction and chunk streaming.

## Validation and limitations

Five unit tests pass (mask immutability, channel preservation, overlapping chunk samples, opt-in and existing soil gates). Short native streaming follows the channel 0/96/192/96/0 units by day and night without rendering errors. Night return is RGB exact and resident resources return to 120 geometries/68 textures. Day return differs, including a render-origin shift and changed resident resources; its cause is not isolated. This does not prove long-term leak freedom or daytime return parity.

Reproduce with `node tools/experiments/capture-river-land-bank-20261022.mjs`, `node tools/experiments/measure-river-land-bank-cost-20261022.mjs`, `python tools/experiments/audit-river-land-bank-cost-20261022.py`, and the native-parity/native-stream capture scripts. Vite must serve port 5190. Keep the soil bank for artistic review; retain the approved moss shore direction for humid biomes. Water color per biome is the next separate comparison.
