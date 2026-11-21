import {createWorld} from './mobility-worker-world-change.js';
const worker=new Worker(new URL('./mobility-worker-checkpoint.js',import.meta.url),{type:'module'}),pending=new Map();let serial=0;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')return resolve();const done=pending.get(row.id);if(done){pending.delete(row.id);done(row);}else if(row.kind==='error')reject(Error(row.error));};});
const send=message=>new Promise(resolve=>{const id=++serial;pending.set(id,resolve);worker.postMessage({...message,id});});
try{
 const [reference]=await Promise.all([createWorld(),ready]),options={worker:false,species:'hyena'},points=[];
 for(let z=-10;z<=10&&points.length<2;z+=2)for(let x=-10;x<=10&&points.length<2;x+=2){const p={x:reference.village.x+x,z:reference.village.z+z};if(points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>5)&&reference.session.actorCanStand(p,options))points.push(p);}
 if(points.length!==2||!reference.network)throw Error('Wrong island network fixture');
 window.runCheckpointAudit=async()=>{
  const first=await send({kind:'edit',session:'original',version:1,point:points[0]}),refId=reference.session.core.addOrientedBarrier(points[0].x,points[0].z,1.2,1.2,0,0);
  const captureStart=performance.now(),snapshot=reference.session.core.snapshot(),captureMs=performance.now()-captureStart;
  const fault=await send({kind:'edit',session:'original',version:2,point:points[1],failAfterMutation:true}),blocked=await send({kind:'query',session:'original',version:1,points,routes:[]});
  const cx=Math.floor((reference.village.x+24)/48),cz=Math.floor((reference.village.z+24)/48),checkpoint={kind:'checkpoint',newSession:'restored',version:1,cx,cz,snapshot};
  const invalid=await send({...checkpoint,snapshot:{...snapshot,biome:'invalid'}}),stillBlocked=await send({kind:'query',session:'original',version:1,points,routes:[]});
  const requestAt=performance.now(),restored=await send(checkpoint),responseMs=performance.now()-requestAt;
  const old=await send({kind:'query',session:'original',version:1,points,routes:[]}),stale=await send({kind:'query',session:'restored',version:0,points,routes:[]});
  const routes=Array.from({length:24},(_,i)=>({start:{x:reference.village.x-15+(i%6)*5,z:reference.village.z-8+Math.floor(i/6)*5},end:{x:reference.village.x+12+(i%4)*3,z:reference.village.z-10+Math.floor(i/4)*4}}));
  const expected={clear:points.map(p=>reference.session.actorCanStand(p,options)),routes:routes.map(({start,end})=>reference.session.routeActorNative(start,end,options)),spatial:reference.session.core.snapshot()};
  const result=await send({kind:'query',session:'restored',version:1,points,routes});
  if(!first.accepted||first.value!==refId||fault.kind!=='error'||blocked.reason!=='poisoned'||invalid.kind!=='error'||stillBlocked.reason!=='poisoned'||restored.kind!=='restored'||old.reason!=='session'||stale.reason!=='stale'||!result.accepted||JSON.stringify(result.value)!==JSON.stringify(expected)||JSON.stringify(expected.clear)!==JSON.stringify([false,true]))throw Error('Snapshot recovery mismatch');
  return {captureMs,snapshotBytes:new TextEncoder().encode(JSON.stringify(snapshot)).length,workerRestoreMs:restored.elapsed,responseMs,points,routes:routes.length,routeStatuses:expected.routes.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),clear:expected.clear,invalidRejected:invalid.kind==='error',poisonPreserved:stillBlocked.reason==='poisoned',oldSessionRejected:old.reason==='session',staleRejected:stale.reason==='stale',snapshotAndQueriesEqual:true,scope:'Private spatial checkpoint recovery from a trusted reference, 9 resident chunks and one animal profile. No simulation snapshot, actors, visual state, concurrent changes or production recovery.'};
 };
 window.checkpointReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.checkpointError=String(error?.stack??error);document.querySelector('#status').textContent=window.checkpointError;}
