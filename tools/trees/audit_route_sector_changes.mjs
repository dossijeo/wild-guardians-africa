import fs from 'node:fs';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {RouteSectorIndex} from './prototype_route_sector_index.mjs';

const capture=process.env.DYNAMIC_REPLAY_CAPTURE,wasmPath=process.env.SECTOR_TRACE_WASM;
if(!capture||!wasmPath)throw Error('Set DYNAMIC_REPLAY_CAPTURE and SECTOR_TRACE_WASM');
const saved=JSON.parse(fs.readFileSync(capture,'utf8')).state;
const module=new WebAssembly.Module(fs.readFileSync(wasmPath)),results=[];
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const state=structuredClone(saved);state.biome=biome;state.raid=null;state.mangroveNetwork=biome==='manglares';if(state.mangroveNetwork)state.mangroveSettlementVersion=2;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm,v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);
 try{
  for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const profiles=[{worker:true,radius:.28},{worker:false,species:'warthog',radius:.65},{worker:false,species:'lion',radius:.8}],routes=[],indices=new Map();
  for(const options of profiles){
   session.actorSectorRevision(options);const profile=wasm.lazy_selected_context(),index=new RouteSectorIndex(12);indices.set(profile,index);
   for(let i=0;i<64;i++){
    const start={x:v.x-24+(i%8)*6,z:v.z-24+Math.floor(i/8)*6},end={x:start.x+12,z:start.z+6},route=session.routeActorNative(start,end,options);
    if(route.status!=='found')continue;
    const id=routes.length;routes.push({id,profile,options,start,points:route.points});index.set(id,start,route.points,options.radius);
   }
  }
  let barrier;
  for(const phase of ['wall-added','wall-removed','chunk-removed','chunk-restored']){
   wasm.lazy_sector_change_trace_clear();
   if(phase==='wall-added'){barrier=session.core.addOrientedBarrier(v.x+4,v.z+3,.4,2,0,0);if(barrier<=0)throw Error('Barrier creation failed');}
   if(phase==='wall-removed'&&!session.core.removeBarrier(barrier))throw Error('Barrier removal failed');
   if(phase==='chunk-removed'){session.core.selectChunk(cx,cz);if(!session.core.removeChunk(cx+1,cz+1))throw Error('Chunk removal failed');loaded.delete(`${cx+1},${cz+1}`);}
   if(phase==='chunk-restored'){if(session.core.addChunk(cx+1,cz+1)<0)throw Error('Chunk restoration failed');session.core.selectChunk(cx+1,cz+1);loaded.set(`${cx+1},${cz+1}`,session.core.chunkPayload());}
   const count=wasm.lazy_sector_change_trace_count(),values=Array.from(new Int32Array(wasm.memory.buffer,wasm.lazy_sector_change_trace_ptr(),count*4)),events=[];
   for(let i=0;i<values.length;i+=4)events.push({profile:values[i],kind:values[i+1],x:values[i+2],z:values[i+3]});
   const candidates=new Set();
   for(const [profile,index] of indices){const relevant=events.filter(e=>e.profile===profile);for(const id of index.affected({complete:!relevant.some(e=>e.kind===0),sectors:relevant.filter(e=>e.kind!==0)}))candidates.add(id);}
   let invalid=0,missed=0;
   for(const route of routes){session.actorSectorRevision(route.options);let from=route.start,clear=!!wasm.spatial_local_clear(from.x,from.z,from.x,from.z);for(const to of route.points){if(!wasm.spatial_world_segment_clear(from.x,from.z,to.x,to.z)){clear=false;break;}from=to;}if(!clear){invalid++;if(!candidates.has(route.id))missed++;}}
   const row={biome,phase,routes:routes.length,events:events.length,globalEvents:events.filter(e=>e.kind===0).length,candidates:candidates.size,invalid,missed};results.push(row);console.log(JSON.stringify(row));
  }
 }finally{session.dispose();}
}
if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify({scope:'Shadow sector index against native static segment checks; synthetic routes from one captured state across six biome configurations, no actor progression or timing. Trace completeness and padding are unproven.',results},null,2)+'\n');
