# Natural collision pocket at the unproven service pose

The new diagnostic maps exact native hostile walkability at 9,409 positions on a 6 m square, using 1/16 m spacing and the saved natural world before any proposed walls are added. It restores a fresh navigator from the saved seed, biome profile and geometry epoch, asserting byte-exact preservation of serialized state, RNG and ledger. Two independent runs reproduce the entire JSON byte-for-byte.

The nine native origin nodes are all blocked. Five fail the native terrain test; four pass terrain but fail native solid/prop collision. The service point itself is body-valid. The inspected plot shows its narrow body-valid patch between terrain-blocked and solid-blocked samples. This explains why an otherwise valid fractional attack pose has no native grid origins. The plot is a geometric diagnostic, not a rendered screenshot of gameplay.

Do not infer continuous isolation from the sampled patch: narrow unsampled routes or different positions still require positive investigation. The existing native service proof stays unchanged and the proposed defense stays rejected. The next useful question is how to establish a positive bounded physical certificate for such a natural pocket, rather than moving walls or treating an empty frontier as enclosure.

Reproduction, with fresh output paths:

```powershell
node tools/map-native-service-pocket.mjs docs/qa/integrated-spiritual-survival/canyon-service-all-targets-v2.json NEW_MAP.json
python tools/plot_native_service_pocket.py NEW_MAP.json NEW_MAP.png
```

The retained JSON records source/input/snapshot hashes and all collision samples. The PNG was opened and inspected. No runtime, campaign policy, price, damage, target reservation or perimeter acceptance rule changed.
