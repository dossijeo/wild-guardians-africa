import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const input=process.argv[2];
if(!input)throw Error('Usage: inspect-worker-traffic.mjs <state.json[.gz]>');
const raw=readFileSync(input);
const serialized=(input.endsWith('.gz')?gunzipSync(raw):raw).toString();
const state=JSON.parse(serialized);
const home=state.villages[0]?.entry??state.villages[0];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const rows=state.workers.filter(w=>w.status!=='home').map(w=>{
  const next=w.path?.[0]??null,length=next?distance(w,next):0;
  const probe=length>1e-8?{x:w.x+(next.x-w.x)*Math.min(.5,length)/length,
    z:w.z+(next.z-w.z)*Math.min(.5,length)/length}:null;
  const blockers=probe?actorBlockers(state,w,true,8)
    .filter(other=>!actorSegmentClear(w,probe,w,[other]))
    .map(other=>other.id):[];
  return {id:w.id,status:w.status,x:w.x,z:w.z,homeDistance:home?distance(w,home):null,
    pathPoints:w.path?.length??0,next,blockers,
    yieldTo:w.mobileYield?.blockerId??null,
    atYield:!!w.mobileYield&&distance(w,w.mobileYield)<1e-5,
    yieldAge:w.mobileYield?state.elapsed-w.mobileYield.startedAt:null};
});
const byId=new Map(rows.map(row=>[row.id,row]));
const cycles=[];
for(const row of rows){
  const seen=new Map();let current=row;
  while(current){
    if(seen.has(current.id)){
      const cycle=[...seen.keys()].slice(seen.get(current.id));
      const signature=[...cycle].sort().join(',');
      if(!cycles.some(item=>item.signature===signature))cycles.push({signature,ids:cycle});
      break;
    }
    seen.set(current.id,seen.size);
    current=byId.get(current.blockers[0]);
  }
}
const nativeFresh=[];
if(process.argv.includes('--native')){
  const wasm=new WebAssembly.Module(readFileSync(new URL(
    '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const live=deserialize(serialized),loaded=new Map();
  const session=createSpatialGameSession(wasm,live,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=live.villages[0],entry=village.entry??village;
    const cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
    for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,live);
    nav.setActiveBounds([(cx-1)*48-24,(cz-1)*48-24,
      (cx+1)*48+24,(cz+1)*48+24]);
    const control=live.workers.find(w=>w.status==='fleeing'&&w.path?.length);
    for(const worker of live.workers.filter(w=>w.status==='fleeing'&&
      (!w.path?.length||w===control))){
      try{
        const route=session.routeActor(worker,entry,{worker:true});
        const startStand=session.actorCanStand(worker,{worker:true});
        const endStand=session.actorCanStand(entry,{worker:true});
        const startRegions=session.actorRegions(worker,{worker:true});
        const endRegions=session.actorRegions(entry,{worker:true});
        const nearbyStructures=live.structures.filter(item=>
          Number.isFinite(item.x)&&Number.isFinite(item.z)&&
          distance(item,worker)<4).map(item=>({id:item.id,kind:item.kind,
            material:item.material,status:item.status,x:item.x,z:item.z,
            hp:item.hp,distance:distance(item,worker)}));
        const standable=[];
        if(!startStand)for(const radius of [.25,.5,.75,1,1.5,2]){
          for(let angle=0;angle<16;angle++){
            const theta=angle*Math.PI/8,
              point={x:worker.x+radius*Math.cos(theta),
                z:worker.z+radius*Math.sin(theta)};
            if(session.actorCanStand(point,{worker:true}))standable.push(point);
          }
          if(standable.length)break;
        }
        const path=nav.workerPath(worker,{...entry,id:`home-${village.id}`},
          worker.radius??.28,null);
        nativeFresh.push({id:worker.id,found:!!path,points:path?.length??0,
          head:path?.[0]??null,routeStatus:route.status,routeReason:route.reason,
          startStand,endStand,startRegions,endRegions,nearbyStructures,standable});
      }catch(error){nativeFresh.push({id:worker.id,error:error.name,
        message:error.message});}
    }
  }finally{session.dispose();}
}
console.log(JSON.stringify({day:state.day,time:state.time,elapsed:state.elapsed,
  villageEntry:home,workerCount:rows.length,
  statusCounts:rows.reduce((counts,row)=>(counts[row.status]=(counts[row.status]??0)+1,counts),{}),
  routeMissing:rows.filter(row=>!row.pathPoints).map(row=>row.id),
  atYield:rows.filter(row=>row.atYield).map(row=>row.id),cycles,nativeFresh,rows},null,2));
