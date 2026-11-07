import {isWorkerIncapacitatedPresentation} from './worker-incapacitated-presentation.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {isWorkerFleeIdle} from './worker-flee-idle.js';

// Each animation has its own eligibility checks; intervals crossing a state
// transition retain the ordinary confirmed presentation.
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
 const samples=matches[0].samples,first=samples[0];if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||!['walking','arriving','returning','fleeing'].includes(first.status)&&!isWorkerIncapacitatedPresentation(entity)||first.status!==entity?.status||isWorkerIncapacitatedPresentation(entity)&&first.incapacitated!==true||!first.running||first.runPhase!==entity?.runPhase)return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s.runPhase)||s.runPhase<0||i&&(s.at<=samples[i-1].at||s.runPhase<samples[i-1].runPhase)||s.status!==first.status||!s.running||s.gateWaiting||s.incapacitated!==first.incapacitated||s.incapacitated&&!isWorkerIncapacitatedPresentation(entity)||s.recovery||s.falling||s.taskId!==first.taskId||s.animation!==first.animation))return null;
 return samples.map(s=>({at:s.at,phase:s.runPhase}));
}

export function confirmedAnimalRunningSamples(preview,actorId,entity){
 const ticks=preview?.trace?.actorTickStates;if(!ticks?.complete||!Array.isArray(ticks.actors))return null;
 const matches=ticks.actors.filter(value=>value.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;
 const samples=matches[0].samples,first=samples[0];if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||!['entering','retreating'].includes(first.status)||first.status!==entity?.status||first.motionPhase!==entity?.motionPhase)return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s.motionPhase)||s.motionPhase<0||i&&(s.at<=samples[i-1].at||s.motionPhase<samples[i-1].motionPhase)||s.status!==first.status||s.gateWaiting||s.incapacitated||s.recovery||s.recoveryExiting||s.falling||s.taskId!==first.taskId||s.animation!==first.animation))return null;
 return samples.map(s=>({at:s.at,phase:s.motionPhase}));
}

export function confirmedAnimalAttackSamples(preview,actorId,entity){
 const ticks=preview?.trace?.actorTickStates,clip=ANIMAL_ACTIONS.animals[entity?.species]?.clips[entity?.animation];
 if(ticks?.complete!==true||!Array.isArray(ticks.actors)||entity?.id!==actorId||entity.status!=='attacking'||typeof entity.attackId!=='string'||!entity.attackId||!clip||!['Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2'].includes(entity.animation)||!Number.isFinite(entity.attackDuration)||entity.attackDuration<=0||!Number.isFinite(entity.attackRemaining)||entity.attackRemaining<=0||entity.attackRemaining>entity.attackDuration)return null;
 const matches=ticks.actors.filter(value=>value.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;
 const samples=matches[0].samples,first=samples[0];
 if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||first.attackId!==entity.attackId||first.animation!==entity.animation||first.attackDuration!==entity.attackDuration||first.attackRemaining!==entity.attackRemaining||first.x!==entity.x||first.z!==entity.z||first.heading!==(entity.heading??null))return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s.x)||!Number.isFinite(s.z)||i&&s.at<=samples[i-1].at||s.status!=='attacking'||s.attackId!==first.attackId||s.animation!==first.animation||s.attackDuration!==first.attackDuration||!Number.isFinite(s.attackRemaining)||s.attackRemaining<=0||s.attackRemaining>s.attackDuration||i&&s.attackRemaining>samples[i-1].attackRemaining||s.x!==first.x||s.z!==first.z||s.heading!==first.heading||s.gateWaiting||s.incapacitated||s.recovery||s.recoveryExiting||s.falling))return null;
 return samples.map(s=>({at:s.at,phase:Math.min(s.attackDuration-s.attackRemaining,clip.duration)}));
}

export function confirmedWorkerCarrySamples(preview,actorId,entity){
 const ticks=preview?.trace?.actorTickStates;if(!ticks?.complete||!Array.isArray(ticks.actors))return null;
 const matches=ticks.actors.filter(value=>value.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;
 const samples=matches[0].samples,first=samples[0];if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||first.status!=='carrying'||entity?.status!=='carrying'||typeof entity.crateId!=='string'||!entity.crateId||first.crateId!==entity.crateId||first.carryPhase!==entity.carryPhase)return null;
 if(samples.some((s,i)=>!Number.isFinite(s.at)||!Number.isFinite(s.carryPhase)||s.carryPhase<0||i&&(s.at<=samples[i-1].at||s.carryPhase<samples[i-1].carryPhase)||s.status!=='carrying'||s.crateId!==first.crateId||s.gateWaiting||s.incapacitated||s.recovery||s.recoveryExiting||s.falling||s.taskId!==first.taskId||s.animation!==first.animation))return null;
 return samples.map(s=>({at:s.at,phase:s.carryPhase}));
}

export function confirmedWorkerFleeIdleSamples(preview,actorId,entity){
 if(!(isWorkerFleeIdle(entity)||isWorkerIncapacitatedPresentation(entity)&&entity.running===false&&!entity.gateWaiting)||entity.id!==actorId)return null;const ticks=preview?.trace?.actorTickStates;if(ticks?.complete!==true||!Array.isArray(ticks.actors))return null;const matches=ticks.actors.filter(item=>item.actorId===actorId);if(matches.length!==1||!Array.isArray(matches[0].samples))return null;const samples=matches[0].samples,first=samples[0];if(samples.length<2||first?.at!==preview.start||samples.at(-1)?.at!==preview.end||first.status!==entity.status)return null;if(samples.some((sample,index)=>!Number.isFinite(sample.at)||index&&sample.at<=samples[index-1].at||sample.status!==entity.status||sample.running||sample.gateWaiting||sample.incapacitated!==!!entity.incapacitated||sample.recovery||sample.recoveryExiting||sample.falling||sample.taskId!==first.taskId||sample.animation!==first.animation))return null;return samples.map(sample=>({at:sample.at,phase:sample.at}));
}
