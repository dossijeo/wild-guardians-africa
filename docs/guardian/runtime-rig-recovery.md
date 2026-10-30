# Recovery validation against shipped animal rigs

The species loop in `tests/beast-combat-physics.test.js` now loads all five GLBs directly from `ANIMAL_ACTIONS.animals[species].url`. Previously the lion selected the editable expressive candidate and the hyena was covered elsewhere by a synthetic skin. Those checks could not establish that both shipped rigs completed their recovery.

Executed on the branch after a6b8dc9a1: 31/31 combined combat and physical lifecycle tests pass. Each shipped species (hyena, lion, warthog, buffalo, rhino) enters the physical roll, uses its own retargeted authored recovery with no procedural substitution or failed roll, releases its physics entry and clears the AI lock. Existing repeated-hit checks cover airborne, rolling and recovery poses, shared collision-world reuse and eventual resource release; their detailed pose-continuity checks still use the synthetic hyena fixture and are not asserted for all production skins.

The GLTF loader retains real compressed geometry, skin and morph targets; texture references are removed solely to allow Node execution. This verifies physics/animation lifecycle with production geometry, not rendered materials, facial quality or visual acceptability of all contacts. In-game graphical coverage and remaining facial edits are still separate unfinished requirements.
