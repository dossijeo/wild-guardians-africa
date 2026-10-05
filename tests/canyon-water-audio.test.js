import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MovementAudio} from '../src/audio/movement-audio.js';
import {AmbientAudio} from '../src/audio/ambient-audio.js';
import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
const flush=()=>new Promise(done=>setImmediate(done));
test('the requested water clips retain catalogue numbers 012 and 006',()=>{
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url)));
 assert.equal(bank.items.find(p=>p.id==='step_mud').number,12);
 assert.equal(bank.items.find(p=>p.id==='amb_river').number,6);
});
for(const id of Object.keys(FOOTSTEPS.sources))for(const running of [false,true])test(`${id}/${running}: water contacts use 012, then restore dry footsteps, with no pause duplicates`,async()=>{
 const worker=/Male|Female/.test(id),name=worker?(running?'Run':'Walk_Skip'):(running?'Running':'Walking'),key=worker?(running?'runPhase':'walkPhase'):'motionPhase';
 const clip=FOOTSTEPS.sources[id].clips[name],marker=clip.contacts[0];
 const actor={id:'actor',x:0,z:0,[key]:Math.max(0,marker.time-.02),...(worker?{profile:id,status:'walking',running}:{species:id,status:running?'entering':'walking'})};
 const state={elapsed:0,time:0,biome:'gran-canon',pauses:[],workers:worker?[actor]:[],raid:worker?null:{animals:[actor]}},calls=[];
 const audio=new MovementAudio(id=>{calls.push(id);return null;},()=>{},()=>0);
 const options={surfaceAt:()=> 'water'};audio.update(state,options);
 actor.x=.1;actor[key]=marker.time+.02;state.elapsed=.1;audio.update(state,options);await flush();
 assert.deepEqual(calls,['step_mud']);audio.update(state,options);await flush();assert.equal(calls.length,1);
 state.pauses=['qa'];state.elapsed+=.1;audio.update(state,options);assert.equal(calls.length,1);state.pauses=[];audio.update(state,options);
 for(let i=0;i<60;i++){actor.x+=.1;actor[key]+=.05;state.elapsed+=.05;audio.update(state,{surfaceAt:()=>null});}await flush();
 assert.ok(calls.slice(1).length>0);assert.ok(calls.slice(1).every(id=>id!=='step_mud'));audio.dispose();
});
test('006 river ambience shares one nearby loop and fades away when the camera leaves the river',async()=>{
 const calls=[],stops=[],levels=[];let now=0;
 const audio=new AmbientAudio((id,options)=>{calls.push({id,options});return {id};},v=>stops.push(v.id),(v,g)=>levels.push({id:v.id,g}),()=>now);
 const state={biome:'gran-canon',time:0,pauses:[]},near={listener:{x:0,z:0},waterAt:()=>({active:true,inside:true,shore:0})};
 for(let i=0;i<60;i++)audio.update(state,near);await flush();
 assert.equal(calls.filter(p=>p.id==='amb_river').length,1);assert.equal(calls.find(p=>p.id==='amb_river').options.loop,true);
 audio.update(state,{listener:{x:100,z:0},waterAt:()=>({active:true,inside:false,shore:100})});
 assert.ok(levels.some(p=>p.id==='amb_river'&&p.g===0));now=.5;audio.update(state,{listener:{x:100,z:0}});assert.ok(stops.includes('amb_river'));audio.dispose();
});
