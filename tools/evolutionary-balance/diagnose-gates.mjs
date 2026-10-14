// Read-only QA probe for a native partial-state snapshot. No game commands.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';

export function diagnoseGates(snapshot,wasm){
 const state=deserialize(snapshot),loaded=new Map();
 const session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
 });
 try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
  for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([(cx-1)*48-24,(cz-1)*48-24,(cx+1)*48+24,(cz+1)*48+24]);
  const probe=(a,b)=>{
   try{const path=nav.path(a,b,.28,null,true);return {found:!!path,points:path?.length??0};}
   catch(error){return {error:error.name,reason:error.details?.routeReason??null};}
  };
  const gates=state.structures.filter(s=>s.kind==='wall'&&s.gate).map(g=>{
   const points=gatePortalPoints(g,.28);
   return {id:g.id,x:g.x,z:g.z,hp:g.hp,status:g.status,gateOpen:g.gateOpen,
    points,crossing:points.length===2?probe(points[0],points[1]):null,
    sideRegions:points.map(point=>nav.regionFor(point,.28)),
    regionConnected:points.length===2?nav.regionConnected(points[0],points[1],.28):null,
    physicallyClear:points.length===2?nav.segmentClear(points[0],points[1],.28,null,true):null};
  });
  const workers=state.workers.filter(w=>['fleeing','arriving'].includes(w.status)).slice(0,6).map(w=>{
   const center=state.structures.find(s=>s.id===w.centerId),home=state.villages.find(v=>v.id===w.villageId);
   const target=w.status==='fleeing'?(home.entry??home):center;
   return {id:w.id,status:w.status,x:w.x,z:w.z,target:{x:target.x,z:target.z},route:probe(w,target)};
  });
  return {gates,workers};
 }finally{session.dispose();}
}

if(process.argv[1]?.endsWith('diagnose-gates.mjs')){
 const path=process.argv[2];if(!path)throw Error('Expected gzipped snapshot');
 const wasm=new WebAssembly.Module(readFileSync(new URL('../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
 console.log(JSON.stringify(diagnoseGates(gunzipSync(readFileSync(path)).toString(),wasm),null,2));
}
