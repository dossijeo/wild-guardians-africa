import {nativeTaskActionActor,sameNativeTaskActionReference,nativeTaskActionRemainingDuration} from '../../src/world/native-task-action-presentation.js';

// Observe the next ordinary producer operation on the SAME source and ports.
// READY and commit are actual endpoint messages, never constructed receipts.
export async function auditOrdinaryTaskConsequence(c,action){
 const {client,preparer,wait,delay,getConfirmed,lifecycleMessages,blocks,publications,bornId,oldActor,frameActor}=c;
 const actor=Number(bornId.split('-').at(-1)),progress={stage:'waiting-for-consequence'};window.nativeFarmConsequenceProgress=progress;
 await wait(()=>lifecycleMessages.some(v=>v.kind==='birth-consequence-ready'),'ordinary completed Harvest and genuine Carry READY',60000);
 const ready=lifecycleMessages.find(v=>v.kind==='birth-consequence-ready'),r=ready.reference,q=r.sourceAction.reference.request,source=getConfirmed(),targetId=`plant-${q.targetId}`,taskId=`task-${q.taskId}`,crateId=`crate-${r.crateId}`;
 if(r.actorId!==actor||nativeTaskActionActor(q)!==actor||r.bodyId!==2||r.sourceAction.actionSequence!==action.commit.binding.actionSequence||!sameNativeTaskActionReference(r.sourceAction.reference,action.commit.binding.reference))throw Error('Carry does not continue the actual issued Harvest15');
 const unchanged=s=>s.plants.some(p=>p.id===targetId&&p.alive)&&s.tasks.some(t=>t.id===taskId&&t.workerId===bornId)&&!s.crates.some(v=>v.id===crateId)&&!s.workers.find(w=>w.id===bornId).crateId;
 if(!unchanged(source))throw Error('Harvest consequences escaped before genuine resource acquisition');
 const before=await client.inspect();Object.assign(progress,{stage:'consequence-ready',ready,before,sourceBefore:structuredClone(source)});
 preparer.postMessage({kind:'block-birth-consequence',stage:'consequence-ready',durationMs:1800});
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='consequence-ready'),'Carry READY preparer stall');
 const held=await client.inspect(),sourceHeld=getConfirmed(),terminal=held.drawExecution.consumer.nativeRouteFrame?.bindings.find(v=>v.nativeAction&&nativeTaskActionActor(v.nativeAction.request)===actor);
 Object.assign(progress,{stage:'held-consequence-ready',held,sourceHeld:structuredClone(sourceHeld)});
 if(!unchanged(sourceHeld)||!terminal||Math.abs(terminal.relativeTime-nativeTaskActionRemainingDuration(terminal.nativeAction.request))>1e-5)throw Error('Pending Carry changed the crop/crate or lost the terminal Harvest image');
 preparer.postMessage({kind:'release-birth-consequence-ready',durationMs:1800});
 const committed=()=>lifecycleMessages.find(v=>v.kind==='birth-resource-committed'&&v.family==='task-consequence'&&v.binding.reference.actorId===actor);
 await wait(committed,'actual ordinary Carry16 acquisition');
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='consequence-commit'),'Carry commit preparer stall');
 await delay(32);const after=await client.inspect(),consumer=after.drawExecution.consumer,commit=committed(),state=getConfirmed(),worker=state.workers.find(w=>w.id===bornId),crate=state.crates.find(v=>v.id===crateId);
 const actual=consumer.nativeRouteFrame?.bindings.find(v=>v.nativeConsequence?.actorId===actor),draws=consumer.samples.filter(v=>v.nativeWorldBoundary?.ticket===commit.binding.reference.worldBoundary.ticket);
 Object.assign(progress,{stage:'consequence-committed',after,commit,sourceAfter:structuredClone(state),actual});
 if(!actual||!draws.length||consumer.failed||consumer.gpuErrors||!frameActor(consumer.nativeRouteFrame,oldActor)||commit.binding.reference.bodyId!==r.bodyId)throw Error('Carry lacks an actual hardware frame, body or live peer');
 if(state.plants.some(p=>p.id===targetId&&p.alive)||state.tasks.some(t=>t.id===taskId)||worker.status!=='carrying'||worker.nativeRouteAdmission!=='native-delivery'||worker.taskId||worker.crateId!==crateId||!crate||crate.delivered||crate.carrierId!==bornId||crate.sourcePlantId!==targetId)throw Error('Carry did not project the actual atomic harvest result');
 const metrics=stage=>{const b=blocks.find(v=>v.kind==='birth-block-end'&&v.stage===stage),s=consumer.samples.filter(v=>v.at>=b.start&&v.at<b.end),p=publications.filter(v=>v.at>=b.start&&v.at<b.end),gaps=s.slice(1).map((v,i)=>v.at-s[i].at);return {...b,drawFrames:s.length,confirmedPublications:p.length,clockAdvance:s.length?s.at(-1).clockElapsed-s[0].clockElapsed:0,bornProgress:p.length?Math.hypot(p.at(-1).born.x-p[0].born.x,p.at(-1).born.z-p[0].born.z):0,maxGapMs:gaps.length?Math.max(...gaps):null};};
 const readyBlock=metrics('consequence-ready'),commitBlock=metrics('consequence-commit');Object.assign(progress,{readyBlock,commitBlock});
 if([readyBlock,commitBlock].some(b=>b.drawFrames<4||b.confirmedPublications<4||b.clockAdvance<.5)||commitBlock.bornProgress<.5)throw Error('Carry preparation stopped the source/draw clock or its issued movement');
 return {ready,commit,actual,drawFrames:draws.length,readyBlock,commitBlock,before,held,after,sourceBefore:source,sourceHeld,sourceAfter:state,scope:'Ordinary Game Harvest15→Carry16, same actor/body/ports/Surface/draw; crop removal and actual crate projection. Not delivery settlement or cadence acceptance.'};
}
