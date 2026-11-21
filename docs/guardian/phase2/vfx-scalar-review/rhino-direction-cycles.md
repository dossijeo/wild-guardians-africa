# Directional rhinoceros recovery trials

Recorded side and elevated forced-origin Attack cycles in WorldScene/Game.tick. During review, found the QA direction override placed the approximate contact on the far side of the animal relative to its source. Corrected the sign so the contact is on the incoming side, then repeated both recordings. Only these repeats are committed. Production raycast contacts are unchanged; these approximate fixture contacts do not validate mesh-surface picking.

Both final reports show zero remaining down states, no errors, and completion of the simulation interval. Inspected one-second contact sheets: the lateral fall has a different orientation from the elevated fall; both roll/recover and resume walking. Videos are silent. The forced elevated origin puts the Guardian outside this animal-focused camera view, so the high recording is reaction evidence only, not summon-position or framing acceptance. The normal placement algorithm is deliberately overridden by these direction controls.

The samples do not prove every-frame anatomical clearance or every collision case. They expand directional runtime coverage without closing the full graphical matrix.
