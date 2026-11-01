import fs from 'node:fs';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {RouteSectorIndex} from './prototype_route_sector_index.mjs';

const capture=process.env.DYNAMIC_REPLAY_CAPTURE,wasmPath=process.env.SECTOR_TRACE_WASM;
if(!capture||!wasmPath)throw Error('Set DYNAMIC_REPLAY_CAPTURE and SECTOR_TRACE_WASM');
const saved=JSON.parse(fs.readFileSync(capture,'utf8')).state;
const module=new WebAssembly.Module(fs.readFileSync(wasmPath)),results=[],progress=process.env.ROUTE_PROGRESS==='1',benchmark=process.env.ROUTE_BENCHMARK==='1';
for(const biome of benchmark?['sabana']:['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
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
   // Independent synthetic snapshots, not a simulated actor trajectory. Only
   // begin with routes physically valid before this event; advance along the
   // first segment and simulate some local paths with unverified suffixes.
   const snapshots=[];
   if(progress){
    for(const index of indices.values())for(const id of [...index.routes.keys()])index.remove(id);
    for(const route of routes){
     session.actorSectorRevision(route.options);let from=route.start,clear=!!wasm.spatial_local_clear(from.x,from.z,from.x,from.z);
     for(const point of route.points){if(!wasm.spatial_world_segment_clear(from.x,from.z,point.x,point.z)){clear=false;break;}from=point;}
     if(!clear)continue;
     const first=route.points[0],fraction=route.id%2?.35:.7,start={x:route.start.x+(first.x-route.start.x)*fraction,z:route.start.z+(first.z-route.start.z)*fraction};
     const verified=route.id%10!==0;
     snapshots.push({...route,start,verified});indices.get(route.profile).set(route.id,start,route.points,route.options.radius,{verified});
    }
   }
   wasm.lazy_sector_change_trace_clear();
   if(phase==='wall-added'){barrier=session.core.addOrientedBarrier(v.x+4,v.z+3,.4,2,0,0);if(barrier<=0)throw Error('Barrier creation failed');}
   if(phase==='wall-removed'&&!session.core.removeBarrier(barrier))throw Error('Barrier removal failed');
   if(phase==='chunk-removed'){session.core.selectChunk(cx,cz);if(!session.core.removeChunk(cx+1,cz+1))throw Error('Chunk removal failed');loaded.delete(`${cx+1},${cz+1}`);}
   if(phase==='chunk-restored'){if(session.core.addChunk(cx+1,cz+1)<0)throw Error('Chunk restoration failed');session.core.selectChunk(cx+1,cz+1);loaded.set(`${cx+1},${cz+1}`,session.core.chunkPayload());}
   const count=wasm.lazy_sector_change_trace_count(),values=Array.from(new Int32Array(wasm.memory.buffer,wasm.lazy_sector_change_trace_ptr(),count*4)),events=[];
   for(let i=0;i<values.length;i+=4)events.push({profile:values[i],kind:values[i+1],x:values[i+2],z:values[i+3]});
   const candidates=new Set();
   for(const [profile,index] of indices){const relevant=events.filter(e=>e.profile===profile);for(const id of index.affected({complete:!relevant.some(e=>e.kind===0),sectors:relevant.filter(e=>e.kind!==0)}))candidates.add(id);}
   let invalid=0,missed=0;const invalidIds=[];
   for(const route of progress?snapshots:routes){session.actorSectorRevision(route.options);let from=route.start,clear=!!wasm.spatial_local_clear(from.x,from.z,from.x,from.z);for(const to of route.points){if(!wasm.spatial_world_segment_clear(from.x,from.z,to.x,to.z)){clear=false;break;}from=to;}if(!clear||route.verified===false){invalid++;invalidIds.push(route.id);if(!candidates.has(route.id))missed++;}}
   const row={biome,phase,routes:progress?snapshots.length:routes.length,unverified:progress?snapshots.filter(r=>!r.verified).length:0,events:events.length,globalEvents:events.filter(e=>e.kind===0).length,candidates:candidates.size,invalid,missed};results.push(row);console.log(JSON.stringify(row));
   if(benchmark){
    const active=progress?snapshots:routes,run=(indexed)=>{
     const started=performance.now(),selected=new Set();
     if(indexed){
      const trial=new Map();for(const route of active){let index=trial.get(route.profile);if(!index)trial.set(route.profile,index=new RouteSectorIndex(12));index.set(route.id,route.start,route.points,route.options.radius,{verified:route.verified!==false});}
      for(const [profile,index] of trial){const relevant=events.filter(e=>e.profile===profile);for(const id of index.affected({complete:!relevant.some(e=>e.kind===0),sectors:relevant.filter(e=>e.kind!==0)}))selected.add(id);}
     }
     const failures=[];for(const route of active){if(indexed&&!selected.has(route.id))continue;session.actorSectorRevision(route.options);let from=route.start,clear=!!wasm.spatial_local_clear(from.x,from.z,from.x,from.z);for(const to of route.points){if(!wasm.spatial_world_segment_clear(from.x,from.z,to.x,to.z)){clear=false;break;}from=to;}if(!clear||route.verified===false)failures.push(route.id);}
     return {ms:performance.now()-started,failures};
    };
    const blocks=[];for(const indexed of [false,true,true,false]){const times=[];for(let i=0;i<20;i++){const measured=run(indexed);if(JSON.stringify(measured.failures)!==JSON.stringify(invalidIds))throw Error('Benchmark candidate changed the invalid route set');times.push(measured.ms);}times.sort((a,b)=>a-b);blocks.push({indexed,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1)});}row.benchmark={iterations:20,blocks};
   }
  }
 }finally{session.dispose();}
}
if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify({scope:benchmark?'Synthetic same-session ABBA; each candidate rebuilds the JS index for one event and checks its candidates, baseline checks all routes. Includes native segment calls but not mutation, movement, simulation, rendering or GPU; order, warmup and GC affect times.':progress?'Independent synthetic progress snapshots and conservative unverified suffixes, against native segment checks; not a simulation or timing. Trace completeness and padding are unproven.':'Shadow sector index against native static segment checks; synthetic routes from one captured state across six biome configurations, no actor progression or timing. Trace completeness and padding are unproven.',results},null,2)+'\n');
