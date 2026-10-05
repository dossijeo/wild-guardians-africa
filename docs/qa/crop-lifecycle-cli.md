# Recorded crop lifecycle campaigns

The lifecycle recorder accepts the biome and culture after the optional defense policy. Defaults remain Sabana / Mapungubwe and undefended, preserving existing commands. The values are checked against the game's actual `BIOMES` and `CULTURES` lists before creating the output directory. Both are included in run status as well as passed to the native world constructor.

```powershell
node tools/check_crop_lifecycle.mjs 20 olderMale NEW_DIRECTORY 8 defend sabana mapungubwe
node tools/check_crop_lifecycle.mjs 100 olderMale OTHER_DIRECTORY 8 undefended gran-canon suajili
```

Directories must be new. A completed run records source hashes, paid purchases, growth, watering, worker pickups and delivered crates. Defeat is retained as a failed result, never erased or presented as a completed campaign. `node tools/archive_crop_lifecycle.mjs SOURCE NEW_ARCHIVE` verifies and compresses terminal records before publication.

A one-night Gran Cañón / Mapungubwe smoke run passed with this CLI extension. That proves routing and recording of these options, not a 100-night campaign or balance result. Long campaign conclusions require terminal status, ledger/lifecycle audit and the recorded source revision.
