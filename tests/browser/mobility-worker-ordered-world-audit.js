import {createWorld} from './mobility-worker-world-change.js';
const worker=new Worker(new URL('./mobility-worker-ordered-world.js',import.meta.url),{type:'module'});let dispatch;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve(row);else if(row.kind==='error'){reject(Error(row.error));dispatch?.(row);}else dispatch?.(row);};});
try{
 const [world,info]=await Promise.all([createWorld(),ready]),options={worker:false,species:'hyena'},points=[];
 if(!world.network||!info.network||world.chunks!==9||info.chunks!==9)throw Error('Wrong mangrove layout');
 for(let z=-10;z<=10&&points.length<2;z+=2)for(let x=-10;x<=10&&points.length<2;x+=2){const p={x:world.village.x+x,z:world.village.z+z};if(points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>5)&&world.session.actorCanStand(p,options))points.push(p);}
 if(points.length!==2)throw Error('No clear points');
 window.runOrderedWorldAudit=async()=>{
  const session='ordered-world',responses=[],requestedAt=performance.now();let version=0,started=null,build=null,mutationCompletedAt=null;
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Ordered audit timed out')),10000);
   dispatch=row=>{if(row.kind==='error'){clearTimeout(timeout);reject(Error(row.error));return;}
    if(row.kind==='started'){
     started=row.at-performance.timeOrigin;
     setTimeout(()=>{try{
      // The authoritative reference commits three changes while the worker is busy.
      version=3;worker.postMessage({kind:'query',session,version:3,requestId:'future',points});
      const first=world.session.core.addOrientedBarrier(points[0].x,points[0].z,1.2,1.2,0,0);
      const second=world.session.core.addOrientedBarrier(points[1].x,points[1].z,1.2,1.2,0,0);
      if(first<=0||second<=0||!world.session.core.removeBarrier(first))throw Error('Reference edit failed');
      mutationCompletedAt=performance.now();
      for(const msg of [
       {kind:'edit',version:1,action:'add',key:'a',point:points[0],requestId:'add-a'},
       {kind:'edit',version:1,action:'add',key:'a',point:points[0],requestId:'duplicate'},
       {kind:'query',version:2,requestId:'too-early',points},
       {kind:'edit',version:4,action:'remove',key:'a',requestId:'gap'},
       {kind:'edit',version:2,action:'add',key:'b',point:points[1],requestId:'add-b'},
       {kind:'edit',version:3,action:'remove',key:'a',requestId:'remove-a'},
       {kind:'query',version:3,requestId:'final',points},
       {kind:'query',version:2,requestId:'old',points},
       {kind:'query',version:3,session:'old-world',requestId:'session',points}
      ])worker.postMessage({session,...msg});
     }catch(error){clearTimeout(timeout);reject(error);}},10);
    }else if(row.kind==='build-result')build={...row,finishedAt:row.at-performance.timeOrigin,acceptedByReference:row.accepted&&row.version===version};
    else {responses.push(row);if(row.requestId==='session'){clearTimeout(timeout);resolve();}}
   };
   worker.postMessage({kind:'build',session,version:0,point:points[0]});
  });
  const byId=Object.fromEntries(responses.map(row=>[row.requestId,row])),expected=points.map(p=>world.session.actorCanStand(p,options));
  if(!build||!build.value||build.acceptedByReference||mutationCompletedAt>=build.finishedAt||byId.future.reason!=='gap'||byId.duplicate.reason!=='stale'||byId['too-early'].reason!=='gap'||byId.gap.reason!=='gap'||!byId['add-a'].accepted||!byId['add-b'].accepted||!byId['remove-a'].accepted||!byId.final.accepted||byId.old.reason!=='stale'||byId.session.reason!=='session'||JSON.stringify(expected)!==JSON.stringify([true,false])||JSON.stringify(byId.final.value)!==JSON.stringify(expected))throw Error('Ordering or geometry mismatch');
  return {points,requestedAt,started,build,mutationCompletedAt,expected,responses,scope:'Two private Wild Engine worlds with three manually ordered native barrier edits and simulated delivery faults while a cold profile builds. No real game events, recovery protocol, rendering, physical movement or authoritative production state.'};
 };
 window.orderedWorldReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.orderedWorldError=String(error?.stack??error);document.querySelector('#status').textContent=window.orderedWorldError;}
