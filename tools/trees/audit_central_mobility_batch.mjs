import fs from 'node:fs';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const capturePath=process.env.DYNAMIC_REPLAY_CAPTURE,binary=process.env.CENTRAL_MOBILITY_WASM;if(!capturePath||!binary)throw Error('Set DYNAMIC_REPLAY_CAPTURE and CENTRAL_MOBILITY_WASM');
const capture=JSON.parse(fs.readFileSync(capturePath,'utf8')),module=new WebAssembly.Module(fs.readFileSync(binary)),state=structuredClone(capture.state),loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
try{
 const village=state.villages[0],cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
 for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const profiles=[];for(const options of [{worker:true},{worker:false,species:'warthog'}]){session.actorSectorRevision(options);profiles.push(wasm.lazy_selected_context());}
 const first=capture.log.findIndex(e=>e.op==='detour'),snapshot=new Map();for(const event of capture.log.slice(0,first))if(event.op==='publish')snapshot.set(event.args[0],{id:event.result,key:event.args[0],...event.args[1]});
 const copies=Number(process.env.BODY_COPIES??1);if(!Number.isInteger(copies)||copies<1||copies>4)throw Error('Invalid body copy count');
 const sourceBodies=[...snapshot.values()],expanded=[];for(let copy=0;copy<copies;copy++)for(const b of sourceBodies)expanded.push({...b,id:b.id+copy*1000000,key:`${copy}:${b.key}`,x:b.x+copy*30,z:b.z+copy*20});
 const bodies=expanded.sort((a,b)=>a.id-b.id).map(b=>({...b,status:(b.flags&1)?b.kind===1&&(b.flags&4)?'retreating':'walking':b.kind?'gone':'home',incapacitated:!!(b.flags&2),hitsRemaining:b.flags&8?1:0}));
 const game={workers:bodies.filter(b=>b.kind===0),raid:{animals:bodies.filter(b=>b.kind===1)}};
 wasm.spatial_bodies_reset();for(const b of bodies)if(!wasm.spatial_body_upsert(b.id,b.x,b.z,b.radius,b.kind,b.flags))throw Error('Body publication failed');
 const near=()=>{const count=wasm.spatial_bodies_near(village.x,village.z,500);return Array.from(new Float64Array(wasm.memory.buffer,wasm.spatial_bodies_result_ptr(),count*6));};
 const before=near(),invalidPtr=wasm.spatial_mobility_input_ptr(2);new Float64Array(wasm.memory.buffer,invalidPtr,10).set([bodies[0].id,bodies[0].x+.1,bodies[0].z,.1,profiles[0],bodies[0].id,bodies[0].x,bodies[0].z,.1,profiles[0]]);
 if(wasm.spatial_mobility_step(2)!==-1||JSON.stringify(before)!==JSON.stringify(near()))throw Error('Invalid duplicate batch changed the registry');
 const terrain=(a,b)=>{const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.25));let x=a.x,z=a.z;for(let i=1;i<=count;i++){const nx=a.x+(b.x-a.x)*i/count,nz=a.z+(b.z-a.z)*i/count;if(!wasm.spatial_local_clear(x,z,nx,nz))return false;x=nx;z=nz;}return true;};
 const initialBodies=structuredClone(bodies),trace=[],stats={batches:0,commands:0,blocked:0,advanced:0,arrived:0,zeroBudget:0};
 for(let batch=0;batch<120;batch++){
  const commands=[];for(let j=0;j<Math.min(8,bodies.length);j++){const actor=bodies[(batch*7+j)%bodies.length],angle=((batch*13+j*7)%32)*Math.PI/16,distance=.2+((batch+j)%5)*.17,budget=(batch+j)%11===0?0:.15+((batch+j)%4)*.1;commands.push({actor,gx:actor.x+Math.cos(angle)*distance,gz:actor.z+Math.sin(angle)*distance,budget,profile:profiles[actor.kind]});}
  const ptr=wasm.spatial_mobility_input_ptr(commands.length),input=new Float64Array(wasm.memory.buffer,ptr,commands.length*5);for(let i=0;i<commands.length;i++){const c=commands[i];input.set([c.actor.id,c.gx,c.gz,c.budget,c.profile],i*5);}
  if(wasm.spatial_mobility_step(commands.length)!==commands.length)throw Error('Native batch rejected');
  const actual=Array.from(new Float64Array(wasm.memory.buffer,wasm.spatial_mobility_output_ptr(),commands.length*5));
  if(process.env.TRACE_OUTPUT)trace.push({input:commands.flatMap(c=>[c.actor.id,c.gx,c.gz,c.budget,c.profile]),expected:actual});
  for(let i=0;i<commands.length;i++){
   const c=commands[i],a=c.actor,dx=c.gx-a.x,dz=c.gz-a.z,length=Math.hypot(dx,dz),travel=Math.min(length,c.budget),end=length?{x:a.x+dx*travel/length,z:a.z+dz*travel/length}:{x:a.x,z:a.z};let status=1,clear=true;
   if(c.budget>0){wasm.spatial_select_nav_profile_index(c.profile);clear=terrain(a,end)&&actorSegmentClear(a,end,a,actorBlockers(game,a,a.kind===0));status=clear?(travel>=length?2:1):0;}
   const expected=[a.id,status,clear?end.x:a.x,clear?end.z:a.z,clear?travel:0];for(let k=0;k<5;k++)if(Math.abs(actual[i*5+k]-expected[k])>1e-8)throw Error(`Mismatch batch ${batch}, actor ${a.id}, field ${k}: ${actual[i*5+k]} vs ${expected[k]}`);
   if(clear&&c.budget>0){a.x=end.x;a.z=end.z;}stats.commands++;stats[status===0?'blocked':status===1?'advanced':'arrived']++;if(c.budget===0)stats.zeroBudget++;
  }stats.batches++;
 }
 const output={scope:'Ordered single-segment batch compared with existing JS swept-disc predicate and equivalent native terrain checks, starting from one captured raid body snapshot; optional shifted copies, targets and budgets are synthetic. This is not a complete simulation or performance measurement.',profiles,copies,bodies:bodies.length,parity:true,duplicateBatchAtomic:true,...stats};console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
 if(process.env.TRACE_OUTPUT)fs.writeFileSync(process.env.TRACE_OUTPUT,JSON.stringify({initialBodies,trace})+'\n');
}finally{session.dispose();}
