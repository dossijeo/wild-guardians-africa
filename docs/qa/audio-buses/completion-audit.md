# Audio completion audit beyond the acceptance counter

Current authoritative routing inventory (`public/content/sfx-routing.json`) has 126 entries: 20 connected to logical event dispatch and 106 reserved/catalog-only. Several reservations explicitly say their dedicated gameplay emitter is not connected yet. This proves traceability for QA-152, not completion of every compatible gameplay use described in Plan19.2-19.4 and AppendixA.

Examples requiring further work/evidence include native movement clips (`step_dry_soil`, `step_grass`, `step_mud`, `step_sand`, `step_stone`, `step_wood`, `run_surface_set`) and compatible environment loops (`amb_wind_soft`, `amb_insects`, `amb_birds`, `amb_night`, `amb_river`, `amb_coast_mangrove`). A category-to-trigger audit must distinguish actual compatible uses, intentional variants and justified scope exceptions. Do not add rain or animal death merely to increase a connected count.

The new gain buses and per-emitter admission are foundations. Remaining scope includes integrated mixed-scene measurements, suitable actor/ambient triggers, interruption/lifecycle behavior for any added continuous sources, correct distance treatment, actual listening evidence and music A/B campaign alternation. Existing muted node checks and music transport tests are technical evidence; they are not a perceptual sign-off. A verified acceptance counter is insufficient to mark the complete project goal achieved.

The local production regression suite for59063b7 passes1225/1225 and the build passes. QA-155/156 remain partial. Current directed native tab207 was started and remains present, but its completion is not readable because the browser control channel is timing out. Preserve the live run and revalidate the same tab before any restart.
