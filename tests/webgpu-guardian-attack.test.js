import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {createWebGpuGuardianAttack} from '../src/rendering/webgpu-guardian-attack.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {createWebGpuGuardianStyle} from '../src/rendering/webgpu-guardian-material.js';
test('guardian resources survive closure until its pipeline compilation settles',async()=>{
 const scene=new THREE.Scene(),model=new THREE.Group(),geometry=new THREE.BoxGeometry(),original=new THREE.MeshStandardMaterial();model.add(new THREE.Mesh(geometry,original));let finish,released=0;geometry.addEventListener('dispose',()=>released++);
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({scene,camera:new THREE.PerspectiveCamera(),renderer}),visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer,pipelineAdmission:admission,loadModel:async()=>({scene:model,animations:[]})});
 const pending=visual.prepare();await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof finish,'function');visual.dispose();assert.equal(released,0);finish();await assert.rejects(pending,/unavailable|closed/);await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);admission.dispose();
});
test('guardian effect resources survive cancellation of their own compilation',async()=>{
 const scene=new THREE.Scene(),model=new THREE.Group(),geometry=new THREE.BoxGeometry(),original=new THREE.MeshStandardMaterial();model.add(new THREE.Mesh(geometry,original));const calls=[],turn=()=>new Promise(resolve=>setImmediate(resolve));let released=0;
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()},compileAsync:object=>new Promise(resolve=>calls.push({object,resolve}))},admission=createWebGpuPipelineAdmission({scene,camera:new THREE.PerspectiveCamera(),renderer}),visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer,pipelineAdmission:admission,loadModel:async()=>({scene:model,animations:[]})});
 try{const pending=visual.prepare();await turn();calls[0].resolve();await turn();calls[1].resolve();await turn();assert.equal(calls.length,3);const effects=calls[2].object;assert.equal(effects.children.length,4);effects.children[0].geometry.addEventListener('dispose',()=>released++);const rejection=assert.rejects(pending,/cancelled|closed/);visual.dispose();await rejection;assert.equal(released,0);calls[2].resolve();await turn();assert.equal(released,1);assert.equal(scene.children.length,0);}finally{visual.dispose();admission.dispose();}
});
function setup(){let now=0;const scene=new THREE.Scene(),state={elapsed:0,events:[],raid:{animals:[{id:'a',status:'walking'}]}},renderer={backend:{isWebGPUBackend:true}},visual=createWebGpuGuardianAttack({scene,state,renderer,clock:()=>now,loadModel:()=>new Promise(()=>{})}),command={kind:'castAttack',id:'c',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}};return {scene,state,visual,command,setNow:value=>{now=value;}};}
test('guardian checkpoint preserves confirmed gesture and rejects provisional state',()=>{const f=setup();assert.equal(f.visual.begin(f.command),true);assert.throws(()=>f.visual.exportRecoveryCheckpoint(1),/unavailable/);f.state.elapsed=.2;f.state.events.push({id:'e',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:.1,...f.command.selection}});f.visual.sync();const checkpoint=f.visual.exportRecoveryCheckpoint(1),copy=createWebGpuGuardianAttack({scene:new THREE.Scene(),state:f.state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>0,loadModel:()=>new Promise(()=>{})});try{assert.equal(copy.restoreRecoveryCheckpoint(checkpoint,1),true);assert.equal(copy.status().active.id,'c');assert.equal(copy.status().active.provisional,false);copy.sync();assert.equal(copy.status().confirmed,0);assert.equal(copy.begin(f.command),false);assert.throws(()=>copy.restoreRecoveryCheckpoint(checkpoint,1),/Invalid/);}finally{f.visual.dispose();copy.dispose();}});
test('tutorial guide reuses the admitted guardian and yields to a cast',async()=>{
 let now=0,loads=0;const scene=new THREE.Scene(),model=new THREE.Group(),sounds=[],state={time:0,elapsed:0,events:[],raid:{animals:[{id:'a',status:'walking'}]}},renderer={backend:{isWebGPUBackend:true}},visual=createWebGpuGuardianAttack({scene,state,renderer,clock:()=>now,loadModel:async()=>{loads++;return {scene:model,animations:[]};},onPresence:id=>sounds.push(id)});
 const guide={origin:{x:2,y:1,z:3},target:[5,0,2],camera:{x:4,y:8,z:9}},command={kind:'castAttack',id:'c',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}};
 try{
  assert.equal(visual.setGuide(guide),true);assert.equal(visual.guideVisible(),false);await visual.prepare();visual.tick();
  assert.equal(visual.guideVisible(),true);assert.deepEqual(visual.guideObject().position.toArray(),[2,1,3]);assert.ok(Math.abs(model.scale.x-4.08)<1e-9);assert.deepEqual(sounds,[]);assert.equal(loads,1);
  assert.equal(visual.begin(command),true);assert.equal(visual.guideVisible(),false);visual.tick();assert.equal(model.scale.x,2.4);
  visual.resolve('c',false);now=200;visual.tick();assert.equal(visual.guideVisible(),true);assert.deepEqual(sounds,['spirit_appear']);
  visual.setGuide(null);assert.equal(visual.guideVisible(),false);assert.equal(visual.guideObject().visible,false);
  assert.throws(()=>visual.setGuide({...guide,target:[1,2,NaN]}),/Invalid guardian guide/);
 }finally{visual.dispose();}
});
test('tutorial guide follows the latest narration clock and rejects stale voice packets',async()=>{
 let now=0;const originalFetch=globalThis.fetch,scene=new THREE.Scene(),model=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 mesh.morphTargetDictionary={viseme_A:0,viseme_B:1,viseme_X:2,blink_L:3,blink_R:4};mesh.morphTargetInfluences=[0,0,0,0,0];model.add(mesh);
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},visual=createWebGpuGuardianAttack({scene,state:{events:[],elapsed:0},renderer,clock:()=>now,loadModel:async()=>({scene:model,animations:[]})});
 globalThis.fetch=async url=>({ok:true,json:async()=>({id:'guide',audio:'audio/guide.ogg',duration:2,mouthCues:[{start:0,end:1,value:'A'},{start:1,end:2,value:'B'}],pauses:[]})});
 try{
  await visual.prepare();visual.setGuide({origin:{x:0,y:1,z:0},target:[1,0,0],camera:{x:0,y:3,z:4}});
  assert.equal(visual.setNarration({sequence:2,narration:{record:{id:'guide',path:'audio/guide.ogg'},audio:{currentTime:.5,paused:true,ended:false,playbackRate:1}}}),true);
  visual.tick();await new Promise(resolve=>setImmediate(resolve));visual.tick();assert.equal(mesh.morphTargetInfluences[0],1);
  assert.equal(visual.setNarration({sequence:1,narration:null}),false);
  assert.equal(visual.setNarration({sequence:3,narration:{record:{id:'guide',path:'audio/guide.ogg'},audio:{currentTime:1.5,paused:true,ended:false,playbackRate:1}}}),true);visual.tick();assert.equal(mesh.morphTargetInfluences[1],1);
  visual.setNarration({sequence:4,narration:null});visual.tick();assert.equal(mesh.morphTargetInfluences[2],1);
 }finally{globalThis.fetch=originalFetch;visual.dispose();}
});
test('guardian presence follows admitted visual and is not replayed on confirmation or recovery',async()=>{
 let now=0;const sounds=[],state={elapsed:0,time:0,events:[],raid:{animals:[{id:'a',status:'walking'}]}},renderer={backend:{isWebGPUBackend:true}},origin={x:0,y:2,z:0},contact={x:1,y:1,z:0};
 const create=()=>createWebGpuGuardianAttack({scene:new THREE.Scene(),state,renderer,clock:()=>now,loadModel:async()=>({scene:new THREE.Group(),animations:[]}),onPresence:(id,p)=>sounds.push({id,p})});
 const visual=create(),command={kind:'castAttack',id:'c',targetId:'a',selection:{origin,contact}};
 try{assert.equal(visual.begin(command),true);visual.tick();assert.equal(sounds.length,0);await visual.prepare();visual.tick();visual.tick();assert.deepEqual(sounds.map(x=>x.id),['spirit_appear']);
  state.events.push({id:'e',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:0,origin,contact}});visual.sync();visual.tick();assert.equal(sounds.length,1);
  state.elapsed=1.6;now=1600;visual.tick();visual.tick();assert.deepEqual(sounds.map(x=>x.id),['spirit_appear','spirit_disappear']);
 }finally{visual.dispose();}
 const recovered=create();try{await recovered.prepare();recovered.sync();recovered.tick();assert.equal(sounds.length,2);}finally{recovered.dispose();}
});
test('awakening indicator stays hidden until admitted and retains resources on cancellation',async()=>{
 const scene=new THREE.Scene(),state={elapsed:0,plants:[{id:'p',alive:true}],structures:[],events:[]};let finish,compiled,released=0;const turn=()=>new Promise(resolve=>setImmediate(resolve)),renderer={backend:{isWebGPUBackend:true},compileAsync:object=>{compiled=object;return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({scene,camera:new THREE.PerspectiveCamera(),renderer}),visual=createWebGpuGuardianAttack({scene,state,renderer,pipelineAdmission:admission,loadModel:()=>new Promise(()=>{})});
 try{assert.equal(visual.beginAwakening({kind:'bless',id:'a',targetId:'p',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:0,z:0}}}),true);visual.tick();await turn();assert.ok(compiled);assert.equal(compiled.visible,false);assert.equal(visual.status().ritualPreview,false);compiled.children[0].geometry.addEventListener('dispose',()=>released++);visual.dispose();assert.equal(released,0);finish();await turn();assert.equal(released,1);assert.equal(scene.children.length,0);}finally{visual.dispose();admission.dispose();}
});

