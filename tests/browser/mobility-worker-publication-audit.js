import {createPublicationReceiver} from '../../tools/trees/prototype_mobility_publication.mjs';
const worker=new Worker(new URL('./mobility-worker-publication.js',import.meta.url),{type:'module'}),pending=new Map();let next=0;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const data=e.data;if(data.kind==='ready')resolve(data);else if(data.kind==='error'){const p=pending.get(data.id);if(p){pending.delete(data.id);p.reject(Error(data.error));}else reject(Error(data.error));}else{const p=pending.get(data.id);if(p){pending.delete(data.id);p.resolve(data);}}};});
function request(message){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});worker.postMessage({...message,id});});}
try{
 const {session}=await ready;window.runPublicationAudit=async()=>{
  const receiver=createPublicationReceiver(session);
  const first=await request({kind:'run',steps:10,dt:.1,damageCenter:true});
  const acceptedFirst=receiver.accept(first);if(!acceptedFirst.accepted||first.projection.structures[0].status!=='collapsing')throw Error('Initial publication failed');
  const heldAt=performance.now();await new Promise(resolve=>setTimeout(resolve,200));const heldMs=performance.now()-heldAt;
  const busy=await request({kind:'run',steps:40,dt:.1});
  const invalidAck=await request({kind:'ack',session:'old-world',version:first.version});
  const stillBusy=await request({kind:'run',steps:40,dt:.1});
  const duplicate=receiver.accept(first);
  const gap=receiver.accept({...first,version:3});
  const wrongSession=receiver.accept({...first,session:'old-world',version:2});
  const ack=await request({kind:'ack',session,version:first.version});
  const second=await request({kind:'run',steps:40,dt:.1});
  const acceptedSecond=receiver.accept(second),events=second.projection.events.map(e=>e.type);
  const staleAck=await request({kind:'ack',session,version:first.version});
  const secondBusy=await request({kind:'run',steps:1,dt:.1});
  const finalAck=await request({kind:'ack',session,version:second.version});
  if(busy.kind!=='busy'||stillBusy.kind!=='busy'||busy.elapsed!==first.projection.elapsed||stillBusy.elapsed!==first.projection.elapsed||invalidAck.accepted||staleAck.accepted||secondBusy.kind!=='busy'||secondBusy.version!==second.version||!ack.accepted||!finalAck.accepted||duplicate.reason!=='stale'||gap.reason!=='gap'||wrongSession.reason!=='session'||!acceptedSecond.accepted||!events.includes('StructureRuined')||second.projection.structures[0].status!=='ruined')throw Error('Backpressure or event audit failed');
  return {firstVersion:first.version,secondVersion:second.version,heldMs,initialElapsed:first.projection.elapsed,finalElapsed:second.projection.elapsed,busy,invalidAck,stillBusy,duplicate,gap,wrongSession,ack,acceptedSecond,staleAck,secondBusy,finalAck,events,centerStatus:second.projection.structures[0].status,scope:'Isolated pull protocol: one outstanding complete projection. Refused work is not queued or retried. No production authority, rendering or safe-horizon proof.'};
 };
 window.publicationReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.publicationError=String(error?.stack??error);document.querySelector('#status').textContent=window.publicationError;}
