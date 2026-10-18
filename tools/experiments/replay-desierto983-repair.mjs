import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {repairRoute} from '../../src/world/work-points.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {tick} from '../../src/simulation/game.js';
import {centerFootprint} from '../../src/world/centers.js';
import {wallStroke} from '../../src/world/wall-layout.js';

const state=deserialize(JSON.parse(gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-pr42-d7-repair.json.gz',import.meta.url)))));
const module=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const radius=Number(process.argv[2]??2);
  const desired=new Map();
  for(let cz=-radius;cz<=radius;cz++)for(let cx=-radius;cx<=radius+2;cx++){
    desired.set(`${cx},${cz}`,{cx,cz,score:Math.abs(cx-1)+Math.abs(cz)});
  }
  session.stream.plan(desired);
  await session.stream.whenIdle();
  session.core.enableConnectivityDiagnostics();
  const nav=createSpatialNavigationMovement(session,state);
  console.log(JSON.stringify({centerFootprints:state.structures.filter(s=>s.kind==='center')
    .map(s=>({id:s.id,footprint:centerFootprint(s,state).footprint})),
  terrainProbe:[90,91,92,93,94,95,96].map(x=>({x,z:8,
    surface:session.field.surface(x,8),slope:session.field.slope(x,8),
    props:session.queryPropsAt(x,8,1.5)}))}));
  const west=session.actorRegions({x:88,z:8},{worker:true}).ids,
    east=session.actorRegions({x:95,z:8},{worker:true}).ids;
  const map=[];
  for(let z=17;z>=-1;z--){
    let row='';
    for(let x=80;x<=99;x++){
      const point={x,z},regions=session.actorRegions(point,{worker:true});
      row+=!session.actorCanStand(point,{worker:true})?'#':
        regions.ids.some(id=>west.includes(id))?'W':
        regions.ids.some(id=>east.includes(id))?'E':regions.ids.length?'.':'?';
    }
    map.push(`${String(z).padStart(3)} ${row}`);
  }
  console.log(JSON.stringify({map}));
  const worker=state.workers.find(w=>w.id==='worker-3519');
  const nearWorker=state.workers.find(w=>w.id==='worker-3522');
  console.log(JSON.stringify({eastEdgeCandidates:[90,96].map(x=>{
    const slots=wallStroke([[x,-18],[x,18]],state.structures,{smooth:false,snap:false});
    const probes=slots
      .map(slot=>{
        const piece={kind:'wall',material:'zarzas',gate:false,baseScaleX:slot.scaleX,
          x:slot.x,z:slot.z,yaw:-slot.angle};
        const near={x:slot.x-.6,z:slot.z};
        return {z:slot.z,placement:nav.wallPlacement(piece).valid,
          nearStand:session.actorCanStand(near,{worker:true}),
          nearConnection:session.actorConnectivity(nearWorker,near,{worker:true})};
      });
    return {x,slots:slots.length,legal:probes.filter(p=>p.placement).length,
      accessible:probes.filter(p=>p.placement&&p.nearConnection==='possible').length,
      probes};
  })}));
  const targets=state.tasks.filter(t=>t.kind==='repair').map(t=>state.structures.find(s=>s.id===t.targetId));
  console.log(JSON.stringify({workers:state.workers.map(w=>({id:w.id,x:w.x,z:w.z,
    centerId:w.centerId,status:w.status})),
  livingCropBands:{west:state.plants.filter(p=>p.alive&&p.x<91).length,
    ridge:state.plants.filter(p=>p.alive&&p.x>=91&&p.x<95).length,
    east:state.plants.filter(p=>p.alive&&p.x>=95).length},
  livingCropBounds:state.plants.filter(p=>p.alive).reduce((bounds,p)=>({
    minX:Math.min(bounds.minX,p.x),minZ:Math.min(bounds.minZ,p.z),
    maxX:Math.max(bounds.maxX,p.x),maxZ:Math.max(bounds.maxZ,p.z)}),
  {minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity}),
  centers:state.structures.filter(s=>s.kind==='center').map(s=>({id:s.id,x:s.x,z:s.z,
    status:s.status})),repairTasks:state.tasks.filter(t=>t.kind==='repair'),
  nearbyWalls:state.structures.filter(s=>s.kind==='wall'&&s.x>=80&&s.x<=100&&
    s.z>=-5&&s.z<=18).map(s=>({id:s.id,x:s.x,z:s.z,yaw:s.yaw,
      gate:s.gate,status:s.status,hp:s.hp}))}));
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
    console.log(JSON.stringify({target:target.id,workerApproaches:state.workers.map(candidate=>{
      const entry={id:candidate.id,region:session.actorRegions(candidate,{worker:true}).ids,
        direct:result.approaches.map(item=>session.actorStepClear(candidate,item.point,{worker:true}))};
      try{entry.route=repairRoute(candidate,target,nav)?'found':'blocked';}
      catch(error){entry.error=error.name;}
      return entry;
    })}));
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
