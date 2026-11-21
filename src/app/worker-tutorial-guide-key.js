import {isMature} from '../simulation/crops.js';
import {compare,rational} from '../simulation/money.js';

// Changes only when a discrete tutorial/placement input changes. Continuous
// crop growth is tracked separately when the authority actually sampled a
// crop height while planning the origin.
export function workerTutorialGuideKey(state,{toolKind=null,toolSpell=null,screenExclusions=[]}={}){
 if(!state||!state.tutorial||!Array.isArray(state.plants))throw TypeError('Invalid tutorial guide state');
 const t=state.tutorial,previous=toolSpell==='multiply'?state.events?.findLast(e=>e.type==='SpellActivated'&&e.kind==='growth'&&e.benefited)?.targetPlantId??null:null;
 return JSON.stringify({toolKind,toolSpell,screenExclusions,day:state.day,peaceful:state.time<300,result:!!state.result,raid:state.raid??null,pauses:state.pauses,tutorial:[t.step,t.reading,t.basicSkipped,t.guideAfterAuto,t.dismissed],culture:state.culture,villages:state.villages,structures:state.structures,suppressed:state.suppressed,ledger:state.ledger,postgame:state.postgame,cooldowns:Object.fromEntries(Object.entries(state.cooldowns??{}).map(([name,value])=>[name,value>0])),previous,
  plants:state.plants.map(p=>[p.id,p.species,p.x,p.z,p.alive,!!p.blessing,!!p.multiplyHarvest,!!p.growthPowerCommitted&&compare(p.growthPowerCommitted,rational(15))>=0,p.alive?isMature(p):false,!!p.water?.some(w=>w.status==='due')]),
  spells:(state.spells??[]).filter(s=>s.remaining>0).map(s=>[s.kind,s.x,s.z,s.radius,s.targetPlantId??null]),
  workers:(state.workers??[]).map(w=>[w.id,w.status,w.x,w.z])});
}

// The authority records exact values used by the planner's crop-height lookup.
// A missing or changed plant invalidates the prepared origin conservatively.
export function tutorialGuideCropHeightsCurrent(state,inputs){
 if(!Array.isArray(inputs)||!Array.isArray(state?.plants))return false;
 const plants=new Map(state.plants.map(p=>[p.id,p]));
 return inputs.every(input=>{const plant=plants.get(input?.id);return !!plant?.alive&&plant.species===input.species&&plant.growth===input.growth;});
}
