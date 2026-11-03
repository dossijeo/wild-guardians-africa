// One in-flight publication; preserve every barrier and eventful/physical
// state. Consecutive eventless ticks without active poses can share a snapshot.
export function hasQuietPhysics(p){return p.physicsPose===null&&!p.physicsPoses||p.physicsPose?.active===false&&(!p.physicsPoses||Array.isArray(p.physicsPoses)&&p.physicsPoses.length>0&&p.physicsPoses.every(pose=>pose?.active===false));}
export function createHostPublicationQueue({session,send}){
 if(typeof session!=='string'||!session||typeof send!=='function')throw TypeError('Invalid publication queue');
 const queue=[];let inFlight=0,lastSent=0,acknowledged=0,coalesced=0;
 function drain(){if(inFlight)return;while(queue.length){const item=queue.shift();if(item.kind==='publication'){inFlight=item.publication.sequence;lastSent=inFlight;send({...item,session});return;}send({...item,session});}}
 const replaceable=item=>item.kind==='publication'&&item.tick&&item.publication.unchanged!==true&&Array.isArray(item.publication.events)&&item.publication.events.length===0&&hasQuietPhysics(item.publication);
 return {
  publication(publication,tick){const item={kind:'publication',publication,tick,firstSequence:publication.sequence},previous=queue.at(-1);if(replaceable(item)&&previous&&replaceable(previous)&&previous.publication.sequence+1===publication.sequence){item.firstSequence=previous.firstSequence;queue[queue.length-1]=item;coalesced++;}else queue.push(item);drain();},
  message(message){queue.push(message);drain();},
  ack(sequence){if(!Number.isSafeInteger(sequence)||sequence!==inFlight||sequence<=acknowledged||sequence>lastSent)throw Error('Invalid publication acknowledgement');acknowledged=sequence;inFlight=0;drain();},
  status(){return {inFlight,queued:queue.length,coalesced,acknowledged};}
 };
}
