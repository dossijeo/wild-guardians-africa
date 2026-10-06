import {farmActivity} from './farm-contact-audio.js';
import {FARM_ACTIONS} from './farm-actions-data.js';

export const WORK_SOUND_IDS=Object.freeze(['farm_watering_can']);
// Follow the original visible pour window; no audio completes the task.
export function wateringActivity(worker,task){
  if(worker.status!=='acting'||worker.incapacitated||worker.fallRemaining>0||worker.gateWaiting||!task||task.id!==worker.taskId||!['initial','water'].includes(task.kind)||!(worker.actionRemaining>0))return false;
  const plan=farmActivity(worker,task),fractions=FARM_ACTIONS.sources[worker.profile]?.fractions;
  return !!(plan?.phase==='water'&&plan.progress>=fractions.pourStart*3.4&&plan.progress<fractions.pourEnd*3.4);
}
export class WorkAudio {
  constructor(play,stopVoice){this.play=play;this.stopVoice=stopVoice;this.entries=new Map();this.stateRef=null;}
  release(entry){entry.current=false;if(entry.source)this.stopVoice(entry.source);}
  update(state,{listener,tasksForFrame}={}){
    if(this.stateRef&&this.stateRef!==state)this.dispose();this.stateRef=state;
    if(state.pauses?.length||state.result){this.dispose();return;}
    let tasks;const desired=new Set();
    for(const worker of state.workers){
      // Travelling/idle/fleeing workers cannot pour. Still reach release below,
      // but do not traverse a potentially large FIFO just to discover that.
      if(worker.status!=='acting')continue;
      const task=(tasks??=tasksForFrame?.()??new Map(state.tasks.map(t=>[t.id,t]))).get(worker.taskId);if(!wateringActivity(worker,task))continue;desired.add(worker.id);
      let entry=this.entries.get(worker.id);
      if(entry?.taskId!==task.id){if(entry)this.release(entry);entry={taskId:task.id,current:true,source:null};this.entries.set(worker.id,entry);
        const isCurrent=()=>entry.current&&this.stateRef===state&&!state.pauses?.length&&!state.result&&state.workers.includes(worker)&&wateringActivity(worker,state.tasks.find(t=>t.id===entry.taskId));
        const distance=listener?Math.hypot(worker.x-listener.x,worker.z-listener.z):0;
        Promise.resolve(this.play('farm_watering_can',{bus:'world',emitter:worker.id,gain:.35/(1+(distance/24)**2),isCurrent})).then(source=>{
          if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}entry.source=source;
          const ended=source.onended;source.onended=()=>{ended?.();if(entry.source===source)entry.source=null;};
        }).catch(()=>{});
      }
    }
    for(const [id,entry] of this.entries)if(!desired.has(id)){this.release(entry);this.entries.delete(id);}
  }
  dispose(){for(const entry of this.entries.values())this.release(entry);this.entries.clear();this.stateRef=null;}
}
