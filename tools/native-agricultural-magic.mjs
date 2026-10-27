import {agriculturalPowerReport} from '../src/simulation/agricultural-power.js';
import {compare,rational,numberOf} from '../src/simulation/money.js';
import {performance} from 'node:perf_hooks';
import {castPickedSpell} from '../src/app/spell-placement.js';
import {ToolSession} from '../src/ui/tool-session.js';
import {isMature} from '../src/simulation/crops.js';
import {permission} from '../src/simulation/rules.js';

export const AGRICULTURAL_MAGIC_CADENCE=Object.freeze({intensive:1,moderate:4,scarce:25,none:Infinity});
// Scheduled native decisions, not synthetic DOM clicks or ledger multipliers.
// Cadence limits opportunities; it is never credited as occupied manual time.
export function createAgriculturalMagicPolicy({mode='moderate'}={}){
 if(!Object.hasOwn(AGRICULTURAL_MAGIC_CADENCE,mode))throw Error('Unknown agricultural magic policy');
 const session=new ToolSession(),records=[],completed=new Map(),deliveredBonuses=[];let nextAt=0,sequence=0,lastKind='growth',plantCursor=0,lastEvent=null;
 function observe(s){
  const tail=lastEvent?s.events.findIndex(e=>e.id===lastEvent):-1;
  if(lastEvent&&tail<0)throw Error('Agricultural activity observer lost event coverage');
  for(const e of s.events.slice(tail+1)){if(e.type==='AgriculturalSpellEnded')completed.set(e.spellId,e);if(e.type==='CrateDelivered'&&e.multiplyIncome)deliveredBonuses.push({id:e.id,crateId:e.targetId,income:e.multiplyIncome});}
  lastEvent=s.events.at(-1)?.id??null;
 }
 return {
  observe,
  act(s,nav,command){
   observe(s);
   if(s.elapsed<nextAt||s.time>=300||s.raid||s.pauses.length||s.result)return false;
   nextAt=s.elapsed+AGRICULTURAL_MAGIC_CADENCE[mode];
   if(mode==='none')return false;
   const started=performance.now(),occupied=new Set();
   const areas=s.spells.filter(a=>a.remaining>0&&a.targetPlantId===undefined);
   for(const a of s.spells)if(a.remaining>0&&a.targetPlantId!==undefined)occupied.add(a.targetPlantId);
   const kinds=lastKind==='growth'?['multiply','growth']:['growth','multiply'];
   const live=s.plants.filter(p=>p.alive);let chosen=null,kind=null;
   for(const k of kinds){
    if(!permission(s,k))continue;
    for(let n=0;n<live.length;n++){
     const index=(plantCursor+n)%live.length,p=live[index];
     if(occupied.has(p.id)||s.spells.some(a=>a.remaining>0&&a.targetPlantId!==undefined&&Math.hypot(a.x-p.x,a.z-p.z)<1e-6)||areas.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<=a.radius))continue;
     if(k==='multiply'?p.multiplyHarvest:isMature(p)||p.water.some(w=>w.status==='due')||p.growthPowerCommitted&&compare(p.growthPowerCommitted,rational(15))>=0)continue;
     chosen=p;kind=k;plantCursor=index+1;break;
    }
    if(chosen)break;
   }
   if(!chosen)return false;
   const selectedAt=performance.now();
   if(session.expired(s.elapsed))session.clear();
   if(session.tool?.spell!==kind)session.select({kind:'spell',spell:kind},s.elapsed);
   const selectionSeconds=(performance.now()-selectedAt)/1000;
   const applyAt=performance.now();
   const accepted=castPickedSpell(s,command?.(kind)??'agri-policy-'+sequence++,kind,{entityId:chosen.id,point:null},nav);
   const applicationSeconds=(performance.now()-applyAt)/1000;
   if(!accepted)return false;
   session.used(s.elapsed);lastKind=kind;
   const event=s.events.at(-1);
   records.push({day:s.day,time:s.time,elapsed:s.elapsed,kind,targetPlantId:chosen.id,spellId:s.spells.at(-1).id,
    selectionCpuSeconds:selectionSeconds,applicationCpuSeconds:applicationSeconds,searchCpuSeconds:(selectedAt-started)/1000,
    potentialBenefit:!!event.benefited,power:event.power,durationSeconds:event.duration,redundantMultiply:kind==='multiply'&&!event.benefited});
   return true;
  },
  report(s){
   observe(s);
   return {mode,cadenceSeconds:Number.isFinite(AGRICULTURAL_MAGIC_CADENCE[mode])?AGRICULTURAL_MAGIC_CADENCE[mode]:null,
    applications:records.length,records:[...records],dailyPower:Object.fromEntries(Object.keys(s.agriculturalPower?.days??{}).map(day=>[day,agriculturalPowerReport(s,day)])),deliveredBonuses:[...deliveredBonuses],additionalDeliveredIncome:deliveredBonuses.reduce((n,e)=>n+numberOf(e.income),0),economicallyRedundantMultiply:records.filter(r=>r.redundantMultiply).length,
    plantsBenefited:[...new Set([...records.filter(r=>r.kind==='multiply'&&r.potentialBenefit).map(r=>r.targetPlantId),
     ...[...completed.values()].filter(e=>e.growthSecondsAdded>0).map(e=>e.targetPlantId),
     ...s.spells.filter(a=>a.growthSecondsAdded>0).map(a=>a.targetPlantId)])],
    summedEffectSimSeconds:records.reduce((n,r)=>n+Math.min(r.durationSeconds,Math.max(0,s.elapsed-r.elapsed)),0),
    selectionCpuSeconds:records.reduce((n,r)=>n+r.selectionCpuSeconds,0),applicationCpuSeconds:records.reduce((n,r)=>n+r.applicationCpuSeconds,0),
    executionGrowthSecondsAdded:[...completed.values()].reduce((n,e)=>n+(e.growthSecondsAdded??0),0)+s.spells.reduce((n,a)=>n+(a.growthSecondsAdded??0),0),
    humanManualActivitySeconds:null,selectedModeActivityCreditSeconds:0,effectDurationActivityCreditSeconds:0};
  }
 };
}
