import {createWorld} from './mobility-worker-world-change.js';
const worker=new Worker(new URL('./mobility-worker-recovery.js',import.meta.url),{type:'module'}),pending=new Map();let id=0;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')return resolve();const p=pending.get(row.id);if(p){pending.delete(row.id);p(row);}else if(row.kind==='error')reject(Error(row.error));};});
const send=message=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);worker.postMessage({...message,id:n});});
try{
 const [reference]=await Promise.all([createWorld(),ready]),options={worker:false,species:'hyena'},points=[];
 for(let z=-10;z<=10&&points.length<2;z+=2)for(let x=-10;x<=10&&points.length<2;x+=2){const p={x:reference.village.x+x,z:reference.village.z+z};if(points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>5)&&reference.session.actorCanStand(p,options))points.push(p);}
 if(points.length!==2||!reference.network)throw Error('Fixture unavailable');
 window.runRecoveryAudit=async()=>{
  const base={session:'original'},first=await send({kind:'edit',...base,version:1,point:points[0]});const refId=reference.session.core.addOrientedBarrier(points[0].x,points[0].z,1.2,1.2,0,0);
  const fault=await send({kind:'edit',...base,version:2,point:points[1],failAfterMutation:true});
  const blocked=await send({kind:'query',...base,version:1,points});
  const failedRecovery=await send({kind:'recover',fail:true}),stillBlocked=await send({kind:'query',...base,version:1,points});
  const recovered=await send({kind:'recover'}),oldSession=await send({kind:'query',...base,version:0,points});
  const replay=await send({kind:'edit',session:'replacement',version:1,point:points[0]}),result=await send({kind:'query',session:'replacement',version:1,points});
  const expected={clear:points.map(p=>reference.session.actorCanStand(p,options)),spatial:reference.session.core.snapshot()};
  if(!first.accepted||first.value!==refId||fault.kind!=='error'||blocked.reason!=='poisoned'||failedRecovery.kind!=='error'||stillBlocked.reason!=='poisoned'||recovered.kind!=='recovered'||oldSession.reason!=='session'||!replay.accepted||!result.accepted||JSON.stringify(result.value)!==JSON.stringify(expected)||JSON.stringify(expected.clear)!==JSON.stringify([false,true]))throw Error('Recovery audit failed');
  return {points,first,fault,blocked,failedRecovery,stillBlocked,recoveryMs:recovered.elapsed,oldSession,replay,clear:result.value.clear,spatialSnapshotEqual:true,scope:'Fault injection after native barrier mutation; fail-closed private world, full fresh reconstruction and manual replay of one confirmed change. No production event log, simulation, visual continuity or frame timing.'};
 };
 window.recoveryReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.recoveryError=String(error?.stack??error);document.querySelector('#status').textContent=window.recoveryError;}