test('awakening preparation admits ritual geometry on demand',async()=>{
 const requests=[],scene=new THREE.Scene(),visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission:{async prepare(object,options){requests.push({object,options});}},loadModel:async()=>({scene:new THREE.Group(),animations:[]})});
 try{await visual.prepare();assert.equal(requests.length,3);assert.equal(visual.status().ritualReady,false);await visual.prepare({awakening:true});assert.equal(requests.length,4);assert.equal(requests[3].options.include.length,2);assert.equal(visual.status().ritualReady,true);await visual.prepare({awakening:true});assert.equal(requests.length,4);}finally{visual.dispose();}
});

test('guardian and its effects stay hidden until their pipeline admissions complete',async()=>{
 const pending=[],scene=new THREE.Scene(),state={elapsed:0,events:[],raid:{animals:[{id:'a',status:'walking'}]}},turn=()=>new Promise(resolve=>setImmediate(resolve));
 const visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},loadModel:async()=>({scene:new THREE.Group(),animations:[]}),pipelineAdmission:{prepare(object,options){return new Promise(resolve=>pending.push({object,options,resolve}));}}});
 assert.equal(visual.begin({kind:'castAttack',id:'c',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}}),true);
 const ready=visual.prepare();await turn();visual.tick();assert.equal(pending.length,1);const group=pending[0].object;assert.equal(group.visible,false);assert.equal(visual.status().modelReady,false);
 pending[0].resolve();await turn();assert.equal(pending.length,2);const vortex=pending[1].object;assert.equal(group.visible,false);assert.equal(vortex.visible,false);pending[1].resolve();await turn();assert.equal(pending.length,3);const effects=pending[2].object;assert.equal(effects.visible,false);assert.equal(pending[2].options.include.length,4);pending[2].resolve();await ready;visual.tick();assert.equal(group.visible,true);assert.equal(effects.visible,true);assert.equal(visual.status().modelReady,true);visual.dispose();
});
test('on-demand preparation shares loading and rejects failed or closed presentations',async()=>{let loads=0,release;const visual=createWebGpuGuardianAttack({scene:new THREE.Scene(),state:{events:[]},renderer:{backend:{isWebGPUBackend:true}},loadModel:()=>{loads++;return new Promise((resolve,reject)=>{release=reject;});}});const first=visual.prepare(),second=visual.prepare();await Promise.resolve();assert.equal(loads,1);release(Error('missing model'));await assert.rejects(first,/unavailable/);await assert.rejects(second,/unavailable/);visual.dispose();await assert.rejects(visual.prepare(),/closed/);});
test('a transient model download failure can be retried without creating duplicate guardians',async()=>{let loads=0;const errors=[],scene=new THREE.Scene(),visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer:{backend:{isWebGPUBackend:true}},onError:error=>errors.push(error.message),loadModel:async()=>{if(++loads===1)throw Error('network unavailable');return {scene:new THREE.Group(),animations:[]};}});try{await assert.rejects(visual.prepare(),/unavailable/);await Promise.all([visual.prepare(),visual.prepare()]);assert.equal(loads,2);assert.equal(visual.status().modelReady,true);assert.deepEqual(errors,['network unavailable']);assert.equal(scene.children.length,3);}finally{visual.dispose();assert.equal(scene.children.length,0);}});
test('a transient effect preparation failure can be retried without reloading the model',async()=>{let loads=0,effects=0;const errors=[],scene=new THREE.Scene(),admission={prepare(){throw Error('atomic admission required');},async prepareManyAndPublish(_requests,publish){publish();},async prepareAndPublish(_object,_options,publish){if(++effects===1)throw Error('effect preparation failed');publish();}},visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission:admission,onError:error=>errors.push(error.message),loadModel:async()=>{loads++;return {scene:new THREE.Group(),animations:[]};}});try{await assert.rejects(visual.prepare(),/effect preparation failed/);assert.equal(visual.status().modelReady,true);assert.equal(visual.status().effectsReady,false);await visual.prepare();assert.equal(loads,1);assert.equal(effects,2);assert.equal(visual.status().effectsReady,true);assert.deepEqual(errors,['effect preparation failed']);}finally{visual.dispose();}});
test('on-demand preparation installs one reusable model without starting a gesture',async()=>{let loads=0;const scene=new THREE.Scene(),visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer:{backend:{isWebGPUBackend:true}},loadModel:async()=>{loads++;return {scene:new THREE.Group(),animations:[]};}});await Promise.all([visual.prepare(),visual.prepare()]);assert.equal(loads,1);assert.equal(visual.status().modelReady,true);assert.equal(visual.status().active,null);await visual.prepare();assert.equal(loads,1);visual.dispose();assert.equal(scene.children.length,0);});
test('guardian model, effects and ritual use the combined publication contract',async()=>{const calls=[],scene=new THREE.Scene(),admission={prepare(){throw Error('non-atomic admission used');},async prepareManyAndPublish(requests,publish){calls.push(['group',requests.length]);publish();},async prepareAndPublish(object,options,publish){calls.push(['object',options.include.length]);publish();}},visual=createWebGpuGuardianAttack({scene,state:{events:[]},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission:admission,loadModel:async()=>({scene:new THREE.Group(),animations:[]})});try{await visual.prepare({awakening:true});assert.deepEqual(calls,[['group',2],['object',4],['object',2]]);assert.equal(visual.status().modelReady,true);assert.equal(visual.status().ritualReady,true);}finally{visual.dispose();}});
test('provisional cast begins immediately, rejects by ID and does not alter simulation',()=>{const {scene,state,visual,command,setNow}=setup(),before=JSON.stringify(state);assert.equal(visual.begin({...command,selection:{origin:null,contact:null}}),false);assert.equal(visual.begin(command),true);visual.tick();assert.equal(visual.status().coreVisible,true);assert.equal(visual.status().provisionalFrames,1);setNow(100);visual.tick();assert.equal(visual.status().coreVisible,true);visual.resolve('wrong',false);assert.ok(visual.status().active);visual.resolve('c',false);assert.equal(visual.status().active,null);assert.equal(JSON.stringify(state),before);visual.dispose();assert.equal(scene.children.length,0);});
test('confirmed command replaces provisional once, uses simulation clock and never replays',()=>{const {scene,state,visual,command,setNow}=setup();visual.begin(command);setNow(80);state.elapsed=.1;state.events.push({id:'event-1',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:.1,origin:{x:.2,y:2,z:0},contact:{x:1.2,y:1,z:0}}});visual.sync();assert.equal(visual.status().active.provisional,false);visual.resolve('c',false);assert.ok(visual.status().active);state.elapsed=3;visual.tick();assert.equal(visual.status().active,null);visual.sync();assert.equal(visual.status().active,null);visual.dispose();assert.equal(scene.children.length,0);});
test('fallen beasts and provisional messages arriving after confirmation do not start another attack',()=>{const {state,visual,command}=setup();state.raid.animals[0].magicDown={phase:'rolling'};assert.equal(visual.begin(command),false);delete state.raid.animals[0].magicDown;state.events.push({id:'event-1',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:0,origin:command.selection.origin,contact:command.selection.contact}});visual.sync();assert.equal(visual.status().active?.provisional,false);assert.equal(visual.begin(command),false);assert.equal(visual.status().active?.provisional,false);visual.dispose();});
test('late confirmation of an older provisional cast cannot replace a newer cast',()=>{const {state,visual,command,setNow}=setup();state.raid.animals.push({id:'b',status:'walking'});assert.equal(visual.begin(command),true);setNow(1800);const next={...command,id:'d',targetId:'b'};assert.equal(visual.begin(next),true);state.events.push({id:'event-1',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:0,origin:command.selection.origin,contact:command.selection.contact}});visual.sync();assert.equal(visual.status().active.id,'d');assert.equal(visual.status().active.provisional,true);visual.dispose();});
test('guardian aura follows the provisional command and clears when rejected',()=>{const scene=new THREE.Scene(),state={elapsed:0,events:[],raid:{animals:[{id:'a',status:'walking'}]}},renderer={backend:{isWebGPUBackend:true}},calls=[],visual=createWebGpuGuardianAttack({scene,state,renderer,clock:()=>100,loadModel:()=>new Promise(()=>{}),aura:plan=>calls.push(plan)});assert.equal(visual.begin({kind:'castAttack',id:'c',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}}),true);visual.tick();assert.equal(calls.at(-1).id,'c');visual.resolve('c',false);assert.equal(calls.at(-1),null);visual.dispose();});
test('awakening preview reconciles by command and rejection clears it',()=>{let now=0;const scene=new THREE.Scene(),state={elapsed:0,time:0,plants:[{id:'p',alive:true}],structures:[],events:[]},renderer={backend:{isWebGPUBackend:true}},visual=createWebGpuGuardianAttack({scene,state,renderer,clock:()=>now,loadModel:()=>new Promise(()=>{})}),command={kind:'bless',id:'a',targetId:'p',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:0,z:0}}};assert.equal(visual.beginAwakening(command),true);visual.tick();assert.equal(visual.status().ritualPreview,true);visual.resolve('a',false);assert.equal(visual.status().active,null);assert.equal(visual.status().ritualPreview,false);assert.equal(visual.beginAwakening({...command,id:'b'}),true);now=100;state.elapsed=.1;state.plants[0].blessing={at:.1};state.events.push({id:'e',type:'BlessingApplied',commandId:'b',targetId:'p',presentation:{elapsed:.1}});visual.sync();visual.tick();assert.equal(visual.status().active.provisional,false);assert.equal(visual.status().ritualPreview,false);visual.resolve('b',false);assert.equal(visual.status().active.id,'b');visual.dispose();});
test('late provisional awakening cannot replay a confirmed command',()=>{const scene=new THREE.Scene(),state={elapsed:0,plants:[{id:'p',alive:true}],structures:[],events:[]},renderer={backend:{isWebGPUBackend:true}},visual=createWebGpuGuardianAttack({scene,state,renderer,loadModel:()=>new Promise(()=>{})});state.events.push({id:'e',type:'BlessingApplied',commandId:'b',targetId:'p',presentation:{elapsed:0}});visual.sync();assert.equal(visual.beginAwakening({kind:'bless',id:'b',targetId:'p',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:0,z:0}}}),false);visual.dispose();});
for(const [kind,count] of [['growth',2],['multiply',8]])test(`${kind} preview waits for confirmed event before beams and handles rejection`,()=>{let now=0;const scene=new THREE.Scene(),state={elapsed:0,plants:[{id:'p',alive:true}],events:[]},visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>now,loadModel:()=>new Promise(()=>{})}),command={kind:'castAgricultural',spell:kind,id:'c',selection:{targetId:'p',origin:{x:0,y:2,z:0},contact:{x:1,y:0,z:0}}};assert.equal(visual.beginAgriculture(command),true);now=300;visual.tick();assert.equal(visual.status().cropBeams,0);visual.resolve('c',false);assert.equal(visual.status().active,null);assert.equal(visual.beginAgriculture({...command,id:'d'}),true);now=500;state.elapsed=.2;state.events.push({id:'e',type:'SpellActivated',kind,commandId:'d',targetId:'p',presentation:{elapsed:.2,...command.selection}});visual.sync();state.elapsed=.3;visual.tick();assert.equal(visual.status().active.provisional,false);assert.equal(visual.status().cropBeams,count);visual.sync();assert.equal(visual.status().confirmed,1);visual.dispose();});
test('crop confirmation arriving before provisional begin is never replayed',()=>{const scene=new THREE.Scene(),state={elapsed:0,plants:[{id:'p',alive:true}],events:[]},visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},loadModel:()=>new Promise(()=>{})}),selection={targetId:'p',origin:{x:0,y:2,z:0},contact:{x:1,y:0,z:0}};state.events.push({id:'e',type:'SpellActivated',kind:'growth',commandId:'c',targetId:'p',presentation:{elapsed:0,...selection}});visual.sync();assert.equal(visual.beginAgriculture({kind:'castAgricultural',spell:'growth',id:'c',selection}),false);assert.equal(visual.status().confirmed,1);visual.dispose();});

