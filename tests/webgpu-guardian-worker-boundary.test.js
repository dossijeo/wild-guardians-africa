import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Scene} from 'three';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
import {createWebGpuGuardianAttack} from '../src/rendering/webgpu-guardian-attack.js';
import {beginWebGpuGuardianImpact} from '../src/rendering/webgpu-guardian-impact.js';

// Run the actual Worker message branch without a browser or WebGPU device.
// Only the surface bootstrap is substituted; dispatch and its imported impact
// coordinator are the production source. No historical certificate is enabled.
function workerMessage(surface){
 let source=readFileSync(new URL('../src/rendering/webgpu-world-worker.js',import.meta.url),'utf8');
 source=source.replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.env.DEV','false');
 source=source.replace("function fail(error){", "phase='running';surface=testSurface;function fail(error){");
 const worker={};new Function('self','testSurface','createWebGpuSurfaceOwner','beginWebGpuGuardianImpact','postMessage',source)(worker,surface,()=>({close:async()=>{}}),beginWebGpuGuardianImpact,()=>{});return worker.onmessage;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({onCommit=()=>{}}={}){
 let now=0,sequence=0,lastElapsed=0,commits=0;
 const segments={version:1,start:0,end:1,startPauses:[],endPauses:[],complete:true,segments:[{start:0,end:1,realDuration:1,rate:1}]};
 const stream={status:()=>({closed:false,sequence,lastElapsed}),timelineStatus:()=>({receivedElapsed:1}),lastConfirmedClockSegments:()=>segments,nextTimelineBoundary:()=>sequence===0?{sequence:1,elapsed:1}:null,advanceNextTimelineBoundary(){sequence=1;lastElapsed=1;commits++;onCommit();return true;},previewNextMotionBoundary:()=>({sequence:1,start:0,end:1,reasons:[],safeForAutonomousPlayback:true,clockSegments:segments})};
 const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now}),pump=createConfirmedTimelinePump({stream,historicalPlayback:{clock,now:()=>now,certify:value=>value,start:()=>true,finish(){},abort(){},isCurrent:()=>true}});
 const state={elapsed:0,events:[],raid:{animals:[{id:'a',species:'hyena',status:'walking',x:0,z:0,radius:.7}]}},scene=new Scene(),bank={tick(){},dispose(){}},roster=createWebGpuAnimalRoster({scene,residency:{get:()=>null},state,assetBank:bank,createAnimal:()=>({update(){},dispose(){}})}),guardian=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>now,loadModel:()=>new Promise(()=>{})});
 roster.sync();await flush();pump.advance();const surface={timelinePump:pump,animalRoster:roster,guardianAttack:guardian};
 return {state,clock,pump,roster,guardian,send:workerMessage(surface),setNow:value=>{now=value;},get commits(){return commits;},dispose(){pump.dispose();clock.dispose();roster.dispose();guardian.dispose();}};
}
const command={kind:'castAttack',id:'hit',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:0,y:1,z:0}}};
test('Worker rejects an unavailable impact before suspending an active boundary',async()=>{
 const f=await setup();try{f.state.raid.animals[0].magicDown={phase:'rolling'};f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});assert.equal(f.pump.status().historicalHold,null);assert.equal(f.guardian.status().active,null);f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.commits,1);}finally{f.dispose();}
});
test('Worker rejects a malformed visual gesture without holding its boundary',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command:{...command,selection:{origin:null,contact:null}}}});assert.equal(f.pump.status().historicalHold,null);assert.equal(f.guardian.status().active,null);f.setNow(1000);assert.equal(f.pump.advance(),1);}finally{f.dispose();}
});
test('Worker freezes a valid boundary before starting provisional feedback',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});assert.equal(f.pump.status().historicalHold,'input');assert.equal(f.clock.elapsed,.25);assert.equal(f.guardian.status().active?.id,'hit');assert.equal(f.roster.status().provisionalImpacts,1);assert.equal(f.commits,0);}finally{f.dispose();}
});
test('Worker rechecks the target if suspension commits a boundary',async()=>{
 let f;f=await setup({onCommit:()=>{f.state.raid.animals[0].magicDown={phase:'falling'};}});try{f.setNow(1000);await f.send({data:{kind:'guardianBegin',command}});assert.equal(f.commits,1);assert.equal(f.guardian.status().active,null);assert.equal(f.roster.status().provisionalImpacts,0);assert.equal(f.pump.status().historicalPending,null);}finally{f.dispose();}
});
