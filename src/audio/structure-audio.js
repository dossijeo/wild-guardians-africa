export const WALL_HIT_SOUNDS=Object.freeze({zarzas:'wall_hit_thorns',empalizada:'wall_hit_wood',piedra:'wall_hit_stone',adobe:'wall_hit_adobe',reforzado:'wall_hit_reinforced_adobe'});
export const STRUCTURE_CONTACT_FAMILY='structure-contact';
export function structureHitSound(event,state){
  const target=state?.structures?.find(structure=>structure.id===event.targetId);
  return target?.kind==='wall' ? WALL_HIT_SOUNDS[target.material]??'beast_hit_structure' : 'beast_hit_structure';
}