test('ordered lifecycle journal retains publication boundaries and legacy snapshot fallback',()=>{
 const origin={x:0,y:2,z:0},contact={x:1,y:1,z:0};
 for(const kind of ['attack','growth']){
  const make=()=>{const scene=new THREE.Scene(),state={elapsed:0,events:[],plants:[{id:'p',alive:true}],raid:{animals:[{id:'a',status:'walking'}]}},visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},loadModel:()=>new Promise(()=>{})});return {state,visual};};
  const targetId=kind==='attack'?'a':'p',spell={id:'e1',type:'SpellActivated',kind,targetId,commandId:'c',presentation:{elapsed:0,origin,contact}},gone=kind==='attack'?{kind:'animalGone',actorId:targetId}:{kind:'event',eventId:'e2'},removed={id:'e2',type:'CropDestroyed',targetId};
  let {state,visual}=make();state.events=[spell,...(kind==='growth'?[removed]:[])];state.raid=null;state.plants=[];visual.sync([{kind:'event',eventId:'e1'},gone]);assert.equal(visual.status().active,null);visual.dispose();
  ({state,visual}=make());state.events=[spell];state.raid=null;state.plants=[];visual.sync([{kind:'event',eventId:'e1'}]);assert.equal(visual.status().active?.id,'c');state.events.push(...(kind==='growth'?[removed]:[]));visual.sync([gone]);assert.equal(visual.status().active?.id,'c');visual.dispose();
  ({state,visual}=make());state.events=[spell];state.raid=null;state.plants=[];visual.sync();assert.equal(visual.status().active,null);visual.dispose();
 }
});

