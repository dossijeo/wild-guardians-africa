// Paired diagnostics: every arm uses the same evolved economy and agriculture.
// Only native wall commands and raid shield use differ.
export const MATCHED_DEFENSE_CONTROLS=Object.freeze({
 'matched-walls-current-magic':Object.freeze({buildRepairWalls:true,useShield:true}),
 'matched-no-walls-current-magic':Object.freeze({buildRepairWalls:false,useShield:true}),
 'matched-no-defense-current-magic':Object.freeze({buildRepairWalls:false,useShield:false}),
});

export function matchedDefenseControl(name,genes){
 const control=MATCHED_DEFENSE_CONTROLS[name];
 if(control&&!genes)throw Error('Matched defense controls require frozen evolutionary genes');
 return control??null;
}
