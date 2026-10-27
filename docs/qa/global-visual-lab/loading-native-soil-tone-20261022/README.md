# Loading soil tone

Selected warm daytime soil and a restrained blue night fill outside the beam. The daytime grade affects only ground outgoing light; the night fill retains texture through diffuseColor, with a modest blue rim. Original crops, shadows, camera, sky and UI are unchanged. Diffuse option only; original default remains intact.

Reproduce trial: capture-loading-soil-tone-20261022.mjs; native: capture-loading-native-soil-tone-20261022.mjs, Vite 5190. Four native captures exactly match QA. Seed 712, progress .75, day 150/night 350, landscape and portrait. Six draws / 16002 triangles. No console/GL errors; directional audit and world handoff pass. Three focused tests pass. No added texture samples or passes; small extra fragment arithmetic has not been assigned a reliable GPU delta, so no FPS claim.

Three-way images show original mockup, previous native version and selected result. Day soil is visibly warmer, night peripheral texture less crushed. Remaining differences include plant composition, original mature crop appearance, UI ornament and global sky grading still applied through QA. This is progress toward the reference, not full equivalence. Ground changes are local to loading and do not alter any biome material.
