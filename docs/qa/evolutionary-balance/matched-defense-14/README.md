# Matched defense diagnostic: Manglares/123, 14 nights

Three native Wild Engine campaigns used exactly the same frozen virtual-player genes, agricultural spells, labour/cash rules, seed, biome, and unchanged production balance. The only experimental switches were `buildRepairWalls` and `useShield`, documented in `results/config.json` (source `7fd6c1bcb0c725da7b8449bbb2514859eb5a92f1`, gene schema `virtual-player-v2-wall-policy`). This is a **development seed already explored in earlier pilots**, not untouched validation.

| Arm | Nights | Live day 14 | Crops destroyed | Income | Seeds | Wages | Walls | Repairs | Operating net¹ | Final cash | Shield contacts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Walls + Shield | 14/14 | 167 | 5 | 18,234 | 8,460 | 8,084 | 900 | 585 | +205 | 905 | 109 |
| No walls + Shield | 14/14 | 19 | 397 | 16,431 | 8,865 | 7,541 | 0 | 150 | −125 | 575 | 48 |
| No walls, no Shield | 14/14 | 6 | 479 | 16,296 | 9,064 | 7,420 | 0 | 59 | −247 | 453 | 0 |

¹ Income minus listed seeds, wages, walls, and repairs. The initial 1,500 and the paid 800-coin centre reconcile this net to final cash in each arm. All 42 daily ledger reconciliations pass. None of the three had a technical error, native defeat, or cost stop. Each performed 783 Multiplicar and 0 Crecimiento applications, so the comparison holds agricultural-magic *actions* equal; realised Multiply income differs as the farms diverge. The report records intercepted Shield contacts, **not the count of Shield activations**, so activations cannot be reconstructed exactly from these outputs.

The no-wall arms initially save wall costs but lose crops rapidly from night 6; the walled arm pays 1,485 for walls and repairs and still ends with more plants and cash. This is evidence of a material defensive advantage on this paired seed. It does not prove that every wall configuration or biome is advantageous. Attraction, animal composition, worker count, and crop value diverge after the first decisions; losses are physical outcomes, not a forced quota. No-wall dominance remains a valid result in any future seed and will not be penalized in fitness.

The fully reproducible compressed reports are in `results/`, along with daily progress and a stamped configuration. Enclosure certification was not used here; wall hits and spending alone do not certify closure. A fresh biome/seed cohort is required before generalising the finding.

| Compressed report | SHA-256 |
| --- | --- |
| `matched-walls-current-magic-manglares-123-14.json.gz` | `fb9c98b5faa65cc7e160c5ac28718ab5b59e5c98931cb44aa9d14a9b8a5305f4` |
| `matched-no-walls-current-magic-manglares-123-14.json.gz` | `052856e6f0df4e23a7110d3d9a0d090a0d9483a073f26c385d53b1e2568ec1f4` |
| `matched-no-defense-current-magic-manglares-123-14.json.gz` | `6a3279d15ae079626eea8eed52478acc3309ff6b28584f67af3752ff6ce18776` |
