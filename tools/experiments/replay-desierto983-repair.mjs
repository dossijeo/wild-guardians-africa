import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {repairRoute} from '../../src/world/work-points.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {tick} from '../../src/simulation/game.js';

const state=deserialize(JSON.parse(gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-pr42-d7-repair.json.gz',import.meta.url)))));
const module=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const radius=Number(process.argv[2]??2);
  for(let cz=-radius;cz<=radius;cz++)for(let cx=-radius;cx<=radius+2;cx++){
    if(session.core.selectChunk(cx,cz)<0)session.core.addChunk(cx,cz);
    loaded.set(`${cx},${cz}`,session.core.chunkPayload());
  }
  session.core.enableConnectivityDiagnostics();
  const nav=createSpatialNavigationMovement(session,state);
  const worker=state.workers.find(w=>w.id==='worker-3519');
  const targets=state.tasks.filter(t=>t.kind==='repair').map(t=>state.structures.find(s=>s.id===t.targetId));
  const gates=state.structures.filter(s=>s.kind==='wall'&&s.gate&&s.status!=='ruined');
  const probes=[[84,-2],[88,-2],[90,0],[92,2],[94,5],[95,8],[95.4,8.357],[96.6,8.357],[95,12]];
  console.log(JSON.stringify({probes:probes.map(([x,z])=>{
    const point={x,z};return {point,stand:session.actorCanStand(point,{worker:true}),
      region:session.actorRegions(point,{worker:true}),
      route:session.routeActor(worker,point,{worker:true}).status};
  })}));
  console.log(JSON.stringify({gates:gates.map(g=>{
    const pair=gatePortalPoints(g,.28);
    return {id:g.id,x:g.x,z:g.z,pair,
      regions:pair.map(p=>session.actorRegions(p,{worker:true})),
      routes:pair.map(p=>session.routeActor(worker,p,{worker:true}).status)};
  })}));
  for(const target of targets){
    const result={worker:worker.id,target:target.id,kind:target.kind,gate:target.gate,
      position:{x:target.x,z:target.z},
      center:{x:worker.x,z:worker.z},
      region:session.actorRegions(worker,{worker:true}),
      enclosure:session.actorEnclosure(worker,{worker:true})};
    try{result.route=repairRoute(worker,target,nav);}catch(error){
      result.error={name:error.name,missing:error.missing,details:error.details};
    }
    const scale=target.gate?(target.material==='reforzado'?1.6:['adobe','piedra'].includes(target.material)?1.4:1):1;
    const width=1.09*scale+.38,depth=.22+.38,c=Math.cos(target.yaw??0),s=Math.sin(target.yaw??0);
    result.approaches=[[0,depth],[0,-depth],[width,0],[-width,0]].map(([x,z])=>{
      const point={x:target.x+x*c+z*s,z:target.z-x*s+z*c};
      const native=session.routeActor(worker,point,{worker:true});
      return {point,status:native.status,reason:native.reason,
        region:session.actorRegions(point,{worker:true}),
        enclosure:session.actorEnclosure(point,{worker:true}),
        stand:session.actorCanStand(point,{worker:true})};
    });
    console.log(JSON.stringify(result));
  }
  console.log(JSON.stringify(session.core.connectivityDiagnostics()));
  const ticks=Number(process.argv.find(arg=>arg.startsWith('--ticks='))?.slice(8)??
    (process.argv.includes('--tick')?1:0));
  if(ticks){
    const began=performance.now();
    for(let i=0;i<ticks;i++)tick(state,.1,nav);
    console.log(JSON.stringify({afterTick:{day:state.day,time:state.time,
      ticks,elapsedMs:performance.now()-began,
      repairTasks:state.tasks.filter(t=>t.kind==='repair').map(t=>({id:t.id,blocked:t.blocked,workerId:t.workerId}))}}));
  }
}finally{session.dispose();}
