import {AWAKENINGS as A} from './awakening-config.js';
import {awakeningState} from './awakenings.js';
import {invalidateBlessingInfluence} from './blessing-influence.js';
import {cropSpec} from './rules.js';

export function blessingTarget(s,targetId){
  return s.plants.find(p=>p.id===targetId)??s.structures.find(p=>p.id===targetId);
}
export function eligibleBlessingTarget(target){
  return !!target&&!target.blessing&&(target.species?target.alive===true:
    target.kind==='wall'&&target.status==='intact'&&target.hp>0);
}
export function previewBlessing(s,targetId){
  const target=blessingTarget(s,targetId),valid=eligibleBlessingTarget(target);
  return {valid,targetId,kind:target?.species?'plant':target?.kind,
    reason:valid?null:target?.blessing?'Este elemento ya está bendecido.':'Elige una planta viva o una sección de muralla en pie.',
    description:target?.species?'Fuente permanente: +20 % de crecimiento y valor base de cosecha en cultivos próximos. No se cosecha ni necesita riego.':
      'Muralla permanente: recibe un 25 % menos de daño; protege un 10 % a las secciones físicamente contiguas.'};
}
// A source is lost exactly once. Other charges, progress and sources are independent.
export function loseBlessing(s,target,{removed=false}={}){
  if(!target.blessing)return null;
  const blessing=target.blessing;delete target.blessing;
  const a=awakeningState(s);a.destroyed++;
  invalidateBlessingInfluence(s);
  return {targetId:target.id,kind:target.species?'plant':target.kind,blessing,
    removed,presentation:{x:target.x,z:target.z,elapsed:s.elapsed}};
}
export function validateBlessings(s){
  const blessed=[...s.plants,...s.structures].filter(p=>p.blessing!==undefined);
  const ids=new Set();
  for(const p of blessed){
    const b=p.blessing;
    if(!b||b.version!==A.version||!Number.isSafeInteger(b.ordinal)||b.ordinal<1||ids.has(b.ordinal)||
      !Number.isSafeInteger(b.day)||b.day<1||b.day>s.day||!Number.isFinite(b.at)||b.at<0||b.at>s.elapsed||
      b.threatDay!==undefined&&(!Number.isSafeInteger(b.threatDay)||b.threatDay<1||b.threatDay>s.day)||
      !s.awakenings||b.ordinal>s.awakenings.total||
      (p.species?(!p.alive||p.harvestRequested||p.attackHitPoints!==A.plantHitPoints):
        p.kind!=='wall'||!['intact','collapsing'].includes(p.status)))throw Error('Bendición persistente inválida');
    ids.add(b.ordinal);
  }
  if(s.awakenings&&blessed.length!==s.awakenings.total-s.awakenings.destroyed)throw Error('Censo de bendiciones incoherente');
  for(const p of s.plants)if(p.blessing&&s.tasks.some(t=>t.targetId===p.id))throw Error('Una fuente mágica no puede tener tareas agrícolas');
  for(const c of s.crates)if(c.blessingBonus!==undefined){
    const q=c.blessingBonus;
    if(!q||typeof q.n!=='string'||!/^\d+$/.test(q.n)||q.d!=='1'||
      !Number.isInteger(c.blessingPercent)||c.blessingPercent<0||c.blessingPercent>A.overlapCap*100||
      BigInt(q.n)!==BigInt(Math.floor(cropSpec(c.species).base_harvest_value*c.blessingPercent/100))||
      !Array.isArray(c.blessingSourceIds)||!c.blessingSourceIds.length||new Set(c.blessingSourceIds).size!==c.blessingSourceIds.length||
      c.blessingSourceIds.some(id=>typeof id!=='string'))throw Error('Bonus de cosecha bendecida inválido');
  }
}
