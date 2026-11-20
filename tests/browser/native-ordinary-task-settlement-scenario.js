import {sameNativeTaskConsequenceReference} from '../../src/world/native-task-consequence.js';
import {prepareCrateDeliveryConsequence} from '../../src/simulation/game.js';

// Continue the original paid hire and Carry on its actual source/control ports.
// Observation delays only the genuine READY response; it grants no permission.
export async function auditOrdinaryTaskSettlement(c,consequence){
 const {client,preparer,wait,delay,getConfirmed,lifecycleMessages,blocks,publications,bornId,oldActor,frameActor}=c;
 const actor=Number(bornId.split('-').at(-1)),progress={stage:'waiting-for-settlement'};window.nativeFarmSettlementProgress=progress;
 await wait(()=>lifecycleMessages.some(v=>v.kind==='birth-settlement-ready'),'ordinary Carry arrival and genuine settlement READY',60000);
 const ready=lifecycleMessages.find(v=>v.kind==='birth-settlement-ready'),r=ready.reference,source=structuredClone(getConfirmed()),worker=source.workers.find(w=>w.id===bornId),crateId=`crate-${r.crateId}`,crate=source.crates.find(v=>v.id===crateId),entryId=`deliver:${crateId}`;
 if(r.actorId!==actor||r.bodyId!==2||r.sourceCarry.assignmentSequence!==consequence.commit.binding.assignmentSequence||!sameNativeTaskConsequenceReference(r.sourceCarry.reference,consequence.commit.binding.reference)||r.home)throw Error('Settlement does not continue the actual active-contract Carry16');
 const preview=prepareCrateDeliveryConsequence(source,worker,crate,source.structures.find(v=>v.id===worker.centerId));
 if(!preview||preview.status!=='idle')throw Error('Ordinary arrived crate has no active-contract delivery');
 const unchanged=s=>{const w=s.workers.find(v=>v.id===bornId),v=s.crates.find(v=>v.id===crateId);return w.status==='carrying'&&w.nativeRouteAdmission==='native-delivery'&&w.crateId===crateId&&!w.taskId&&v&&!v.delivered&&v.carrierId===bornId&&!Object.hasOwn(s.ledger.entries,entryId)&&JSON.stringify(s.ledger)===JSON.stringify(source.ledger)&&Math.abs(w.x-r.pose.x)<1e-5&&Math.abs(w.z-r.pose.z)<1e-5;};
 if(!unchanged(source))throw Error('Delivery escaped before actual resource acquisition');
 const before=await client.inspect();Object.assign(progress,{stage:'settlement-ready',ready,before,sourceBefore:source,preview});
 preparer.postMessage({kind:'block-birth-settlement',stage:'settlement-ready',durationMs:1800});
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='settlement-ready'),'settlement READY preparer stall');
 const held=await client.inspect(),sourceHeld=structuredClone(getConfirmed()),terminal=held.drawExecution.consumer.nativeRouteFrame?.bindings.find(v=>v.nativeConsequence?.actorId===actor);
 Object.assign(progress,{stage:'held-settlement-ready',held,sourceHeld});
 if(!unchanged(sourceHeld)||!terminal)throw Error('Pending settlement changed the economic result or lost the arrived Carry image');
 preparer.postMessage({kind:'release-birth-settlement-ready',durationMs:1800});
 const committed=()=>lifecycleMessages.find(v=>v.kind==='birth-resource-committed'&&v.family==='task-settlement'&&v.binding.reference.actorId===actor);
 await wait(committed,'actual ordinary settlement17 acquisition');
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='settlement-commit'),'settlement commit preparer stall');
 await delay(32);const after=await client.inspect(),consumer=after.drawExecution.consumer,commit=committed(),state=structuredClone(getConfirmed()),current=state.workers.find(w=>w.id===bornId),delivered=state.crates.find(v=>v.id===crateId),actual=consumer.nativeRouteFrame?.bindings.find(v=>v.nativeSettlement?.actorId===actor),draws=consumer.samples.filter(v=>v.nativeWorldBoundary?.ticket===commit.binding.reference.worldBoundary.ticket);
 Object.assign(progress,{stage:'settlement-committed',after,commit,sourceAfter:state,actual});
 if(!actual||!draws.length||consumer.failed||consumer.gpuErrors||!frameActor(consumer.nativeRouteFrame,oldActor)||commit.binding.reference.bodyId!==r.bodyId||actual.executionEpoch!==commit.binding.reference.worldBoundary.effectiveTime)throw Error('Settlement lacks its actual hardware frame, execution origin, body or peer');
 const income=preview.income,whole=(BigInt(income.n)+BigInt(income.d)-1n)/BigInt(income.d),entry=state.ledger.entries[entryId],expectedBalance=BigInt(source.ledger.balance.n)+whole;
 if(!delivered?.delivered||delivered.carrierId!==null||current.crateId!==null||current.status!=='idle'||current.taskId||current.nativeRouteAdmission||current.nativeDelivery||!entry||entry.n!==String(whole)||entry.d!=='1'||source.ledger.balance.d!=='1'||state.ledger.balance.n!==String(expectedBalance)||state.ledger.balance.d!=='1'||Object.keys(state.ledger.entries).filter(k=>!Object.hasOwn(source.ledger.entries,k)).join()!==entryId||!state.tutorial.harvestCompleted)throw Error('Settlement did not project the single coherent ordinary income/crate/availability result');
 const metrics=stage=>{const b=blocks.find(v=>v.kind==='birth-block-end'&&v.stage===stage),s=consumer.samples.filter(v=>v.at>=b.start&&v.at<b.end),p=publications.filter(v=>v.at>=b.start&&v.at<b.end),gaps=s.slice(1).map((v,i)=>v.at-s[i].at);return {...b,drawFrames:s.length,confirmedPublications:p.length,clockAdvance:s.length?s.at(-1).clockElapsed-s[0].clockElapsed:0,maxGapMs:gaps.length?Math.max(...gaps):null};};
 const readyBlock=metrics('settlement-ready'),commitBlock=metrics('settlement-commit');Object.assign(progress,{readyBlock,commitBlock});
 if([readyBlock,commitBlock].some(b=>b.drawFrames<4||b.confirmedPublications<4||b.clockAdvance<.5))throw Error('Settlement preparation stopped the source or draw clock');
 return {ready,commit,actual,drawFrames:draws.length,readyBlock,commitBlock,before,held,after,sourceBefore:source,sourceHeld,sourceAfter:state,economic:{entryId,expectedIncome:String(whole),entry,expectedBalance:String(expectedBalance)},scope:'Ordinary active-contract Carry16 arrival to settlement17 and Idle; same original authority/body/Surface/draw. Not next task/Home or cadence acceptance.'};
}
