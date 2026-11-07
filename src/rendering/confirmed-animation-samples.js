// The existing GPU bake supports walking only. Do not substitute it for
// attacks, idle, running, falling, recovery or changing task state.
export function confirmedWalkingSamples(preview,actorId,kind,entity){
 const ticks=preview?.trace?.actorTickStates;if(!ticks?.complete||!Array.isArray(ticks.actors)||!['animal','worker'].includes(kind))return null;
 const matches=ticks.actors.filter(value=>value.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;
 const samples=matches[0].samples,phaseKey=kind==='animal'?'motionPhase':'walkPhase',allowed=kind==='animal'?['walking']:['walking','arriving','returning'];
 const first=samples[0],idleWalk=kind==='worker'&&['idle','waiting'].includes(first?.status)&&first.idleMode==='walk'&&entity?.idleState?.mode==='walk';
 if(samples.length<2||first.at!==preview.start||samples.at(-1).at!==preview.end||!allowed.includes(first.status)&&!idleWalk||first.status!==entity?.status||first[phaseKey]!==entity?.[phaseKey])return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s[phaseKey])||s[phaseKey]<0||i&&(s.at<=samples[i-1].at||s[phaseKey]<samples[i-1][phaseKey])||s.status!==first.status||idleWalk&&s.idleMode!=='walk'||s.running||s.gateWaiting||s.incapacitated||s.recovery||s.falling||s.taskId!==first.taskId||s.animation!==first.animation))return null;
 return samples.map(s=>({at:s.at,phase:s[phaseKey]}));
}

export function confirmedWorkerRunningSamples(preview,actorId,entity){
 const ticks=preview?.trace?.actorTickStates;if(!ticks?.complete||!Array.isArray(ticks.actors))return null;
 const matches=ticks.actors.filter(value=>value.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;
 const samples=matches[0].samples,first=samples[0];if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||!['walking','arriving','returning','fleeing'].includes(first.status)||first.status!==entity?.status||!first.running||first.runPhase!==entity?.runPhase)return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s.runPhase)||s.runPhase<0||i&&(s.at<=samples[i-1].at||s.runPhase<samples[i-1].runPhase)||s.status!==first.status||!s.running||s.gateWaiting||s.incapacitated||s.recovery||s.falling||s.taskId!==first.taskId||s.animation!==first.animation))return null;
 return samples.map(s=>({at:s.at,phase:s.runPhase}));
}

export function confirmedWorkerCarrySamples(preview,actorId,entity){
 const ticks=preview?.trace?.actorTickStates;if(!ticks?.complete||!Array.isArray(ticks.actors))return null;
 const matches=ticks.actors.filter(value=>value.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;
 const samples=matches[0].samples,first=samples[0];if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||first.status!=='carrying'||entity?.status!=='carrying'||typeof entity.crateId!=='string'||!entity.crateId||first.crateId!==entity.crateId||first.carryPhase!==entity.carryPhase)return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s.carryPhase)||s.carryPhase<0||i&&(s.at<=samples[i-1].at||s.carryPhase<samples[i-1].carryPhase)||s.status!=='carrying'||s.crateId!==first.crateId||s.gateWaiting||s.incapacitated||s.recovery||s.recoveryExiting||s.falling||s.taskId!==first.taskId||s.animation!==first.animation))return null;
 return samples.map(s=>({at:s.at,phase:s.carryPhase}));
}
