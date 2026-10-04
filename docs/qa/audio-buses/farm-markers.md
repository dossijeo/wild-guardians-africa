# Authoritative farm action timing

Historical calibration preparation at revision922de82. These markers are now consumed by production audio; current integration and its verification are documented in farm.md. The following records the original calibration evidence and gaps identified before that integration. tools/calibrate_farm_actions.mjs reads all four original worker lab scripts, validates their recorded SHA256 and each original GLB SHA256, and derives the gesture/effect gates. The reproducible data lives in content/manifests/farm-actions.json and src/audio/farm-actions-data.js. No source script, model or animation is modified, and no geometry scan is added to a gameplay frame.

| Native phase | Authored gate | Native clip seconds |
| --- | --- | --- |
| Plant sowing gesture starts | p=.28 | 1.064 |
| Plant seed drops start | p=.32 | 1.216 |
| Harvest produce becomes held | p=.44 | 1.584 |
| Water drops start | tilt f>.45 | 0.573435 |
| Water drops end | tilt f falls to .45 | 2.980700 |

The water tilt is smoothstep(.08,.27,p)*(1-smoothstep(.77,.97,p)). Inverting the actual .45 visibility threshold derives the two water boundaries; no arbitrary frame percentage is substituted. The data records native clip time. Runtime task progress must apply the existing worker speed and canonical Plant/Water/Harvest logical durations, especially the younger1.5 speed. Initial Water follows the existing3.8-second Plant phase; no extra work duration is added.

All four original rigs are loaded with their geometry/skins/actions intact (texture decoding omitted in Node). At the sowing/seed markers, Plant is the actual selected pose and both hoe/watering props are hidden. At the derived Water boundary the original can is visible and the hoe remains hidden. Six tests pass (1129.8483ms), including exact source regeneration, native pose/prop checks and both sides of the water threshold. This is native source/rig evidence, not rendered-world/audio listening evidence.

The existing purchase-time farm_seeds_drop and completion-time farm_harvest_pick dispatch are therefore insufficient evidence of physical action synchronization. Pending implementation must bind sow/seed/pick to observed marker crossings, suppress restored/missed history and cancel interrupted sources. The current watering activity begins at Water phase start, before the authored drops appear, and lasts beyond the authored pour window; its phase gate also needs alignment. Crate creation/handling needs its existing logical or native phase boundary, with no second harvest payment. These are outstanding changes, not completed by calibration alone.

farm_hoe_dig remains explicitly reserved because the approved initial care has hands/Water, with the hoe hidden. Its reservation now states that concrete evidence instead of the generic unconnected-emitter text. No native Dig segment is inserted merely to play a clip. Other compatible farming uses remain required.
