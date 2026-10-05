export const WALL_HIT_SOUNDS=Object.freeze({zarzas:'wall_hit_thorns',empalizada:'wall_hit_wood',piedra:'wall_hit_stone',adobe:'wall_hit_adobe',reforzado:'wall_hit_reinforced_adobe'});
export const STRUCTURE_CONTACT_FAMILY='structure-contact';
export const STRUCTURE_ALERT_SOUNDS=Object.freeze({'StructureHit:first-center-hit':'game_building_attacked','StructureHit:wall-critical':'game_wall_critical'});
export function structureAlertSound(event){
  const hit=event.structureHit;if(!hit||!(hit.previousHp>hit.hp))return null;
  if(hit.kind==='center'&&hit.firstHitThisRaid)return STRUCTURE_ALERT_SOUNDS['StructureHit:first-center-hit'];
  if(hit.kind==='wall'&&hit.previousHp>hit.criticalThreshold&&hit.hp<=hit.criticalThreshold)
    return STRUCTURE_ALERT_SOUNDS['StructureHit:wall-critical'];
  return null;
}
export function structureHitSound(event,state){
  const target=state?.structures?.find(structure=>structure.id===event.targetId);
  return target?.kind==='wall' ? WALL_HIT_SOUNDS[target.material]??'beast_hit_structure' : 'beast_hit_structure';
}
