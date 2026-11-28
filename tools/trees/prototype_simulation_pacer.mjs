// Experimental pacing only. Completed steps remain authoritative in the
// simulation; this clock never manufactures or interpolates game state.
export function createSimulationPacer(session,{stepSeconds=1/60,rate=1,maxBacklogSteps=600,initialTime=0}={}){
 if(typeof session!=='string'||!session||!Number.isFinite(initialTime)||initialTime<0||!Number.isFinite(stepSeconds)||stepSeconds<=0||!Number.isFinite(rate)||rate<0||rate>16||!Number.isSafeInteger(maxBacklogSteps)||maxBacklogSteps<1)throw TypeError('Invalid pacer configuration');
 let last=null,target=0,completed=0,confirmedTime=initialTime,nextSequence=1,inflight=null,paused=false,fault=false;
 const update=now=>{if(!Number.isFinite(now)||now<0||last!==null&&now<last)throw RangeError('Clock must be monotonic');if(last!==null&&!paused){const next=target+(now-last)*rate/(stepSeconds*1000);if(!Number.isFinite(next)||next>Number.MAX_SAFE_INTEGER){fault=true;throw RangeError('Clock overflow');}target=next;}last=now;};
 const backlog=()=>Math.max(0,Math.floor(target)-completed);
 return {
  request(now){if(fault)return {accepted:false,reason:'fault'};update(now);if(paused)return {accepted:false,reason:'paused'};if(inflight)return {accepted:false,reason:'busy'};if(backlog()===0)return {accepted:false,reason:'not-due'};const sequence=nextSequence++;inflight=sequence;return {accepted:true,session,sequence,stepSeconds};},
  acknowledge(message){if(fault)return {accepted:false,reason:'fault'};if(inflight===null||message?.session!==session||message.sequence!==inflight||message.completed!==true)return {accepted:false,reason:'stale'};const expected=initialTime+(completed+1)*stepSeconds;if(!Number.isFinite(message.simulationTime)||Math.abs(message.simulationTime-expected)>1e-7){fault=true;return {accepted:false,reason:'time',expected};}inflight=null;completed++;confirmedTime=message.simulationTime;return {accepted:true,completed};},
  pause(now){if(fault)throw Error('Pacer fault');update(now);paused=true;},
  resume(now){if(fault)throw Error('Pacer fault');update(now);paused=false;},
  setRate(now,next){if(!Number.isFinite(next)||next<0||next>16)throw RangeError('Invalid simulation rate');if(fault)throw Error('Pacer fault');update(now);rate=next;},
  inspect(now){if(fault)return {fault:true};update(now);const pending=backlog();return {session,targetSteps:target,completed,confirmedTime,inflight,paused,rate,backlogSteps:pending,overloaded:pending>maxBacklogSteps,nextDelayMs:paused||rate===0||inflight?null:Math.max(0,(completed+1-target)*stepSeconds*1000/rate)};}
 };
}
