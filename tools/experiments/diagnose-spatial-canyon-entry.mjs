import {readFileSync,writeFileSync} from 'node:fs';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {chooseRaidEntry,reachableApproach} from '../../src/simulation/raids.js';
import {canyonRaidFormation} from '../../src/simulation/canyon-raid-formation.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../../src/simulation/raid-exterior-entry.js';
import {canyonFrame} from '../../src/world/terrain.js';

const [input,output]=process.argv.slice(2);
if(!input)throw Error('Usage: diagnose-spatial-canyon-entry <state.json> [report.json]');
const state=deserialize(readFileSync(input,'utf8'));
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
});
try{
  const bounds=[-120,72,120,312],expanded=[-144,48,144,336];
  for(let z=1;z<=7;z++)for(let x=-3;x<=3;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds(bounds);
  nav.setRaidView({x:-18,z:204.33851813332714},{x:-18,z:169.5});
  const specs=state.nightPlan.group.map(id=>({
    radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const targets=[...state.structures.filter(s=>(s.kind==='center'||s.kind==='wall')&&s.hp>0&&s.status!=='collapsing'),...state.plants.filter(p=>p.alive)];
  const geometryOnly=canyonRaidFormation(state,specs,bounds,nav,()=>true);
  const point=geometryOnly?.entries[0];
  const nearest=point?targets.map(t=>({id:t.id,kind:t.kind,x:t.x,z:t.z,
    distance:Math.hypot(t.x-point.x,t.z-point.z),
    reachable:!!reachableApproach({...point,radius:specs[0].radius},t,nav)}))
    .sort((a,b)=>a.distance-b.distance).slice(0,12):[];
  const bankProbes=[];
  for(const direction of [-1,1])for(const side of [1,-1])
    for(let row=0;row<8;row++){
      const z=(direction<0?149.78:167.04)+direction*(12+row*4.6),
        x=nav.field.riverX(z)+side*(canyonFrame(nav.field,z,side).waterHalf+specs[0].radius+2.5),
        candidate={x,z},exit={x:nav.field.riverX(z+direction*3)+side*(canyonFrame(nav.field,z+direction*3,side).waterHalf+specs[0].radius+2.5),z:z+direction*3};
      const walkable=nav.walkable(x,z,specs[0].radius,null,false),
        clear=walkable&&nav.segmentClear(candidate,exit,specs[0].radius,null,false);
      bankProbes.push({direction,side,row,x,z,walkable,clear,
        exterior:clear?exteriorRaidWitness(candidate,specs[0].radius,raidWallEnvelope(state,nav),nav):false,
        target:clear?targets.find(t=>reachableApproach({...candidate,radius:specs[0].radius},t,nav))?.id??null:null});
    }
  const north=bankProbes.find(p=>p.direction===1&&p.side===1&&p.row===0),
    northZ=bounds[3]-specs[0].radius-2,
    northX=nav.field.riverX(northZ)+canyonFrame(nav.field,northZ,1).waterHalf+specs[0].radius+2.5,
    northEdge={x:northX,z:northZ};
  const edgeProbes=[];
  for(let n=0;n<=56;n++)for(const edge of ['north','south','east','west']){
    const along=-112+n*4,
      candidate=edge==='north'?{x:along,z:308.45}:edge==='south'?{x:along,z:75.55}:
        edge==='east'?{x:116.45,z:192+along}:{x:-116.45,z:192+along};
    if(!nav.walkable(candidate.x,candidate.z,specs[0].radius,null,false))continue;
    edgeProbes.push({edge,...candidate,connected:nav.regionConnected(north,candidate,specs[0].radius,null,false)});
  }
  const initial=process.argv[4]?JSON.parse(readFileSync(process.argv[4],'utf8')):null;
  const initialEntries=initial?.checks.filter(c=>c.species==='rhino'&&c.witness)
    .map(c=>({distance:c.distance,point:c.witness.entry}))??[];
  const originalLandRoutes=initialEntries.map(({distance,point:entry})=>({distance,entry,
    walkable:nav.walkable(entry.x,entry.z,specs[0].radius,null,false),
    exterior:exteriorRaidWitness(entry,specs[0].radius,raidWallEnvelope(state,nav),nav),
    targets:targets.map(t=>({id:t.id,distance:Math.hypot(t.x-entry.x,t.z-entry.z),
      reachable:!!reachableApproach({...entry,radius:specs[0].radius},t,nav)}))
      .filter(t=>t.reachable).sort((a,b)=>a.distance-b.distance).slice(0,5)}));
  const report={day:state.day,biome:state.biome,radius:specs[0].radius,
    bounds,wallEnvelope:raidWallEnvelope(state,nav),
    riverAtFarm:nav.field.riverX(state.villages[0].z),
    farm:state.villages[0].center,nearest,bankProbes,edgeProbes,originalLandRoutes,
    northEdge:{...northEdge,walkable:nav.walkable(northX,northZ,specs[0].radius,null,false),
      route:!!nav.path(north,northEdge,specs[0].radius,null,false)},
    baseline:chooseRaidEntry(state,specs,bounds,0,nav),
    canyonFormation:canyonRaidFormation(state,specs,bounds,nav,reachableApproach),
    geometryOnly,
    expandedGeometryOnly:canyonRaidFormation(state,specs,expanded,nav,()=>true)};
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{session.dispose();}
