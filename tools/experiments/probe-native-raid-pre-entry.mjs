import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {chooseRaidEntry} from '../../src/simulation/raids.js';
import {raidWallEnvelope} from '../../src/simulation/raid-exterior-entry.js';
import {animalSpec,randomInt} from '../../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {wallCollisionFrame} from '../../src/world/wall-collision-frame.js';

const [fixture,output]=process.argv.slice(2);
if(!fixture||!output)throw TypeError(
  'Usage: probe-native-raid-pre-entry.mjs SNAPSHOT.json.gz OUTPUT.json');
const frozen=JSON.parse(gunzipSync(readFileSync(fixture)).toString());
const state=deserialize(frozen.state),before=serialize(state);
if(!state.nightPlan?.group?.length||state.raid)throw Error(
  'Snapshot must contain a pending night raid');
const module=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  for(const key of frozen.navigation.residentChunks){
    const [cx,cz]=key.split(',').map(Number);
    if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
      throw Error(`Failed to load resident chunk ${key}`);
    loaded.set(key,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  const nativeRoute=(start,end,species)=>{
    const route=session.routeActorNative(start,end,{worker:false,species});
    return {status:route.status,reason:route.reason??null,
      graphReason:session.core.wasm.spatial_world_route_graph_reason()};
  };
  nav.setActiveBounds(frozen.navigation.bounds);
  nav.setRaidView(frozen.navigation.view.eye,frozen.navigation.view.target);
  const group=state.nightPlan.group;
  const specs=group.map(id=>({spec:animalSpec(id),
    radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const preferredSide=randomInt({rng:state.rng},0,3);
  const started=performance.now();
  const entry=chooseRaidEntry(state,specs,nav.activeBounds,preferredSide,nav);
  const selectionMs=performance.now()-started;
  const walls=state.structures.filter(item=>item.kind==='wall'&&item.hp>0&&
    item.status!=='collapsing');
  const plants=state.plants.filter(item=>item.alive);
  const widest=specs.reduce((best,spec,index)=>spec.radius>best.radius?
    {...spec,index}:best,{radius:-1,index:0});
  const birth=entry?.entries?.[widest.index];
  const wallFaceCandidates=birth?walls.flatMap(wall=>{
    const frame=wallCollisionFrame(wall),local=point=>({
      x:(point.x-frame.x)*frame.c-(point.z-frame.z)*frame.s,
      z:(point.x-frame.x)*frame.s+(point.z-frame.z)*frame.c});
    const from=local(birth),sign=Math.sign(from.z);
    if(!sign)return [];
    const relevantCrops=plants.filter(crop=>{
      const to=local(crop);
      if(from.z*to.z>=0)return false;
      const crossing=from.x+(to.x-from.x)*(-from.z)/(to.z-from.z);
      return Math.abs(crossing)<=frame.width+widest.radius;
    });
    if(!relevantCrops.length)return [];
    const offset=frame.depth+widest.radius+.6,
      side={x:frame.x+Math.sin(frame.yaw)*offset*sign,
        z:frame.z+Math.cos(frame.yaw)*offset*sign};
    return [{wallId:wall.id,x:wall.x,z:wall.z,side,
      crossedCropCount:relevantCrops.length,
      standable:session.actorCanStand(side,
        {worker:false,species:group[widest.index]}),
      connectivity:nav.regionConnected(birth,side,widest.radius,null,false),
      route:nativeRoute(birth,side,group[widest.index])}];
  }).sort((a,b)=>Math.hypot(a.x-birth.x,a.z-birth.z)-
      Math.hypot(b.x-birth.x,b.z-birth.z)||a.wallId.localeCompare(b.wallId)):[];
  const sampledCrops=birth?plants.slice().sort((a,b)=>
    Math.hypot(a.x-birth.x,a.z-birth.z)-
    Math.hypot(b.x-birth.x,b.z-birth.z)||a.id.localeCompare(b.id))
    .slice(0,24).map(plant=>{
      const radius=widest.radius,offsets=[[0,0],[radius+1,0],
        [-radius-1,0],[0,radius+1],[0,-radius-1]];
      return {id:plant.id,x:plant.x,z:plant.z,
        routes:offsets.map(([dx,dz])=>{
          const end={x:plant.x+dx,z:plant.z+dz};
          return {...nativeRoute(birth,end,group[widest.index]),
            standable:session.actorCanStand(end,
              {worker:false,species:group[widest.index]})};
        })};
    }):[];
  const box=raidWallEnvelope(state,nav),alternateExterior=[];
  if(process.env.WILD_PROBE_ALT_EXTERIOR==='1'&&box){
    const r=widest.radius,margin=r+4;
    for(const fraction of [.2,.5,.8]){
      const x=box[0]+(box[2]-box[0])*fraction,
        z=box[1]+(box[3]-box[1])*fraction;
      for(const point of [{x:box[0]-margin,z},{x:box[2]+margin,z},
        {x,z:box[1]-margin},{x,z:box[3]+margin}]){
        const standable=session.actorCanStand(point,
          {worker:false,species:group[widest.index]});
        const exterior=standable&&nav.spatialExteriorWitness(point,r,box);
        let found=null,queries=0;
        if(exterior)for(const crop of plants.slice().sort((a,b)=>
          Math.hypot(a.x-point.x,a.z-point.z)-
          Math.hypot(b.x-point.x,b.z-point.z)).slice(0,24)){
          for(const [dx,dz] of [[0,0],[r+1,0],[-r-1,0],
            [0,r+1],[0,-r-1]]){
            const end={x:crop.x+dx,z:crop.z+dz};
            if(!session.actorCanStand(end,
              {worker:false,species:group[widest.index]}))continue;
            const route=nativeRoute(point,end,group[widest.index]);queries++;
            if(route.status==='found'){found={cropId:crop.id,end};break;}
          }
          if(found)break;
        }
        alternateExterior.push({point,standable,exterior,queries,found});
      }
    }
  }
  if(serialize(state)!==before)throw Error('Entry query changed the game state');
  const report={biome:frozen.biome,seed:frozen.seed,day:state.day,
    time:state.time,raidAt:state.nightPlan.at,group,
    residentChunks:loaded.size,bounds:nav.activeBounds,
    view:nav.raidView,preferredSide,selectionMs,
    wallEnvelope:box,entry,
    livingCrops:plants.length,intactWalls:walls.length,
    nearestWalls:birth?walls.slice().sort((a,b)=>
      Math.hypot(a.x-birth.x,a.z-birth.z)-
      Math.hypot(b.x-birth.x,b.z-birth.z)||a.id.localeCompare(b.id))
      .slice(0,12).map(({id,x,z,hp,status})=>({id,x,z,hp,status})):[],
    wallFaceCandidates,sampledCrops,alternateExterior};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({day:report.day,time:report.time,
    raidAt:report.raidAt,animals:group.length,
    entryCount:entry?.entries?.length??0,selectionMs,
    sampledCrops:sampledCrops.length,
    wallFaceCandidates:wallFaceCandidates.length,
    reachableRelevantWalls:wallFaceCandidates.filter(row=>row.route.status==='found').length,
    alternateExteriorFound:alternateExterior.filter(row=>row.found).length,
    foundCropSamples:sampledCrops.reduce((n,crop)=>n+
      crop.routes.filter(route=>route.status==='found').length,0)}));
}finally{session.dispose();}
