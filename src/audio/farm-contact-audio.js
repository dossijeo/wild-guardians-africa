import {FARM_ACTIONS} from './farm-actions-data.js';
import {PROFILES} from '../simulation/workforce.js';
import {isMature} from '../simulation/crops.js';
export const FARM_CONTACT_IDS=Object.freeze(['farm_sow','farm_seeds_drop','farm_water_soil','farm_harvest_pick','farm_plant_pull','farm_crate_move']);
export function farmActivity(worker,task,target){
 if(worker.status!=='acting'||worker.incapacitated||worker.fallRemaining>0||worker.gateWaiting||!task||worker.taskId!==task.id||!(worker.actionRemaining>0))return null;
 const fractions=FARM_ACTIONS.sources[worker.profile]?.fractions;if(!fractions)return null;
 const speed=PROFILES.find(p=>p.id===worker.profile).speed,remaining=worker.actionRemaining*speed;
 let phase=task.kind,progress,duration,markers;
 if(phase==='initial'){const total=7.2-remaining;phase=total<3.8?'plant':'water';progress=phase==='plant'?total:total-3.8;}
 else progress=({water:3.4,harvest:3.6,crate:1}[phase]??0)-remaining;
 if(['plant','water'].includes(phase)&&target?.alive===false)return null;
 if(phase==='plant'){duration=3.8;markers=[{id:'farm_sow',at:fractions.sowStart*duration,gain:.35},{id:'farm_seeds_drop',at:fractions.seedDrop*duration,gain:.12}];}
 else if(phase==='water'){duration=3.4;markers=[{id:'farm_water_soil',at:fractions.pourStart*duration,until:fractions.pourEnd*duration,gain:.16}];}
 else if(phase==='harvest'&&target?.harvestRequested&&isMature(target)){duration=3.6;markers=[{id:['batata','yuca'].includes(target.species)?'farm_plant_pull':'farm_harvest_pick',at:fractions.harvestContact*duration,gain:.35}];}
 else if(phase==='crate'&&target&&!target.delivered&&!target.carrierId){duration=1;markers=[{id:'farm_crate_move',at:fractions.harvestContact,gain:.25}];}
 else return null;
 return {phase,progress:Math.max(0,progress),duration,markers};
}
const carryTail=(worker,entry,state)=>entry.phase==='crate'&&worker.status==='carrying'&&!worker.incapacitated&&!worker.fallRemaining&&!worker.gateWaiting&&worker.crateId===entry.targetId&&state.crates?.some(c=>c.id===entry.targetId&&!c.delivered&&c.carrierId===worker.id);
export class FarmContactAudio {
 constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.entries=new Map();this.stateRef=null;this.elapsed=null;}
 targetsFor(state){
  const plants=state.plants??[],crates=state.crates??[];
  if(this.targetPlants!==plants||this.targetCrates!==crates||this.plantCount!==plants.length||this.crateCount!==crates.length){this.targets=new Map([...plants,...crates].map(t=>[t.id,t]));this.targetPlants=plants;this.targetCrates=crates;this.plantCount=plants.length;this.crateCount=crates.length;}
  return this.targets;
 }
 release(entry){entry.current=false;for(const source of entry.voices)this.stopVoice(source);entry.voices.clear();}
 update(state,{listener,tasksForFrame}={}){
  if(this.stateRef&&this.stateRef!==state||this.elapsed!==null&&state.elapsed<this.elapsed)this.dispose();
  if(state.pauses?.length||state.result){this.dispose();return;}
  const dt=this.elapsed===null?0:state.elapsed-this.elapsed,continuous=dt>0&&dt<=.25,seen=new Set();let tasks;this.stateRef=state;
  for(const worker of state.workers){
   // Carry tails and cancellation remain observable without indexing the FIFO.
   const task=worker.status==='acting'?(tasks??=tasksForFrame?.()??new Map(state.tasks.map(t=>[t.id,t]))).get(worker.taskId):undefined,candidate=task&&['initial','water','harvest','crate'].includes(task.kind),target=candidate?this.targetsFor(state).get(task.targetId):undefined,plan=target?farmActivity(worker,task,target):null,previous=this.entries.get(worker.id);
   if(!plan){if(previous&&carryTail(worker,previous,state)&&(continuous||dt===0)){seen.add(worker.id);continue;}continue;}
   seen.add(worker.id);const same=previous&&previous.taskId===task.id&&previous.phase===plan.phase&&plan.progress>=previous.progress;
   if(previous&&(!same||dt>.25))this.release(previous);
   const entry=same&&dt<=.25?previous:{current:true,voices:new Set(),taskId:task.id,targetId:task.targetId,phase:plan.phase,progress:plan.progress};this.entries.set(worker.id,entry);
   if(same&&continuous)for(const marker of plan.markers)if(previous.progress<marker.at&&plan.progress>=marker.at){
    const requested=this.clock(),isCurrent=()=>{
     if(!entry.current||this.entries.get(worker.id)!==entry||this.stateRef!==state||state.pauses?.length||state.result||!state.workers.includes(worker)||this.clock()-requested>.25)return false;
     const liveTask=state.tasks.find(t=>t.id===entry.taskId),liveTarget=this.targetsFor(state).get(entry.targetId),live=liveTarget?farmActivity(worker,liveTask,liveTarget):null;
     return live?.phase===entry.phase&&live.progress>=marker.at&&live.progress<(marker.until??live.duration)||carryTail(worker,entry,state);
    },distance=listener?Math.hypot(worker.x-listener.x,worker.z-listener.z):0;
    let pending;try{pending=this.play(marker.id,{bus:'world',emitter:worker.id,family:plan.phase==='plant'?'farm-plant-contact':plan.phase==='harvest'?'farm-harvest-contact':marker.id,gain:marker.gain/(1+(distance/24)**2),isCurrent});}catch{continue;}
    Promise.resolve(pending).then(source=>{if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}entry.voices.add(source);const ended=source.onended;source.onended=()=>{ended?.();entry.voices.delete(source);};}).catch(()=>{});
   }
   // Water contact tails stop when the authored pour ends, before task completion.
   if(plan.phase==='water'&&plan.progress>=plan.markers[0].until)this.release(entry);
   entry.progress=plan.progress;
  }
  for(const [id,entry] of this.entries)if(!seen.has(id)){this.release(entry);this.entries.delete(id);}
  this.elapsed=state.elapsed;
 }
 dispose(){for(const entry of this.entries.values())this.release(entry);this.entries.clear();this.stateRef=null;this.elapsed=null;this.targets=null;this.targetPlants=null;this.targetCrates=null;this.plantCount=null;this.crateCount=null;}
}
