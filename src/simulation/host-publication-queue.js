// Quiet ticks may be absorbed into the next tick, including an eventful one,
// if their active pose owners match. Existing events remain at their state.
export function physicsOwners(p){
 if(p.physicsPose===null&&!p.physicsPoses)return '';
 const poses=p.physicsPoses??[p.physicsPose];if(!Array.isArray(poses)||!poses.length||!p.physicsPose||poses[0]?.actorId!==p.physicsPose.actorId||poses[0]?.active!==p.physicsPose.active)return null;
 const seen=new Set(),active=[];for(const pose of poses){if(!pose||typeof pose.actorId!=='string'||!pose.actorId||typeof pose.active!=='boolean'||seen.has(pose.actorId))return null;seen.add(pose.actorId);if(pose.active)active.push(pose.actorId);}return JSON.stringify(active.sort());
}
export function createHostPublicationQueue({session,send,diagnostics=false}){
 if(typeof session!=='string'||!session||typeof send!=='function'||typeof diagnostics!=='boolean')throw TypeError('Invalid publication queue');
 const queue=[];let inFlight=0,lastSent=0,acknowledged=0,coalesced=0,queuedPublications=0,eventfulPublications=0,tickPublications=0,unchangedPublications=0,snapshotChars=0,peakSnapshotChars=0,peakEventfulPublications=0;
 function account(item,sign){if(!diagnostics||item.kind!=='publication')return;queuedPublications+=sign;eventfulPublications+=sign*(item.publication.events?.length>0?1:0);tickPublications+=sign*(item.tick?1:0);unchangedPublications+=sign*(item.publication.unchanged===true?1:0);snapshotChars+=sign*(typeof item.publication.snapshot==='string'?item.publication.snapshot.length:0);peakSnapshotChars=Math.max(peakSnapshotChars,snapshotChars);peakEventfulPublications=Math.max(peakEventfulPublications,eventfulPublications);}
 function drain(){if(inFlight)return;while(queue.length){const item=queue.shift();account(item,-1);if(item.kind==='publication'){inFlight=item.publication.sequence;lastSent=inFlight;send({...item,session});return;}send({...item,session});}}
 const eligible=item=>item.kind==='publication'&&item.tick&&item.publication.unchanged!==true&&Array.isArray(item.publication.events)&&physicsOwners(item.publication)!==null;
 const replaceable=item=>eligible(item)&&item.publication.events.length===0;
 return {
  publication(publication,tick){const item={kind:'publication',publication,tick,firstSequence:publication.sequence},previous=queue.at(-1);if(eligible(item)&&previous&&replaceable(previous)&&physicsOwners(item.publication)===physicsOwners(previous.publication)&&previous.publication.sequence+1===publication.sequence){item.firstSequence=previous.firstSequence;account(previous,-1);queue[queue.length-1]=item;coalesced++;}else queue.push(item);account(item,1);drain();},
  message(message){queue.push(message);drain();},
  ack(sequence){if(!Number.isSafeInteger(sequence)||sequence!==inFlight||sequence<=acknowledged||sequence>lastSent)throw Error('Invalid publication acknowledgement');acknowledged=sequence;inFlight=0;drain();},
  status(){return {inFlight,queued:queue.length,coalesced,acknowledged,...(diagnostics?{queuedPublications,eventfulPublications,tickPublications,unchangedPublications,snapshotChars,peakSnapshotChars,peakEventfulPublications}:{})};}
 };
}
