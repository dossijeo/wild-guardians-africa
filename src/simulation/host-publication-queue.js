// Quiet ticks may be absorbed into the next tick, including an eventful one,
// if their active pose owners match. Existing events remain at their state.
export function physicsOwners(p){
 if(p.physicsPose===null&&!p.physicsPoses)return '';
 const poses=p.physicsPoses??[p.physicsPose];if(!Array.isArray(poses)||!poses.length||!p.physicsPose||poses[0]?.actorId!==p.physicsPose.actorId||poses[0]?.active!==p.physicsPose.active)return null;
 const seen=new Set(),active=[];for(const pose of poses){if(!pose||typeof pose.actorId!=='string'||!pose.actorId||typeof pose.active!=='boolean'||seen.has(pose.actorId))return null;seen.add(pose.actorId);if(pose.active)active.push(pose.actorId);}return JSON.stringify(active.sort());
}
// The diagnostic path stream may be folded only when its boundaries match;
// preserving an event does not permit silently losing intervening segments.
function mergedMotion(a,b){
 if(!a&&!b)return undefined;if(!a||!b||a.actorId!==b.actorId||a.end.at!==b.start.at||a.end.x!==b.start.x||a.end.z!==b.start.z||!Array.isArray(a.segments)||!Array.isArray(b.segments)||a.segments.length+b.segments.length>4096)return null;
 let peers;if(a.peers!==undefined||b.peers!==undefined){if(!Array.isArray(a.peers)||!Array.isArray(b.peers)||a.rosterChanged||b.rosterChanged||a.peers.length!==b.peers.length)return null;let count=a.segments.length+b.segments.length;peers=[];for(let i=0;i<a.peers.length;i++){const left=a.peers[i],right=b.peers[i];if(left.radius!==right.radius||left.endStatus!==right.startStatus)return null;const merged=mergedMotion(left,right);if(!merged)return null;count+=merged.segments.length;if(count>4096)return null;peers.push({...merged,radius:left.radius,startStatus:left.startStatus,endStatus:right.endStatus});}}
 return {actorId:a.actorId,start:a.start,end:b.end,segments:[...a.segments,...b.segments],continuous:a.continuous&&b.continuous,timed:a.timed===true&&b.timed===true,...(peers?{peers,rosterChanged:false}:{})};
}
export function createHostPublicationQueue({session,send,diagnostics=false,foldViews=false}){
 if(typeof session!=='string'||!session||typeof send!=='function'||typeof diagnostics!=='boolean'||typeof foldViews!=='boolean')throw TypeError('Invalid publication queue');
 const queue=[];let inFlight=0,lastSent=0,acknowledged=0,coalesced=0,foldedViewCount=0,queuedPublications=0,eventfulPublications=0,tickPublications=0,unchangedPublications=0,snapshotChars=0,peakSnapshotChars=0,peakEventfulPublications=0,peakQueuedPublications=0,peakQueuedMessages=0;
 function account(item,sign){if(!diagnostics||item.kind!=='publication')return;queuedPublications+=sign;eventfulPublications+=sign*(item.publication.events?.length>0?1:0);tickPublications+=sign*(item.tick?1:0);unchangedPublications+=sign*(item.publication.unchanged===true?1:0);snapshotChars+=sign*(typeof item.publication.snapshot==='string'?item.publication.snapshot.length:0);peakSnapshotChars=Math.max(peakSnapshotChars,snapshotChars);peakEventfulPublications=Math.max(peakEventfulPublications,eventfulPublications);peakQueuedPublications=Math.max(peakQueuedPublications,queuedPublications);peakQueuedMessages=Math.max(peakQueuedMessages,queue.length);}
 function drain(){if(inFlight)return;while(queue.length){const item=queue.shift();account(item,-1);if(item.kind==='publication'){inFlight=item.publication.sequence;lastSent=inFlight;send({...item,session});return;}send({...item,session});}}
 const eligible=item=>item.kind==='publication'&&item.tick&&item.publication.unchanged!==true&&Array.isArray(item.publication.events)&&physicsOwners(item.publication)!==null;
 // An invalidation is an ordered boundary even when no gameplay event was
 // emitted. Absorbing it would let a consumer retain an obsolete trajectory.
 const replaceable=item=>eligible(item)&&item.publication.events.length===0&&!item.publication.motionInvalidation;
 const background=item=>item?.kind==='publication'&&item.backgroundView===true&&item.publication.unchanged===true&&Array.isArray(item.publication.events)&&item.publication.events.length===0&&!Object.hasOwn(item.publication,'snapshot');
 const sameState=(a,b)=>a.slotId===b.slotId&&a.stateSequence===b.stateSequence&&a.elapsed===b.elapsed&&a.saveAvailable===b.saveAvailable&&JSON.stringify(a.pauses)===JSON.stringify(b.pauses);
 return {
  publication(publication,tick,{backgroundView=false}={}){let item={kind:'publication',publication,tick,backgroundView,firstSequence:publication.sequence};const previous=queue.at(-1);let folded=false;
   if(previous&&background(previous)&&previous.publication.sequence+1===publication.sequence&&(background(item)&&sameState(previous.publication,publication)||eligible(item))){item.firstSequence=previous.firstSequence;account(previous,-1);queue[queue.length-1]=item;coalesced++;account(item,1);drain();return false;}
   if(foldViews&&publication.unchanged===true&&Array.isArray(publication.events)&&publication.events.length===0&&!Object.hasOwn(publication,'snapshot')&&previous&&replaceable(previous)&&previous.publication.sequence+1===publication.sequence&&previous.publication.elapsed===publication.elapsed&&JSON.stringify(previous.publication.pauses)===JSON.stringify(publication.pauses)&&previous.publication.saveAvailable===publication.saveAvailable){const snapshot=JSON.parse(previous.publication.snapshot);if(snapshot.slotId===publication.slotId&&snapshot.sequence===publication.stateSequence&&snapshot.elapsed===publication.elapsed){item={kind:'publication',publication:{...previous.publication,sequence:publication.sequence},tick:true,firstSequence:previous.firstSequence};folded=true;foldedViewCount++;}}
   const motion=previous?mergedMotion(previous.publication?.motionTrace,item.publication.motionTrace):undefined;
   if(folded||motion!==null&&eligible(item)&&previous&&replaceable(previous)&&physicsOwners(item.publication)===physicsOwners(previous.publication)&&previous.publication.sequence+1===publication.sequence){if(!folded&&motion)item.publication={...item.publication,motionTrace:motion};item.firstSequence=previous.firstSequence;account(previous,-1);queue[queue.length-1]=item;coalesced++;}else queue.push(item);account(item,1);drain();return folded;},
  message(message){queue.push(message);if(diagnostics)peakQueuedMessages=Math.max(peakQueuedMessages,queue.length);drain();},
  ack(sequence){if(!Number.isSafeInteger(sequence)||sequence!==inFlight||sequence<=acknowledged||sequence>lastSent)throw Error('Invalid publication acknowledgement');acknowledged=sequence;inFlight=0;drain();},
  status(){return {inFlight,queued:queue.length,coalesced,acknowledged,foldedViewCount,...(diagnostics?{queuedPublications,eventfulPublications,tickPublications,unchangedPublications,snapshotChars,peakSnapshotChars,peakEventfulPublications,peakQueuedPublications,peakQueuedMessages}:{})};}
 };
}
