// Consecutive eventless ticks with the same active pose owners may share the
// newest presentation state. Changes of owner are barriers like game events.
export function physicsOwners(p){
 if(p.physicsPose===null&&!p.physicsPoses)return '';
 const poses=p.physicsPoses??[p.physicsPose];if(!Array.isArray(poses)||!poses.length||!p.physicsPose||poses[0]?.actorId!==p.physicsPose.actorId||poses[0]?.active!==p.physicsPose.active)return null;
 const seen=new Set(),active=[];for(const pose of poses){if(!pose||typeof pose.actorId!=='string'||!pose.actorId||typeof pose.active!=='boolean'||seen.has(pose.actorId))return null;seen.add(pose.actorId);if(pose.active)active.push(pose.actorId);}return JSON.stringify(active.sort());
}
export function createHostPublicationQueue({session,send}){
 if(typeof session!=='string'||!session||typeof send!=='function')throw TypeError('Invalid publication queue');
 const queue=[];let inFlight=0,lastSent=0,acknowledged=0,coalesced=0;
 function drain(){if(inFlight)return;while(queue.length){const item=queue.shift();if(item.kind==='publication'){inFlight=item.publication.sequence;lastSent=inFlight;send({...item,session});return;}send({...item,session});}}
 const replaceable=item=>item.kind==='publication'&&item.tick&&item.publication.unchanged!==true&&Array.isArray(item.publication.events)&&item.publication.events.length===0&&physicsOwners(item.publication)!==null;
 return {
  publication(publication,tick){const item={kind:'publication',publication,tick,firstSequence:publication.sequence},previous=queue.at(-1);if(replaceable(item)&&previous&&replaceable(previous)&&physicsOwners(item.publication)===physicsOwners(previous.publication)&&previous.publication.sequence+1===publication.sequence){item.firstSequence=previous.firstSequence;queue[queue.length-1]=item;coalesced++;}else queue.push(item);drain();},
  message(message){queue.push(message);drain();},
  ack(sequence){if(!Number.isSafeInteger(sequence)||sequence!==inFlight||sequence<=acknowledged||sequence>lastSent)throw Error('Invalid publication acknowledgement');acknowledged=sequence;inFlight=0;drain();},
  status(){return {inFlight,queued:queue.length,coalesced,acknowledged};}
 };
}
