import {permission,spellUnlocked} from '../simulation/rules.js';
import {isMature} from '../simulation/crops.js';

export const REPEATABLE_MAGIC_IDS=new Set(['reminder.shield','reminder.growth','reminder.multiply']);
const ready=(s,kind)=>spellUnlocked(s,kind)&&(kind!=='shield'||s.cooldowns[kind]===0)&&permission(s.pauses.length?{...s,pauses:[]}:s,kind);
const farmBounds=new WeakMap();
export function shieldReminderKey(s){
 if(!s.raid?.id||!ready(s,'shield'))return null;
 let bounds=farmBounds.get(s.raid);
 if(!bounds){
  bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};
  for(const p of [...s.plants.filter(p=>p.alive),...s.structures.filter(p=>p.status==='intact')]){
   bounds.minX=Math.min(bounds.minX,p.x-12);bounds.minZ=Math.min(bounds.minZ,p.z-12);
   bounds.maxX=Math.max(bounds.maxX,p.x+12);bounds.maxZ=Math.max(bounds.maxZ,p.z+12);
  }
  farmBounds.set(s.raid,bounds);
 }
 return s.raid.animals.some(a=>['walking','attacking'].includes(a.status)&&a.x>=bounds.minX&&a.x<=bounds.maxX&&a.z>=bounds.minZ&&a.z<=bounds.maxZ)?s.raid.id:null;
}
export function usefulPeacefulMagic(s){
 if(s.raid||s.time>=300||s.result)return [];
 const kinds=[];
 // Stop as soon as one useful plant is found. Check at most once per two
 // simulated seconds; wind and render frames do not invalidate this result.
 const free=p=>!s.spells.some(a=>a.remaining>0&&(a.targetPlantId!==undefined?a.targetPlantId===p.id:Math.hypot(p.x-a.x,p.z-a.z)<=a.radius));
 if(ready(s,'growth')&&s.plants.some(p=>p.alive&&!isMature(p)&&p.water.every(w=>w.status!=='due')&&free(p)))kinds.push('growth');
 if(ready(s,'multiply')&&s.plants.some(p=>p.alive&&!p.multiplyHarvest&&free(p)))kinds.push('multiply');
 return kinds;
}
export function recordMagicReminder(s,id){
 const kind=id.split('.')[1];
 if(!['shield','growth','multiply'].includes(kind))return;
 const memo=s.tutorial.magicReminders??={};
 if(kind==='shield'){const key=shieldReminderKey(s);if(key)memo.shieldRaid=key;}
 else {memo[kind+'At']=s.elapsed;memo.lastAt=s.elapsed;}
}
