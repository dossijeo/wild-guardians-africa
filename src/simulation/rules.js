import {HIRING_RESERVE} from './budget.js';
import {BALANCE as B} from './balance.js';
import {wallVisualAt,recordWallPresentation} from './structure-presentation.js';
export const cropSpec = id => { const c=B.crops.find(c=>c.id===id); if(!c)throw new Error('Cultivo desconocido'); return c; };
export const animalSpec = id => { const c=B.animals.find(c=>c.id===id); if(!c)throw new Error('Animal desconocido'); return c; };
export const wallSpec = id => { const c=B.walls.find(c=>c.id===id); if(!c)throw new Error('Material desconocido'); return c; };
export function villageCost(ordinal) {
  if(!Number.isSafeInteger(ordinal)||ordinal<2) throw new Error('Ordinal de poblado inválido');
  return 50000+25000*(ordinal-2);
}
export const operational = c => c.kind==='center' && c.status==='intact';
export const spellUnlocked=(state,kind)=>kind==='shield'?state.day>=1&&state.time>=300||state.day>1:kind==='growth'?state.day>=3:kind==='multiply'?state.day>=5:false;
export function permission(state,action) {
  if(state.result || state.pauses.some(reason=>reason!=='tutorial-action')) return false;
  const hasCenter=state.structures.some(operational);
  const peaceful=state.time<300 && !state.raid;
  if(action==='camera')return true;
  if(!hasCenter) return action==='center' && peaceful;
  if(action==='shield')return true;
  if(!peaceful)return false;
  if(action==='multiply')return state.workers.some(w=>!w.incapacitated && w.status!=='home');
  if(action==='village')return state.postgame;
  return true;
}
export function attraction(plants) { return plants.filter(p=>p.alive).reduce((sum,p)=>sum+cropSpec(p.species).base_harvest_value,0); }
export function threatTier(value) { return B.threat_tiers.find(t=>value>=t.attraction_min&&(t.attraction_max_exclusive===null||value<t.attraction_max_exclusive))??null; }
export function compositions(budget,unlocked) {
  const species=B.animals.filter(a=>unlocked.includes(a.id));
  const result=[];
  function visit(i,cost,count,group) {
    if(i===species.length) {
      if(count && count<=5 && cost>=Math.ceil(.75*budget)&&cost<=budget)result.push([...group]);
      return;
    }
    const a=species[i];
    for(let n=0;n<=a.max_per_raid && count+n<=5 && cost+n*a.threat_cost<=budget;n++) {
      visit(i+1,cost+n*a.threat_cost,count+n,[...group,...Array(n).fill(a.id)]);
    }
  }
  visit(0,0,0,[]);return result;
}
export function dawnMinimum(state) {
  const center=state.structures.some(operational);
  const resources=state.plants.some(p=>p.alive)||state.crates.some(c=>!c.delivered);
  return (center?0:800)+HIRING_RESERVE+(resources?0:Math.min(...B.crops.map(c=>c.plant_cost)));
}
export function structureHealth(kind,material,gate=false) { return kind==='center'?600:gate?wallSpec(material).gate_hp:wallSpec(material).hp; }
export function collapseThreshold(s) { return s.kind==='center'?s.maxHp*.21:s.maxHp*.2; }
export function hitStructure(s,damage,elapsed) {
  if(s.status!=='intact')return false;
  const visual=s.kind==='wall'&&Number.isFinite(elapsed)?wallVisualAt(s,elapsed):null;
  s.hp=Math.max(0,s.hp-damage);
  if(s.hp<=collapseThreshold(s)+1e-9) {
    s.status='collapsing'; s.collapseRemaining=s.kind==='center'?3.2:1.4;
  }
  if(visual!==null)recordWallPresentation(s,visual,elapsed);
  return true;
}
export function nextRandom(state) {
  // State is persisted; no reroll on loading a snapshot.
  let x=state.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;
  return state.rng/4294967296;
}
export const randomInt=(state,a,b)=>a+Math.floor(nextRandom(state)*(b-a+1));

