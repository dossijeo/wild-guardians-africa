import {nativeTaskActionActor} from '../../src/world/native-task-action-presentation.js';

// Continue the very same paid-hire authority and graphical owners. The only
// interception is the genuine endpoint reply, exactly as for TaskStart.
export async function auditOrdinaryTaskAction(c,taskBinding){
 const {client,preparer,wait,delay,getConfirmed,lifecycleMessages,blocks,publications,bornId,oldActor,frameActor}=c;
 const actor=Number(bornId.split('-').at(-1)),progress={stage:'waiting-for-action',taskBinding};window.nativeFarmActionProgress=progress;
 await wait(()=>lifecycleMessages.some(v=>v.kind==='birth-action-ready'),'ordinary arrival and genuine Harvest Action READY',60000);
 const ready=lifecycleMessages.find(v=>v.kind==='birth-action-ready'),ref=ready.reference,q=ref.request,prior=taskBinding.reference;
 if(nativeTaskActionActor(q)!==actor||q.bodyId!==prior.bodyId||q.taskId!==prior.taskId||q.targetId!==prior.targetId||q.actionKind!=='harvest'||q.nativeRoute.assignmentSequence!==taskBinding.assignmentSequence||['authorityEpoch','session','slot','generation'].some(k=>q.nativeRoute.routeHandle[k]!==prior.expectedRouteHandle[k]))throw Error('Action is not the actual arrival of the acquired Task14');
 const before=await client.inspect();Object.assign(progress,{stage:'action-ready',ready,before,sourceBefore:structuredClone(getConfirmed())});
 preparer.postMessage({kind:'block-birth-action',stage:'action-ready',durationMs:1800});
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='action-ready'),'Action READY preparer stall');
 const held=await client.inspect();Object.assign(progress,{stage:'held-action-ready',held,sourceHeld:structuredClone(getConfirmed())});
 // Keep this receipt inside the actual declared action, before Carry's
 // separately prepared consequence. Use its actual declared duration.
 const commitBlockMs=Math.min(1800,Math.round((q.duration-.6)*1000));if(commitBlockMs<750)throw Error('Action is too short for this acquisition-window audit');
 preparer.postMessage({kind:'release-birth-action-ready',durationMs:commitBlockMs});
 const committed=()=>lifecycleMessages.find(v=>v.kind==='birth-resource-committed'&&v.family==='task-action'&&nativeTaskActionActor(v.binding.reference.request)===actor);
 await wait(committed,'actual native Harvest Action15 acquisition');
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='action-commit'),'Action commit preparer stall');
 await delay(32);const after=await client.inspect(),consumer=after.drawExecution.consumer,commit=committed();Object.assign(progress,{stage:'action-committed',after,commit,sourceAfter:structuredClone(getConfirmed())});
 const actual=consumer.nativeRouteFrame?.bindings.find(v=>v.nativeAction&&nativeTaskActionActor(v.nativeAction.request)===actor),draws=consumer.samples.filter(v=>v.nativeWorldBoundary?.ticket===commit.binding.reference.worldBoundary.ticket);
 if(!actual||!draws.length||consumer.failed||consumer.gpuErrors||!frameActor(consumer.nativeRouteFrame,oldActor))throw Error('Ordinary Action15 lacks its actual hardware frame or peer');
 const metrics=stage=>{const b=blocks.find(v=>v.kind==='birth-block-end'&&v.stage===stage),s=consumer.samples.filter(v=>v.at>=b.start&&v.at<b.end),p=publications.filter(v=>v.at>=b.start&&v.at<b.end),gaps=s.slice(1).map((v,i)=>v.at-s[i].at);return {...b,drawFrames:s.length,confirmedPublications:p.length,clockAdvance:s.length?s.at(-1).clockElapsed-s[0].clockElapsed:0,peerProgress:p.length?Math.hypot(p.at(-1).old.x-p[0].old.x,p.at(-1).old.z-p[0].old.z):0,maxGapMs:gaps.length?Math.max(...gaps):null};};
 const readyBlock=metrics('action-ready'),commitBlock=metrics('action-commit');Object.assign(progress,{readyBlock,commitBlock});
 if([readyBlock,commitBlock].some(b=>b.drawFrames<4||b.confirmedPublications<4||b.clockAdvance<.5))throw Error('Action preparation stopped independent hardware/source clock progress');
 return {ready,commit,actual,drawFrames:draws.length,readyBlock,commitBlock,before,held,after,scope:'Ordinary Game Task14 arrival to Harvest15 with genuine held READY and original source/Surface/draw owners; no other action/cadence acceptance.'};
}
