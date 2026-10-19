// Read-only diagnosis of native attack targets in a frozen active raid.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {raidWallEnvelope} from '../../src/simulation/raid-exterior-entry.js';
import {prepareExteriorDetour,detourRaidFormation} from '../../src/simulation/raid-exterior-detour.js';
import {exteriorGroupWitness} from '../../src/simulation/raid-exterior-connectivity.js';

const [fixture,out,radiusArg='2']=process.argv.slice(2);
if(!fixture||!out)throw Error('Usage: probe-frozen-raid-targets.mjs STATE.json[.gz] OUTPUT.json [residentRadius]');
const residentRadius=Number(radiusArg);
if(!Number.isInteger(residentRadius)||residentRadius<1||residentRadius>8)throw RangeError('Invalid resident radius');
const bytes=readFileSync(fixture),state=deserialize((fixture.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
const before=serialize(state),module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
  for(let z=cz-residentRadius;z<=cz+residentRadius;z++)
    for(let x=cx-residentRadius;x<=cx+residentRadius;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
  const nav=createSpatialNavigationMovement(session,state),bounds=[
    (cx-residentRadius)*48-24,(cz-residentRadius)*48-24,
    (cx+residentRadius)*48+24,(cz+residentRadius)*48+24];
  nav.setActiveBounds(bounds);
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(state);planner.nativeWallSelectionEnabled=true;
  const wallBox=raidWallEnvelope(state,nav);
  const representatives=[...new Map(state.raid.animals.map(a=>[a.species,a])).values()];
  const rows=[];
  for(const animal of representatives){
    const crop=planner.planAttackCrop(state,animal),wall=planner.planAttackWall(state,animal);
    const sides=nav.spatialRelevantWallApproachSides(animal,animal.radius);
    const nearest=sides.slice().sort((a,b)=>
      Math.hypot(a.x-animal.x,a.z-animal.z)-Math.hypot(b.x-animal.x,b.z-animal.z)).slice(0,8);
    const exteriorCandidates=nearest.slice(0,4).map(side=>{
      const edge=nav.spatialExteriorEdge(side,animal.radius,wallBox);
      const proof=edge?prepareExteriorDetour(side,animal.radius,wallBox,nav,
        (point,r,box)=>!!nav.spatialExteriorEdge(point,r,box),[edge]):null;
      const formation=proof?detourRaidFormation(proof,state.raid.animals.map(a=>({radius:a.radius})),bounds,nav):null;
      const groupExterior=formation?exteriorGroupWitness(formation,
        state.raid.animals.map(a=>({radius:a.radius})),wallBox,nav,
        (point,r,box)=>!!nav.spatialExteriorEdge(point,r,box)):false;
      const routesToSide=formation?.entries.map((point,index)=>
        nav.spatialRouteStatus(point,side,state.raid.animals[index].radius))??null;
      let greedyCount=0;
      if(proof){
        const selected=[];
        for(const actor of state.raid.animals){
          let choice=null;
          for(let i=0;i<proof.points.length&&!choice;i++){
            const p=proof.points[i];
            if(!nav.walkable(p.x,p.z,actor.radius,null,false)||
              selected.some(q=>Math.hypot(q.p.x-p.x,q.p.z-p.z)<=q.radius+actor.radius+1))continue;
            for(let j=i+1;j<proof.points.length;j++){
              const q=proof.points[j],d=Math.hypot(q.x-p.x,q.z-p.z);
              if(d<3)continue;if(d>6)break;
              if(nav.walkable(q.x,q.z,actor.radius,null,false)&&
                nav.segmentClear(p,q,actor.radius,null,false)){choice=p;break;}
            }
          }
          if(!choice)break;
          selected.push({p:choice,radius:actor.radius});greedyCount++;
        }
      }
      return {wallId:side.wallId,side:{x:side.x,z:side.z},edge,
        edgeRoute:edge?nav.spatialRouteStatus(edge,side,animal.radius):null,
        proofPoints:proof?.points.length??0,formation:formation?.entries??null,greedyCount,
        groupExterior,routesToSide,
        proofHead:proof?.points.slice(0,8)??null,
        proofTail:proof?.points.slice(-8)??null,
        proofLength:proof?.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-proof.points[i].x,p.z-proof.points[i].z),0)??0};
    });
    const wasm=session.core.wasm;
    rows.push({actorId:animal.id,species:animal.species,position:{x:animal.x,z:animal.z},
      region:session.actorRegions(animal,{worker:false,species:animal.species}),
      crop,wall,relevantWallSides:sides.length,
      birthExteriorEdge:nav.spatialExteriorEdge(animal,animal.radius,wallBox),
      exteriorCandidates,
      nearbySides:nearest.map(side=>{
        const status=nav.spatialRouteStatus(animal,side,animal.radius);
        return {wallId:side.wallId,groupId:side.groupId,
          x:side.x,z:side.z,status,
          routeReason:wasm.spatial_world_route_reason(),
          graphReason:wasm.spatial_world_route_graph_reason(),
          frontier:wasm.lazy_connected_frontier_valid()?{
            x:wasm.lazy_connected_frontier_x(),z:wasm.lazy_connected_frontier_z()}:null};
      })});
  }
  const cropAccessSamples=[];
  if(process.env.WILD_PROBE_CROP_ACCESS==='1'){
    const animal=representatives.find(a=>a.species==='warthog')??representatives[0];
    const center=state.structures.find(s=>s.kind==='center'&&s.hp>0);
    for(const dx of [-10,-8,-6,-4,-2,0,2,4,6,8,10])
      for(const dz of [-12,-8,-4,0,4,8,12]){
        const point={x:center.x+dx,z:center.z+dz};
        if(!nav.walkable(point.x,point.z,animal.radius,null,false))continue;
        const result=planner.planAttackCrop(state,{...animal,...point});
        cropAccessSamples.push({point,status:result?.status??'none',
          targetId:result?.target?.id??null,
          exteriorEdge:nav.spatialExteriorEdge(point,animal.radius,wallBox),
          diagnostics:result?.diagnostics??null});
        if(result?.status==='found')planner.cancelAttackIntent(animal.id);
      }
  }
  if(serialize(state)!==before)throw Error('Read-only raid probe changed the JS game state');
  const report={fixture,day:state.day,time:state.time,residentRadius,bounds,wallBox,
    animals:state.raid.animals.length,livingCrops:state.plants.filter(p=>p.alive).length,
    intactWalls:state.structures.filter(s=>s.kind==='wall'&&s.hp>0).length,
    rows,cropAccessSamples};
  writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(rows.map(({actorId,species,region,crop,wall,relevantWallSides,nearbySides})=>({
    actorId,species,region,crop:{status:crop?.status,diagnostics:crop?.diagnostics},
    wall:{status:wall?.status,candidatesExamined:wall?.candidatesExamined,routeQueries:wall?.routeQueries},
    relevantWallSides,nearbySides:nearbySides.map(s=>s.status)}))));
}finally{session.dispose();}
