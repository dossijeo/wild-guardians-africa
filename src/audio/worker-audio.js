export const WORKER_SOUND_IDS=Object.freeze(['npc_work_effort','npc_danger_react','npc_flee_shout','npc_acknowledge']);
export const WORKER_VOICE_POLICY=Object.freeze({routineGap:2,reactionGap:1,effortDelay:.7,effortInterval:12,fleeDelay:1.5,maxDistance:36});
const eligible=w=>!w.incapacitated&&!(w.fallRemaining>0)&&w.status!=='home';

// Read-only reactions to native assignment, work and flight. Cadence uses the
// simulated clock; pending decode expires on the real AudioContext clock.
export class WorkerAudio {
  constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.entries=new Map();this.stateRef=null;this.elapsed=null;this.nextRoutine=0;this.nextReaction=0;}
  release(entry){entry.ticket++;if(entry.voice)this.stopVoice(entry.voice);entry.voice=null;entry.validActor=null;}
  cue(id,worker,entry,state,task,listener){
    const reaction=id==='npc_danger_react'||id==='npc_flee_shout',cadence=reaction?'nextReaction':'nextRoutine';
    const distance=listener?Math.hypot(worker.x-listener.x,worker.z-listener.z):0;
    if(!Number.isFinite(distance)||distance>WORKER_VOICE_POLICY.maxDistance||state.elapsed<this[cadence])return;
    this[cadence]=state.elapsed+(reaction?WORKER_VOICE_POLICY.reactionGap:WORKER_VOICE_POLICY.routineGap);
    this.release(entry);const ticket=entry.ticket,requested=this.clock(),raid=state.raid;
    const validActor=()=>eligible(worker)&&(reaction?state.raid===raid&&!!raid&&worker.status==='fleeing'&&(id!=='npc_flee_shout'||!worker.gateWaiting):worker.taskId===task?.id&&state.tasks.includes(task)&&task.workerId===worker.id&&(id==='npc_work_effort'?worker.status==='acting'&&worker.actionRemaining>0:['walking','acting'].includes(worker.status)));
    const isCurrent=()=>this.entries.get(worker.id)===entry&&entry.ticket===ticket&&this.stateRef===state&&!state.result&&!state.pauses?.length&&state.workers.includes(worker)&&validActor()&&this.clock()-requested<=.25;
    entry.validActor=validActor;let pending;try{pending=this.play(id,{bus:'world',family:'worker-voice',emitter:worker.id,gain:(reaction?.45:.25)/(1+(distance/24)**2),isCurrent});}catch{return;}
    Promise.resolve(pending).then(source=>{if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}entry.voice=source;entry.validActor=validActor;const ended=source.onended;source.onended=()=>{ended?.();if(entry.voice===source){entry.voice=null;entry.validActor=null;}};}).catch(()=>{});
  }
  update(state,{listener}={}){
    if(this.stateRef&&this.stateRef!==state||this.elapsed!==null&&state.elapsed<this.elapsed)this.dispose();
    if(state.pauses?.length||state.result){this.dispose();return;}
    const dt=this.elapsed===null?0:state.elapsed-this.elapsed,continuous=dt>0&&dt<=.25,seen=new Set();this.stateRef=state;
    // Do not build a task index unless a worker currently owns a task.
    const tasks=state.workers.some(w=>eligible(w)&&w.taskId)?new Map(state.tasks.map(t=>[t.id,t])):null;
    for(const worker of state.workers){
      if(!eligible(worker))continue;seen.add(worker.id);
      const previous=this.entries.get(worker.id),entry=previous??{ticket:0,voice:null,effortDone:true,fleeDone:true,nextEffort:0};this.entries.set(worker.id,entry);
      const task=tasks?.get(worker.taskId),ownsTask=task&&task.workerId===worker.id,newTask=ownsTask&&entry.taskId!==task.id,acting=ownsTask&&worker.status==='acting'&&worker.actionRemaining>0;
      const flight=worker.status==='fleeing'&&!!state.raid;
      if(!continuous){
        if(dt!==0||!previous)this.release(entry);
        if(dt!==0||!previous){entry.effortDone=true;entry.fleeDone=true;}
      }else{
        if(entry.validActor&&!entry.validActor())this.release(entry);
        if(flight&&(entry.status!=='fleeing'||entry.raid!==state.raid)){
          this.release(entry);entry.fleeAt=state.elapsed+WORKER_VOICE_POLICY.fleeDelay;entry.fleeDone=false;
          this.cue('npc_danger_react',worker,entry,state,null,listener);
        }else if(flight&&!entry.fleeDone&&state.elapsed>=entry.fleeAt){
          entry.fleeDone=true;
          if(!worker.gateWaiting&&Math.hypot(worker.x-entry.x,worker.z-entry.z)>.001)this.cue('npc_flee_shout',worker,entry,state,null,listener);
        }else if(!state.raid&&newTask&&['walking','acting'].includes(worker.status))this.cue('npc_acknowledge',worker,entry,state,task,listener);
        if(acting&&(newTask||entry.status!=='acting')){entry.effortAt=state.elapsed+WORKER_VOICE_POLICY.effortDelay;entry.effortDone=false;}
        if(acting&&!entry.effortDone&&state.elapsed>=entry.effortAt){
          entry.effortDone=true;
          if(!state.raid&&!worker.gateWaiting&&state.elapsed>=entry.nextEffort){entry.nextEffort=state.elapsed+WORKER_VOICE_POLICY.effortInterval;this.cue('npc_work_effort',worker,entry,state,task,listener);}
        }
      }
      Object.assign(entry,{status:worker.status,taskId:ownsTask?task.id:null,raid:state.raid,x:worker.x,z:worker.z});
    }
    for(const [id,entry] of this.entries)if(!seen.has(id)){this.release(entry);this.entries.delete(id);}
    this.elapsed=state.elapsed;
  }
  dispose(){for(const entry of this.entries.values())this.release(entry);this.entries.clear();this.stateRef=null;this.elapsed=null;this.nextRoutine=0;this.nextReaction=0;}
}
