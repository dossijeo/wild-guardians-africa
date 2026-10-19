// Diagnostic only: find resident-boundary routes for a frozen animal profile.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../../src/simulation/raid-exterior-entry.js';

const [fixture,actorId,xText,zText]=process.argv.slice(2);
if(!fixture||!actorId||!Number.isFinite(+xText)||!Number.isFinite(+zText))
  throw Error('Usage: scan-frozen-raid-exterior.mjs SAVE.gz ACTOR_ID X Z');
const state=deserialize(gunzipSync(readFileSync(fixture)).toString());
const actor=state.raid?.animals.find(item=>item.id===actorId);
if(!actor)throw Error(`Unknown actor ${actorId}`);
const start={x:+xText,z:+zText};
const binary=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??
  'src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(binary,state,{
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
    box=raidWallEnvelope(state,nav),inset=actor.radius+2,
    wasm=session.core.wasm;
  nav.setActiveBounds(bounds);
  nav.spatialRouteStatus(start,start,actor.radius);
  const candidates=[];
  for(let x=bounds[0]+inset;x<=bounds[2]-inset;x+=8)
    for(const z of [bounds[1]+inset,bounds[3]-inset])
      candidates.push({x,z});
  for(let z=bounds[1]+inset;z<=bounds[3]-inset;z+=8)
    for(const x of [bounds[0]+inset,bounds[2]-inset])
      candidates.push({x,z});
  const rows=[];let walkable=0,connected=0;
  for(const point of candidates){
    if(!nav.walkable(point.x,point.z,actor.radius,null,false))continue;
    walkable++;
    const region=wasm.lazy_weak_region(Math.round(point.x),Math.round(point.z)),
      link=wasm.lazy_connected(Math.round(start.x),Math.round(start.z),
        Math.round(point.x),Math.round(point.z));
    if(link!==1)continue;
    connected++;
    const route=nav.spatialRouteStatus(start,point,actor.radius);
    if(route==='found')rows.push({point,region,route});
  }
  console.log(JSON.stringify({fixture,actorId,start,box,bounds,
    exterior:exteriorRaidWitness(start,actor.radius,box,nav),
    candidates:candidates.length,walkable,connected,
    reachable:rows.length,sites:rows.slice(0,20)},null,2));
}finally{session.dispose();}
