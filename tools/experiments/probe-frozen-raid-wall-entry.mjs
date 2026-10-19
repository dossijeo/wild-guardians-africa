// Read-only probe of an attack-side route and complete wave formation.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {raidWallEnvelope} from '../../src/simulation/raid-exterior-entry.js';
import {prepareExteriorDetour,detourRaidFormation} from '../../src/simulation/raid-exterior-detour.js';

const fixture=process.argv[2];
if(!fixture)throw Error('Pass a frozen raid state');
const state=deserialize(gunzipSync(readFileSync(fixture)).toString());
const module=new WebAssembly.Module(readFileSync(
  'src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state),
    bounds=[(cx-4)*48-24,(cz-4)*48-24,
      (cx+4)*48+24,(cz+4)*48+24],
    center=state.structures.find(item=>item.kind==='center'&&item.hp>0),
    eye={x:99.70247532024266,z:30.57367599590944};
  nav.setActiveBounds(bounds);nav.setRaidView(eye,center);
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(state);
  const box=raidWallEnvelope(state,nav),
    specs=state.raid.animals.map(item=>({radius:item.radius})),
    radius=Math.max(...specs.map(item=>item.radius)),
    sides=nav.spatialRelevantWallApproachSides(eye,radius),rows=[];
  for(const side of sides.slice(0,24)){
    const edge=nav.spatialExteriorEdge(side,radius,box);
    if(!edge){rows.push({wallId:side.wallId,exterior:false});continue;}
    const witness=(point,r,wallBox)=>!!nav.spatialExteriorEdge(point,r,wallBox);
    const proof=prepareExteriorDetour(side,radius,box,nav,witness,[edge]);
    const entry=proof&&detourRaidFormation(proof,specs,bounds,nav);
    rows.push({wallId:side.wallId,groupId:side.groupId,
      side:{x:side.x,z:side.z},exterior:true,edge,
      points:proof?.points.length??0,entryCount:entry?.entries.length??0,
      attackRoutes:entry?.entries.filter((point,index)=>
        nav.spatialRouteStatus(point,side,specs[index].radius)==='found').length??0,
      entryRegions:entry?.entries.map((point,index)=>{
        nav.spatialRouteStatus(point,point,specs[index].radius);
        return session.core.wasm.lazy_weak_region(Math.round(point.x),
          Math.round(point.z));
      })??[],
      relevantToWall:entry?.entries.filter((point,index)=>
        nav.spatialRelevantWallApproachSides(point,specs[index].radius)
          .some(candidate=>candidate.wallId===side.wallId)).length??0,
      firstEntry:entry?.entries[0]??null});
  }
  console.log(JSON.stringify({day:state.day,time:state.time,
    animals:specs.length,bounds,eye,box,sideCount:sides.length,rows},null,2));
}finally{session.dispose();}
