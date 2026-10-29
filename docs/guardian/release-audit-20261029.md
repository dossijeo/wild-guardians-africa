# Release audit after Guardian ritual / 2026-10-29

The previous turn advanced the implementation and produced real-engine video evidence. This audit does not mark phase 2 complete.

The model catalogue retained four facialEdit.editable paths pointing to repository Blender sources (buffalo, warthog, lion, rhino). Release-only transformation now prefixes them with repository:, matching the existing hyena provenance convention. Runtime GLB routes and original authoring metadata remain intact. Five package unit tests pass, including all four source references and their runtime GLB mappings.

Excluded from release only: grass-arched, grass-broad, grass-cushion, grass-dense, grass-island, grass-mixed GLB experiments; mangrove-leaf-cover-20261021, mangrove-leaf-folded-20261022, mangrove-leaf-varied-20261021 directories. Source files remain available. Inspected consumers: these files are used in tools/experiments; production continuous-grass uses continuous-grass/modules.json, mangrove-leaf-fill-20261021 or mangrove-leaf-cupped-20261022. The varied distribution option changes placement/shading and does not load the excluded varied prototype.

Fresh production build passes. check_web_package.mjs passes its resource-link assertions, excluded-resource checks and <=1000-file gate, but fails the <=500,000,000-byte gate. Current release: 998 files, 580,905,909 bytes. Do not report the complete package check as passing. check_spirit_voice_package.mjs verifies all 62 original audio hashes and packed cue sequences.

Remaining: investigate size reduction without removing gameplay resources or degrading approved art; full phase-2 graphical/performance acceptance and the previously requested continuous voiced tutorial video remain unproven. This audit does not attribute the size overrun to any particular feature without a comparable baseline.
