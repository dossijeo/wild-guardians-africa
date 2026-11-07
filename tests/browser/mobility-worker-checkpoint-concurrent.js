import {createWorld} from './mobility-worker-world-change.js';
import {createWorldResponseReceiver} from '../../tools/trees/prototype_world_response_receiver.mjs';
const worker=new Worker(new URL('./mobility-worker-checkpoint.js',import.meta.url),{type:'module'}),pending=new Map();let serial=0,onRestoring=null;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')return resolve();if(row.kind==='restoring'){onRestoring?.(row);return;}const done=pending.get(row.id);if(done){pending.delete(row.id);done(row);}else if(row.kind==='error')reject(Error(row.error));};});
const send=message=>new Promise(resolve=>{const id=++serial;pending.set(id,resolve);worker.postMessage({...message,id});});
const sendFenced=(receiver,message)=>{const ticket=receiver.begin(++serial);return {ticket,promise:new Promise(resolve=>{pending.set(ticket.id,resolve);worker.postMessage({...message,...ticket});})};};
try{
 const [reference]=await Promise.all([createWorld(),ready]),options={worker:false,species:'hyena'},points=[];
 for(let z=-10;z<=10&&points.length<2;z+=2)for(let x=-10;x<=10&&points.length<2;x+=2){const p={x:reference.village.x+x,z:reference.village.z+z};if(points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>5)&&reference.session.actorCanStand(p,options))points.push(p);}
 if(points.length!==2||!reference.network)throw Error('Wrong island fixture');
 window.runConcurrentCheckpointAudit=async()=>{
  let version=1;const receiver=createWorldResponseReceiver('restored',{initialVersion:version});let applied=0,presented=null;const initial=await send({kind:'edit',session:'original',version,point:points[0]}),firstId=reference.session.core.addOrientedBarrier(points[0].x,points[0].z,1.2,1.2,0,0);
  const snapshot=reference.session.core.snapshot(),cx=Math.floor((reference.village.x+24)/48),cz=Math.floor((reference.village.z+24)/48);
  const started=new Promise(resolve=>onRestoring=resolve),requestedAt=performance.now();
  const restoring=send({kind:'checkpoint',newSession:'restored',version,cx,cz,snapshot,notifyStart:true});
  const signal=await started,startedAt=signal.at-performance.timeOrigin;
  // Demand version 3 before the two changes arrive; it must not run early.
  const premature=send({kind:'query',session:'restored',version:3,points,routes:[]});
  const obsoleteQuery=sendFenced(receiver,{kind:'query',points,routes:[]});
  const secondId=reference.session.core.addOrientedBarrier(points[1].x,points[1].z,1.2,1.2,0,0);version=2;receiver.advance(version);
  const add=send({kind:'edit',session:'restored',version,point:points[1]});
  const removedReference=reference.session.core.removeBarrier(firstId);version=3;receiver.advance(version);
  const remove=send({kind:'edit',session:'restored',version,action:'remove',barrierId:firstId});
  const mutationCompletedAt=performance.now(),finalQuery=sendFenced(receiver,{kind:'query',points,routes:[]});
  const [restored,early,obsolete,added,removed,result]=await Promise.all([restoring,premature,obsoleteQuery.promise,add,remove,finalQuery.promise]);
  const staleDecision=receiver.deliver(obsolete,value=>{applied++;presented=value;}),finalDecision=receiver.deliver(result,value=>{applied++;presented=value;}),duplicateDecision=receiver.deliver(result,()=>{applied++;});
  const receivedAt=performance.now(),expected={clear:points.map(p=>reference.session.actorCanStand(p,options)),routes:[],spatial:reference.session.core.snapshot()},finishedAt=restored.at-performance.timeOrigin;
  if(!initial.accepted||initial.value!==firstId||secondId<=0||!removedReference||restored.kind!=='restored'||restored.version===version||mutationCompletedAt>=finishedAt||early.reason!=='gap'||!obsolete.accepted||staleDecision.reason!=='stale'||!finalDecision.accepted||duplicateDecision.reason!=='request'||applied!==1||!added.accepted||added.value!==secondId||!removed.accepted||!result.accepted||JSON.stringify(presented)!==JSON.stringify(expected)||JSON.stringify(expected.clear)!==JSON.stringify([true,false]))throw Error('Concurrent checkpoint ordering mismatch');
  return {points,requestedAt,startedAt,mutationCompletedAt,restoredVersion:restored.version,currentVersion:version,restoredAcceptedAsCurrent:restored.version===version,obsoleteWorkerAccepted:obsolete.accepted,staleDecision,finalDecision,duplicateDecision,applied,workerRestoreMs:restored.elapsed,untilCaughtUpMs:receivedAt-requestedAt,premature:early,added,removed,clear:presented.clear,spatialSnapshotEqual:true,scope:'Private checkpoint and two manually sequenced native barrier changes during a synchronous Worker restore. One-shot consumer rejects stale responses. No live game events, bounded journal, rendering, actors or production authority.'};
 };
 window.concurrentCheckpointReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.concurrentCheckpointError=String(error?.stack??error);document.querySelector('#status').textContent=window.concurrentCheckpointError;}
