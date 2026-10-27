import {readFileSync,writeFileSync} from 'node:fs';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';
import {containsPoint} from '../../src/world/footprints.js';
import {wallCollisionPolygon} from '../../src/world/wall-collision-frame.js';

const input=process.argv[2];
if(!input)throw Error('Usage: diagnose-spatial-raid-stall <saved-state.json>');
const state=deserialize(readFileSync(input,'utf8'));
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48);
  for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    session.core.selectChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  for(const animal of state.raid?.animals??[]){
    const ax=Math.floor((animal.x+24)/48),az=Math.floor((animal.z+24)/48);
    for(let z=az-1;z<=az+1;z++)for(let x=ax-1;x<=ax+1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      session.core.selectChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
  }
  const nav=createSpatialNavigationMovement(session,state),rows=[];
  for(const animal of state.raid?.animals??[]){
    if(animal.status==='gone')continue;
    const next=animal.path?.[0],blockers=actorBlockers(state,animal,false);
    rows.push({id:animal.id,species:animal.species,status:animal.status,
      hitsRemaining:animal.hitsRemaining,x:animal.x,z:animal.z,
      next:next??null,staticClear:next?nav.segmentClear(animal,next,
        animal.radius,null,false):null,
      dynamicClear:next?actorSegmentClear(animal,next,animal,blockers):null,
      standing:nav.walkable(animal.x,animal.z,animal.radius,null,false),
      standGrid:Array.from({length:7},(_,j)=>Array.from({length:7},(_,i)=>
        nav.walkable(animal.x+i-3,animal.z+j-3,animal.radius,null,false)?1:0)),
      nearProps:[...loaded.values()].flatMap(chunk=>(chunk.instances??[]).flat())
        .filter(p=>Math.hypot(p.x-animal.x,p.z-animal.z)<5)
        .map(p=>({id:p.id,x:p.x,z:p.z,kind:p.kind,radius:p.radius})),
      nearWalls:state.structures.filter(b=>b.kind==='wall'&&
        Math.hypot(b.x-animal.x,b.z-animal.z)<5).map(b=>({
          id:b.id,x:b.x,z:b.z,status:b.status,hp:b.hp,gate:b.gate})),
      overlappingWalls:nav.obstacles.filter(o=>o.kind==='wall'&&!o.gate&&
        containsPoint(wallCollisionPolygon(o,animal.radius),animal.x,animal.z))
        .map(o=>o.id),
      nearBuildings:state.structures.filter(b=>b.kind!=='wall'&&
        Math.hypot(b.x-animal.x,b.z-animal.z)<8).map(b=>({
          id:b.id,kind:b.kind,x:b.x,z:b.z,status:b.status})),
      localExits:Array.from({length:16},(_,i)=>{
        const angle=i*Math.PI/8,point={x:animal.x+Math.cos(angle)*2,
          z:animal.z+Math.sin(angle)*2};
        return {angle:i,point,walkable:nav.walkable(point.x,point.z,
          animal.radius,null,false),clear:nav.segmentClear(animal,point,
          animal.radius,null,false)};
      }).filter(candidate=>candidate.walkable||candidate.clear),
      blockers:blockers.filter(other=>Math.hypot(other.x-animal.x,
        other.z-animal.z)<animal.radius+(other.radius??.28)+2)
        .map(other=>({id:other.id,x:other.x,z:other.z,
          status:other.status}))});
  }
  const report={day:state.day,time:state.time,rows};
  if(process.argv[3])writeFileSync(process.argv[3],
    JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({day:report.day,time:report.time,
    animals:report.rows.length,output:process.argv[3]??null}));
}finally{session.dispose();}