test('guardian consumes confirmed publication events even when snapshot history no longer retains them',()=>{
 const {state,visual,command}=setup();state.raid=null;const event={id:'event-1',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:0,...command.selection}};
 visual.sync([{kind:'event',eventId:event.id}],[event]);assert.equal(visual.status().active?.id,'c');visual.dispose();
});

test('confirmed guardian uses shared time while provisional feedback uses real time',()=>{let now=0;const scene=new THREE.Scene(),state={elapsed:0,events:[],raid:{animals:[{id:'a',status:'walking'}]}},renderer={backend:{isWebGPUBackend:true}},confirmedClock=createConfirmedPresentationClock(0),aura=[],visual=createWebGpuGuardianAttack({scene,state,renderer,confirmedClock,clock:()=>now,loadModel:()=>new Promise(()=>{}),aura:plan=>aura.push(plan)}),command={kind:'castAttack',id:'c',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}};assert.equal(visual.begin(command),true);now=100;visual.tick();assert.ok(Math.abs(aura.at(-1).age-.1)<1e-8);state.elapsed=.1;confirmedClock.commit(.1);state.events.push({id:'e',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{elapsed:.1,...command.selection}});visual.sync();visual.tick();const confirmedAge=aura.at(-1).age;assert.equal(visual.status().active.provisional,false);state.elapsed=3;now=5000;visual.tick();assert.ok(visual.status().active);assert.equal(aura.at(-1).age,confirmedAge);confirmedClock.commit(.2);visual.tick();assert.ok(aura.at(-1).age>confirmedAge);assert.equal(visual.status().beamVisible,true);confirmedClock.commit(3);visual.tick();assert.equal(visual.status().active,null);visual.dispose();confirmedClock.dispose();});
test('guardian uses confirmed lifecycle time and accepts legacy event timestamps',()=>{
 for(const mode of ['timed','legacy','future']){
  const scene=new THREE.Scene(),state={elapsed:10,events:[],raid:{animals:[{id:'a',status:'walking'}]}},confirmedClock=createConfirmedPresentationClock(10),aura=[],visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},confirmedClock,clock:()=>0,loadModel:()=>new Promise(()=>{}),aura:plan=>{if(plan)aura.push(plan);}});
  const event={id:'event-1',type:'SpellActivated',kind:'attack',commandId:'c',targetId:'a',presentation:{origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0},...(mode==='legacy'?{elapsed:9.8}:mode==='timed'?{elapsed:1}:{elapsed:9.8})}};
  const facts=mode==='legacy'?[{kind:'event',eventId:event.id}]:[{kind:'event',eventId:event.id,at:mode==='future'?10.1:9.8}];visual.sync(facts,[event]);visual.tick();
  if(mode==='future')assert.equal(visual.status().active,null);else{assert.equal(visual.status().active.id,'c');assert.ok(Math.abs(aura.at(-1).age-.2)<1e-8);}
  visual.dispose();confirmedClock.dispose();
 }
});
test('confirmed shield uses the guardian gesture and non-attack beams once',()=>{
 let now=0;const scene=new THREE.Scene(),state={elapsed:10,events:[],plants:[],raid:null},confirmedClock=createConfirmedPresentationClock(10),visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},confirmedClock,clock:()=>now,loadModel:()=>new Promise(()=>{})});
 const event={id:'event-1',type:'SpellActivated',kind:'shield',commandId:'shield-1',presentation:{elapsed:9.8,origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}},journal=[{kind:'event',eventId:event.id,at:9.8}];
 try{visual.sync(journal,[event]);visual.tick();assert.equal(visual.status().active.kind,'shield');assert.equal(visual.status().active.provisional,false);assert.equal(visual.status().cropBeams,2);assert.equal(visual.status().beamVisible,false);assert.equal(visual.status().confirmed,1);visual.sync(journal,[event]);assert.equal(visual.status().confirmed,1);state.elapsed=13;confirmedClock.commit(13);visual.tick();assert.equal(visual.status().active,null);}finally{visual.dispose();confirmedClock.dispose();}
});
test('shield feedback starts provisionally without creating confirmed effects and reconciles by id',()=>{
 let now=0;const scene=new THREE.Scene(),state={elapsed:10,events:[],plants:[],raid:null},before=JSON.stringify(state),visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>now,loadModel:()=>new Promise(()=>{})});
 const selection={origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}},command={kind:'castShield',id:'shield-1',selection};
 try{
  assert.equal(visual.beginShield({...command,selection:{origin:null,contact:null}}),false);
  assert.equal(visual.beginShield(command),true);now=250;visual.tick();
  assert.equal(visual.status().active.provisional,true);assert.equal(visual.status().cropBeams,0);assert.equal(visual.status().coreVisible,false);assert.equal(JSON.stringify(state),before);
  visual.resolve('other',false);assert.equal(visual.status().active.id,command.id);
  state.elapsed=10.3;const event={id:'event-1',type:'SpellActivated',kind:'shield',commandId:command.id,presentation:{elapsed:10.3,origin:{x:.2,y:2,z:0},contact:selection.contact}};
  visual.sync([{kind:'event',eventId:event.id,at:10.3}],[event]);visual.tick();assert.equal(visual.status().active.provisional,false);assert.equal(visual.status().cropBeams,2);assert.equal(visual.status().confirmed,1);
  visual.sync([{kind:'event',eventId:event.id,at:10.3}],[event]);visual.resolve(command.id,true);assert.equal(visual.status().confirmed,1);assert.equal(visual.beginShield(command),false);
 }finally{visual.dispose();}
});
test('shield rejection and delayed responses cannot affect a newer provisional gesture',()=>{
 let now=0;const state={elapsed:1,events:[],plants:[],raid:null},visual=createWebGpuGuardianAttack({scene:new THREE.Scene(),state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>now,loadModel:()=>new Promise(()=>{})});
 const selection={origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}},command={kind:'castShield',id:'first',selection};
 try{assert.equal(visual.beginShield(command),true);assert.equal(visual.beginShield({...command,id:'second'}),true);visual.resolve('first',false);assert.equal(visual.status().active.id,'second');visual.resolve('second',false);assert.equal(visual.status().active,null);assert.equal(visual.beginShield({...command,id:'third'}),true);
  now=1000;state.elapsed=3;const event={id:'event-1',type:'SpellActivated',kind:'shield',commandId:'third',presentation:{elapsed:1,...selection}};visual.sync([{kind:'event',eventId:event.id,at:1}],[event]);assert.equal(visual.status().active.id,'third');assert.equal(visual.status().active.provisional,false);
 }finally{visual.dispose();}
});
test('late attack and agricultural confirmations release the matching provisional gesture',()=>{
 for(const kind of ['attack','growth','multiply']){
  let now=0;const scene=new THREE.Scene(),state={elapsed:1,events:[],plants:[{id:'p',alive:true}],raid:{animals:[{id:'a',status:'walking'}]}},confirmedClock=createConfirmedPresentationClock(1),visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},confirmedClock,clock:()=>now,loadModel:()=>new Promise(()=>{})});
  const selection={origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}},targetId=kind==='attack'?'a':'p',command=kind==='attack'?{kind:'castAttack',id:'c',targetId,selection}:{kind:'castAgricultural',spell:kind,id:'c',selection:{...selection,targetId}};
  try{
   assert.equal(kind==='attack'?visual.begin(command):visual.beginAgriculture(command),true);
   now=2000;state.elapsed=3;confirmedClock.commit(3);
   const event={id:'event-1',type:'SpellActivated',kind,commandId:'c',targetId,presentation:{elapsed:1,...selection}};
   visual.sync([{kind:'event',eventId:event.id,at:1}],[event]);
   assert.equal(visual.status().active?.provisional,false,kind);
   state.elapsed=6;confirmedClock.commit(6);visual.tick();assert.equal(visual.status().active,null,kind);
  }finally{visual.dispose();confirmedClock.dispose();}
 }
});
test('an accepted provisional gesture ends when its target disappears in the same publication',()=>{
 const scene=new THREE.Scene(),state={elapsed:1,events:[],plants:[{id:'p',alive:true}],raid:null},visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>0,loadModel:()=>new Promise(()=>{})}),selection={origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}};
 try{
  assert.equal(visual.beginAgriculture({kind:'castAgricultural',spell:'growth',id:'c',selection:{...selection,targetId:'p'}}),true);
  const cast={id:'event-1',type:'SpellActivated',kind:'growth',commandId:'c',targetId:'p',presentation:{elapsed:1,...selection}},destroy={id:'event-2',type:'CropDestroyed',targetId:'p'};
  visual.sync([{kind:'event',eventId:cast.id,at:1},{kind:'event',eventId:destroy.id,at:1}],[cast,destroy]);
  assert.equal(visual.status().active,null);
 }finally{visual.dispose();}
});
test('confirmed shield selects the authored shield clip on the admitted rig',async()=>{
 const scene=new THREE.Scene(),model=new THREE.Group(),bone=new THREE.Bone();bone.name='TestBone';model.add(bone);
 const clip=(name,end)=>new THREE.AnimationClip(name,1,[new THREE.VectorKeyframeTrack('TestBone.position',[0,1],[0,0,0,end,0,0])]);
 const state={time:0,elapsed:10,events:[],plants:[],raid:null},visual=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>0,loadModel:async()=>({scene:model,animations:[clip('Spell_Shield',2),clip('Invoke',-2),clip('Spell_Attack',-4)]})});
 const event={id:'event-1',type:'SpellActivated',kind:'shield',commandId:'shield-1',presentation:{elapsed:9.8,origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}}};
 try{await visual.prepare();visual.sync([{kind:'event',eventId:event.id,at:9.8}],[event]);visual.tick();assert.ok(bone.position.x>0,'authored shield action must be sampled');}finally{visual.dispose();}
});
test('shield uses the established cyan guardian tint',()=>{
 const style=createWebGpuGuardianStyle();style.update({state:{time:0},age:.3,originY:0,modelBottom:0,modelHeight:3,impact:.48,kind:'shield'});assert.equal(style.uniforms.uSpiritTint.value.getHex(),0x8be8ec);
});
