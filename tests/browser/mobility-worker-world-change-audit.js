import {createWorld} from './mobility-worker-world-change.js';
const worker=new Worker(new URL('./mobility-worker-world-change-worker.js',import.meta.url),{type:'module'});let failed=null,onMessage;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>{failed=e.message;reject(Error(failed));};worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve(row);else if(row.kind==='error'){failed=row.error;reject(Error(row.error));onMessage?.(row);}else onMessage?.(row);};});
try{
 const [world,info]=await Promise.all([createWorld(),ready]);if(!world.network||!info.network||world.chunks!==9||info.chunks!==9)throw Error('Wrong mangrove layout');
 const options={worker:false,species:'hyena'};let point=null;
 for(let z=-10;z<=10&&!point;z+=2)for(let x=-10;x<=10&&!point;x+=2){const candidate={x:world.village.x+x,z:world.village.z+z};if(world.session.actorCanStand(candidate,options))point=candidate;}
 if(!point)throw Error('No clear test point');
 window.runWorldChangeAudit=async()=>{
  let version=1,started=null,old=null,updated=null,change=null;const requestedAt=performance.now();
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('World change timed out')),10000);
   onMessage=row=>{if(row.kind==='error'){clearTimeout(timeout);reject(Error(row.error));return;}
    if(row.kind==='started'){
     started=row.at-performance.timeOrigin;
     setTimeout(()=>{try{const invalidatedAt=performance.now();version++;const at=performance.now(),id=world.session.core.addOrientedBarrier(point.x,point.z,1.2,1.2,0,0),clear=world.session.actorCanStand(point,options);change={id,clear,invalidatedAt,issuedAt:performance.now(),referenceMs:performance.now()-at};worker.postMessage({kind:'wall',version,point});}catch(error){clearTimeout(timeout);reject(error);}},10);
    }else if(row.kind==='result')old={...row,finishedAt:row.at-performance.timeOrigin,accepted:row.version===version};
    else if(row.kind==='updated'){updated={...row,receivedAt:performance.now()};clearTimeout(timeout);resolve();}
   };
   worker.postMessage({kind:'run',version,point});
  });
  if(failed||!old||!change||!updated||!old.clear||old.accepted||change.id<=0||change.clear||updated.id!==change.id||updated.clear||updated.version!==version||change.issuedAt>=old.finishedAt)throw Error('World change parity or timing failed');
  version++;const removedReference=world.session.core.removeBarrier(change.id),clearReference=world.session.actorCanStand(point,options);
  const removed=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Removal timed out')),10000);onMessage=row=>{if(row.kind==='error'){clearTimeout(timeout);reject(Error(row.error));}else if(row.kind==='removed'){clearTimeout(timeout);resolve(row);}};worker.postMessage({kind:'remove',version,id:change.id,point});});
  if(!removedReference||!clearReference||!removed.removed||!removed.clear||removed.version!==version)throw Error('Removal parity failed');
  return {point,network:world.network,chunks:world.chunks,requestedAt,started,old,change,updated,updateLatencyMs:updated.receivedAt-change.invalidatedAt,removedReference,clearReference,removed,referenceAndWorkerAgree:true,scope:'Two independent Wild Engine worlds; a manually replicated native barrier is added while the other world builds a cold profile, then removed. Synthetic versioning; no game event, live simulation, rendering or transferable profile publication.'};
 };
 window.worldChangeReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.worldChangeError=String(error?.stack??error);document.querySelector('#status').textContent=window.worldChangeError;}
