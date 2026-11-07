import fs from 'node:fs';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const capturePath=process.env.DYNAMIC_REPLAY_CAPTURE,binary=process.env.CENTRAL_MOBILITY_WASM,tracePath=process.env.CENTRAL_TRACE;if(!capturePath||!binary||!tracePath)throw Error('Set DYNAMIC_REPLAY_CAPTURE, CENTRAL_MOBILITY_WASM and CENTRAL_TRACE');
const capture=JSON.parse(fs.readFileSync(capturePath,'utf8')),fixture=JSON.parse(fs.readFileSync(tracePath,'utf8')),module=new WebAssembly.Module(fs.readFileSync(binary));
function run(native){
 const state=structuredClone(capture.state),loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
 try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  for(const options of [{worker:true},{worker:false,species:'warthog'}])session.actorSectorRevision(options);
  const bodies=structuredClone(fixture.initialBodies),byId=new Map(bodies.map(b=>[b.id,b])),game={workers:bodies.filter(b=>b.kind===0),raid:{animals:bodies.filter(b=>b.kind===1)}};
  const terrain=(a,b)=>{const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.25));let x=a.x,z=a.z;for(let i=1;i<=count;i++){const nx=a.x+(b.x-a.x)*i/count,nz=a.z+(b.z-a.z)*i/count;if(!wasm.spatial_local_clear(x,z,nx,nz))return false;x=nx;z=nz;}return true;};
  const totalStart=performance.now();if(native){wasm.spatial_bodies_reset();for(const b of bodies)if(!wasm.spatial_body_upsert(b.id,b.x,b.z,b.radius,b.kind,b.flags))throw Error('Body publication failed');}const setupMs=performance.now()-totalStart,values=[];
  for(const batch of fixture.trace){
   const started=performance.now();let actual=[];
   if(native){const count=batch.input.length/5,ptr=wasm.spatial_mobility_input_ptr(count);new Float64Array(wasm.memory.buffer,ptr,batch.input.length).set(batch.input);if(wasm.spatial_mobility_step(count)!==count)throw Error('Batch rejected');actual=Array.from(new Float64Array(wasm.memory.buffer,wasm.spatial_mobility_output_ptr(),batch.input.length));for(let i=0;i<actual.length;i+=5){const actor=byId.get(actual[i]);actor.x=actual[i+2];actor.z=actual[i+3];}}
   else for(let i=0;i<batch.input.length;i+=5){const actor=byId.get(batch.input[i]),gx=batch.input[i+1],gz=batch.input[i+2],budget=batch.input[i+3],profile=batch.input[i+4],dx=gx-actor.x,dz=gz-actor.z,length=Math.hypot(dx,dz),travel=Math.min(length,budget),end=length?{x:actor.x+dx*travel/length,z:actor.z+dz*travel/length}:{x:actor.x,z:actor.z};let clear=true,status=1;if(budget>0){wasm.spatial_select_nav_profile_index(profile);clear=terrain(actor,end)&&actorSegmentClear(actor,end,actor,actorBlockers(game,actor,actor.kind===0));status=clear?(travel>=length?2:1):0;}actual.push(actor.id,status,clear?end.x:actor.x,clear?end.z:actor.z,clear?travel:0);if(clear&&budget>0){actor.x=end.x;actor.z=end.z;}}
   values.push(performance.now()-started);if(actual.length!==batch.expected.length||actual.some((value,i)=>Math.abs(value-batch.expected[i])>1e-8))throw Error('Replay output changed');
  }
  values.sort((a,b)=>a-b);return {variant:native?'native-batch':'js-reference',setupMs,totalMs:setupMs+values.reduce((a,b)=>a+b,0),batches:values.length,p95:values[Math.floor(values.length*.95)],p99:values[Math.floor(values.length*.99)],max:values.at(-1)};
 }finally{session.dispose();}
}
const blocks=[false,true,true,false].map(run),output={scope:'Independent-session ABBA of captured body snapshot and synthetic ordered single-segment commands. Includes body publication, command copy and returned position projection for native batch; excludes full game simulation, detours, coordination, render and GPU. Per-batch percentiles are not frame percentiles.',parity:true,bodies:fixture.initialBodies.length,commands:fixture.trace.reduce((n,b)=>n+b.input.length/5,0),blocks};
console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
