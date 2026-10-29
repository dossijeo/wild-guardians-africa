import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GuardianSummons} from '../src/rendering/guardian-summons.js';
test('consecutive spells reuse exactly one body and clear the previous presentation',async()=>{
 const world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){this.clears=(this.clears??0)+1;},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 assert.equal(summons.slots.length,1);const slot=summons.slots[0];
 for(let i=0;i<20;i++){
  const event={type:'SpellActivated',kind:i%2?'attack':'growth',x:i,z:0,presentation:{origin:{x:i+2,y:2,z:0},contact:{x:i,y:1,z:0},elapsed:world.state.elapsed}};
  world.state.events.push(event);summons.update();
  assert.equal(summons.slots[0],slot);assert.equal(summons.slots.filter(s=>s.group.visible).length,1);assert.equal(summons.stats.active,1);assert.equal(slot.event,event);assert.equal(slot.group.position.x,i+2);world.state.elapsed+=.6;
 }
 assert.equal(summons.stats.reused,19);assert.equal(slot.aura.clears,20);
 world.state.elapsed+=3;summons.update();assert.equal(summons.stats.active,0);assert.ok([slot.group,slot.aura,slot.beam,slot.core,slot.impact,slot.vortex].every(o=>!o.visible));
 summons.dispose();assert.equal(world.scene.children.length,0);
});


test('Attack charges at the hand, travels before contact, and starts its impact flash on the shared marker',async()=>{
 const world={state:{events:[],elapsed:1,time:400},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 world.state.events.push({type:'SpellActivated',kind:'attack',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}});
 world.state.elapsed=1.1;summons.update();const slot=summons.slots[0];assert.equal(slot.at,1);assert.equal(slot.beam.visible,false);assert.equal(slot.impact.visible,false);assert.ok(slot.core.position.distanceTo(new THREE.Vector3(3,1,0))<.001);
 world.state.elapsed=1.2;summons.update();assert.equal(slot.beam.visible,true);assert.equal(slot.impact.visible,false);assert.ok(Math.abs(slot.core.position.x-1.2)<.001);
 world.state.elapsed=1.24;summons.update();assert.equal(slot.impact.visible,true);assert.ok(slot.core.position.distanceTo(new THREE.Vector3(0,1,0))<.001);
 world.state.elapsed=1.6;summons.update();assert.equal(slot.beam.visible,false);assert.equal(slot.impact.visible,false);assert.equal(slot.core.visible,false);summons.dispose();
});


test('a replacement summon waits until the single Guardian finishes its hand-fired attack',async()=>{
 const world={state:{events:[],elapsed:1,time:400},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 const attack={type:'SpellActivated',kind:'attack',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}};world.state.events.push(attack);summons.update();
 world.state.elapsed=1.1;const growth={type:'SpellActivated',kind:'growth',x:10,z:0,presentation:{origin:{x:12,y:1,z:0},contact:{x:10,y:1,z:0},elapsed:1.1}};world.state.events.push(growth);summons.update();
 const slot=summons.slots[0];assert.equal(slot.event,attack);assert.equal(slot.group.position.x,3);assert.equal(summons.stats.retainedAttacks,0);
 world.state.elapsed=1.2;summons.update();assert.equal(slot.beam.visible,true);assert.equal(slot.group.position.x,3);
 world.state.elapsed=1.24;summons.update();assert.equal(slot.impact.visible,true);assert.equal(slot.event,attack);
 world.state.elapsed=1.6;summons.update();assert.equal(slot.event.kind,'growth');assert.equal(slot.at,1.6);assert.equal(slot.group.position.x,12);assert.equal(summons.stats.retainedAttacks,0);assert.equal(summons.pending.length,0);
 world.state.elapsed=.5;summons.update();assert.equal(slot.event,null);summons.dispose();assert.equal(world.scene.children.length,0);
});

test('removing an Attack target before contact cancels the active summon without a ghost impact',async()=>{
 for(const removal of ['missing','gone'])for(const observedAt of [1.21,1.24,1.35]){
  const animal={id:'target',status:'walking'};
  const world={state:{events:[],elapsed:1,time:400,raid:{animals:[animal]}},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
  const summons=new GuardianSummons(world);await summons.ready;
  world.state.events.push({type:'SpellActivated',kind:'attack',targetId:animal.id,x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}});
  summons.update();world.state.elapsed=1.2;summons.update();assert.equal(summons.slots[0].beam.visible,true);
  if(removal==='missing')world.state.raid=null;else animal.status='gone';
  world.state.elapsed=observedAt;summons.update();assert.equal(summons.stats.active,0,removal+' observed at '+observedAt);
  assert.ok([summons.slots[0].group,summons.slots[0].beam,summons.slots[0].impact,summons.slots[0].core,summons.slots[0].aura,summons.slots[0].vortex].every(o=>!o.visible));
  world.state.elapsed=1.4;summons.update();assert.equal(summons.stats.active,0);assert.equal(summons.stats.retainedAttacks,0);summons.dispose();assert.equal(world.scene.children.length,0);
 }
});


test('tutorial guide yields to a spell and resumes the same body without retained spell tint or effects',async()=>{
 const model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));
 const world={state:{events:[],elapsed:1,time:150},camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),toon:{uniforms:{uLightDir:{value:new THREE.Vector3(0,1,0)},uNight:{value:0}}},assets:{model:async()=>({scene:model,animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 world.camera.position.set(0,10,10);
 const summons=new GuardianSummons(world);await summons.ready;let plans=0;
 summons.plan=()=>{plans++;return {x:2,y:2,z:0};};
 const guide={target:'center-site',position:[0,0,0]};summons.setGuide(guide);summons.update();
 const slot=summons.slots[0];assert.equal(summons.stats.active,1);assert.equal(summons.guiding,true);assert.equal(slot.model.scale.x,4.08);
 summons.setGuide({...guide,position:[0,0,0]});summons.update();assert.equal(plans,1,'stable hints reuse their placement');
 const event={type:'SpellActivated',kind:'multiply',x:3,z:0,presentation:{origin:{x:5,y:2,z:0},contact:{x:3,y:1,z:0},elapsed:1}};
 world.state.events.push(event);world.state.elapsed=1.3;summons.update();
 assert.equal(slot.event,event);assert.equal(summons.guiding,false);assert.equal(summons.stats.active,1);assert.equal(slot.model.scale.x,2.4);
 assert.equal(slot.materials[0].uniforms.uSpiritTint.value.getHex(),0xe5b4ff);
 world.state.elapsed=3.3;summons.update();
 assert.equal(summons.slots[0],slot);assert.equal(slot.event,null);assert.equal(summons.guiding,true);assert.equal(summons.stats.active,1,'no empty frame at handoff');assert.equal(slot.group.visible,true);
 assert.equal(slot.materials[0].uniforms.uSpiritTint.value.getHex(),0xffffff);
 assert.ok([slot.aura,slot.beam,slot.core,slot.impact].every(o=>!o.visible));assert.equal(slot.vortex.visible,true);
 summons.setGuide(null);summons.update();assert.equal(summons.stats.active,0);assert.equal(slot.group.visible,false);
 summons.setGuide(guide);summons.update();world.state.result={won:true};summons.update();assert.equal(summons.stats.active,0);assert.equal(summons.guide,null);
 summons.dispose();assert.equal(world.scene.children.length,0);model.children[0].geometry.dispose();model.children[0].material.dispose();
});


test('Multiply branches from both hands around the crop and reuses the draw for Grow',async()=>{
 const model=new THREE.Group();for(const [name,x] of [['HandL',-.3],['HandR',.3]]){const hand=new THREE.Bone();hand.name=name;hand.position.set(x,1,0);model.add(hand);}
 const world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>({scene:model,animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 const event={type:'SpellActivated',kind:'multiply',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}};world.state.events.push(event);summons.update();world.state.elapsed=1.5;summons.update();
 const slot=summons.slots[0],beam=slot.beam,matrix=new THREE.Matrix4(),trunks=[],ends=new Set();assert.equal(beam.count,8);
 for(let i=0;i<8;i++){beam.getMatrixAt(i,matrix);const start=new THREE.Vector3(0,-.5,0).applyMatrix4(matrix),end=new THREE.Vector3(0,.5,0).applyMatrix4(matrix);if(i<2){assert.ok(start.distanceTo(slot.hands[i].getWorldPosition(new THREE.Vector3()))<1e-5,JSON.stringify({i,start:start.toArray(),hand:slot.hands[i].getWorldPosition(new THREE.Vector3()).toArray(),matrix:matrix.elements,at:slot.at}));trunks.push(end);}else{assert.ok(start.distanceTo(trunks[Math.floor((i-2)/3)])<1e-5);assert.ok(Math.abs(end.distanceTo(slot.target)-.65)<1e-5);ends.add(end.toArray().map(v=>v.toFixed(3)).join(','));}}
 assert.equal(ends.size,6);assert.ok(slot.core.position.distanceTo(slot.target)<1e-6);
 world.state.events.push({...event,kind:'growth',presentation:{...event.presentation,elapsed:1.5}});world.state.elapsed=1.8;summons.update();assert.equal(slot.beam,beam);assert.equal(beam.count,2);summons.dispose();assert.equal(world.scene.children.length,0);
});

test('persistent guide placement follows orbit/zoom and obstacle changes without idle replanning',()=>{
 const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,10,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const nav={version:1};let plans=0;
 const guide=Object.create(GuardianSummons.prototype);guide.world={camera,nav};guide.guide={position:[1,0,2]};
 guide.plan=()=>({x:++plans,y:2,z:0});
 guide.refreshGuidePlacement(0);assert.equal(plans,1);
 for(let t=1;t<100;t++)guide.refreshGuidePlacement(t);assert.equal(plans,1,'stationary guide keeps its placement');
 camera.position.x+=2;guide.refreshGuidePlacement(100);assert.equal(plans,2);
 camera.position.x+=2;guide.refreshGuidePlacement(100.1);assert.equal(plans,2,'camera changes are rate limited');
 guide.refreshGuidePlacement(100.3);assert.equal(plans,3);
 camera.rotation.y+=.2;guide.refreshGuidePlacement(101);assert.equal(plans,4,'rotation without translation invalidates visibility');
 camera.zoom=2;camera.updateProjectionMatrix();guide.refreshGuidePlacement(102);assert.equal(plans,5,'zoom invalidates framing');
 nav.version++;guide.refreshGuidePlacement(102.01);assert.equal(plans,6,'new obstacle bypasses camera debounce');
 guide.guideOrigin=null;guide.refreshGuidePlacement(102.02);assert.equal(plans,7,'new target plans immediately');
});

test('scene disposal before the model finishes loading cannot resurrect a Guardian or allocate effects',async()=>{
 let finishLoad,allocations=0;
 const world={state:{events:[],elapsed:0},scene:new THREE.Scene(),assets:{model:()=>new Promise(resolve=>{finishLoad=resolve;})},vfxLibrary:{create:()=>{allocations++;throw Error('Effect allocated after disposal');}}};
 const summons=new GuardianSummons(world);summons.dispose();
 finishLoad({scene:new THREE.Group(),animations:[]});await summons.ready;
 assert.equal(allocations,0);assert.equal(world.scene.children.length,0);assert.equal(summons.slots.length,0);
 assert.equal(summons.beamGeometry,undefined);assert.equal(summons.attackEchoes,undefined);
 summons.dispose();assert.equal(world.scene.children.length,0);
});


test('GPU prewarm does not query placement in unloaded terrain',()=>{
 let retained=0,updated=0;
 const receiver={world:{state:{elapsed:1},controls:{target:new THREE.Vector3(0,1,0)}},vector:new THREE.Vector3(),up:new THREE.Vector3(0,1,0),slots:[],plan(){throw Error('terrain not resident');},attackEchoes:{retain(){retained++;},update(){updated++;}}};
 GuardianSummons.prototype.beginPrewarm.call(receiver);
 assert.equal(retained,0);assert.equal(updated,0);
});


test('disappearance sound starts once during dissolve, resets on reuse and skips an expired summon',async()=>{
 const cues=[],world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),onGuardianPresence:id=>cues.push(id),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 const cast=()=>{world.state.events.push({type:'SpellActivated',kind:'growth',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:world.state.elapsed}});summons.update();};
 cast();world.state.elapsed=2.49;summons.update();assert.deepEqual(cues,['spirit_appear']);
 world.state.elapsed=2.5;summons.update();assert.equal(summons.slots[0].group.visible,true);assert.deepEqual(cues,['spirit_appear','spirit_disappear']);
 world.state.elapsed=2.8;summons.update();assert.equal(cues.length,2);
 world.state.elapsed=3.3;summons.update();assert.equal(cues.length,2);assert.equal(summons.stats.active,0);
 cast();world.state.elapsed=4.81;summons.update();assert.equal(cues.filter(id=>id==='spirit_disappear').length,2);
 world.state.elapsed=6;cast();world.state.elapsed=10;summons.update();assert.equal(cues.filter(id=>id==='spirit_disappear').length,2);
 summons.dispose();
});


test('disposing an active summon clears diagnostics and releases owned resources only once',async()=>{
 const world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 world.state.events.push({type:'SpellActivated',kind:'growth',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}});summons.update();
 assert.equal(summons.stats.active,1);
 const disposed=new Map();
 for(const resource of [summons.beamGeometry,summons.ringGeometry,summons.coreGeometry,summons.slots[0].material]){
  disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));
 }
 summons.dispose();summons.dispose();summons.update();
 assert.equal(world.scene.children.length,0);assert.equal(summons.stats.active,0);
 assert.equal(summons.stats.retainedAttacks,0);assert.equal(summons.guide,null);
 for(const count of disposed.values())assert.equal(count,1,'owned GPU resources are released once');
});

test('four queued presentations fire sequentially from the visible hand and clear on interruption',async()=>{
 const world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){this.clears=(this.clears??0)+1;},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;

 const slot=summons.slots[0],hand=new THREE.Bone();hand.position.set(.4,.6,.2);slot.model.add(hand);slot.hand=hand;
 for(let i=0;i<4;i++)world.state.events.push({type:'SpellActivated',kind:'attack',x:i,z:0,presentation:{origin:{x:i+3,y:1,z:0},contact:{x:i,y:1,z:0},elapsed:1}});
 summons.update();assert.equal(summons.pending.length,3);
 for(let i=0;i<4;i++){
  world.state.elapsed=1+i*.6;summons.update();assert.equal(slot.event.x,i);
  world.state.elapsed+=.18;summons.update();assert.equal(slot.beam.visible,true);assert.equal(slot.beam.count,1);assert.equal(summons.stats.retainedAttacks,0);
  const matrix=new THREE.Matrix4();slot.beam.getMatrixAt(0,matrix);
  assert.ok(new THREE.Vector3(0,-.5,0).applyMatrix4(matrix).distanceTo(hand.getWorldPosition(new THREE.Vector3()))<1e-5);
 }
 summons.clear();assert.equal(summons.pending.length,0);assert.equal(slot.beam.visible,false);summons.dispose();
});


test('a queued missing victim is skipped without appearance audio or delaying a valid spell',async()=>{
 const cues=[],world={state:{events:[],elapsed:1,time:400,raid:{animals:[{id:'first',status:'walking'},{id:'removed',status:'walking'}]}},scene:new THREE.Scene(),onGuardianPresence:id=>cues.push(id),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 const event=(kind,targetId)=>({type:'SpellActivated',kind,targetId,x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}});
 world.state.events.push(event('attack','first'),event('attack','removed'),event('growth'));
 summons.update();assert.equal(summons.pending.length,2);assert.equal(cues.length,1);
 world.state.raid.animals.pop();world.state.elapsed=1.6;summons.update();
 assert.equal(summons.pending.length,0);assert.equal(summons.slots[0].event.kind,'growth');assert.equal(cues.length,2);
 summons.dispose();assert.equal(world.scene.children.length,0);
});


test('scene replacement and clock rollback discard queued attacks without replaying historical events',async()=>{
 const world={state:{events:[],elapsed:1,time:400},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 const event=()=>({type:'SpellActivated',kind:'attack',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:world.state.elapsed}});
 const queue=()=>{world.state.events.push(event(),event(),event(),event());summons.update();assert.equal(summons.pending.length,3);assert.equal(summons.stats.active,1);};
 const hidden=()=>{assert.equal(summons.pending.length,0);assert.equal(summons.stats.active,0);assert.equal(summons.slots[0].event,null);for(const key of ['group','aura','beam','impact','core','vortex'])assert.equal(summons.slots[0][key].visible,false,key);};
 queue();world.state={...world.state,events:[...world.state.events]};summons.update();hidden();
 world.state.events.push(event());summons.update();assert.equal(summons.stats.active,1,'new scene accepts new commands');
 world.state.elapsed=2;queue();world.state.elapsed=1.9;summons.update();hidden();
 world.state.events.push(event());summons.update();assert.equal(summons.stats.active,1,'rollback does not disable later commands');
 world.state.result='won';summons.update();hidden();summons.dispose();assert.equal(world.scene.children.length,0);
});


test('summon disposal releases owned effects but preserves cached source geometry and textures',async()=>{
 const geometry=new THREE.BoxGeometry(),texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:texture}),model=new THREE.Group();model.add(new THREE.Mesh(geometry,material));
 const world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>({scene:model,animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){this.disposalCount=(this.disposalCount??0)+1;}})}};
 world.toon={uniforms:{uLightDir:{value:new THREE.Vector3(0,1,0)},uNight:{value:0}}};
 const summons=new GuardianSummons(world);await summons.ready;const slot=summons.slots[0],v=slot.vortex,r=summons.ritual;
 const owned=[...slot.materials,slot.material,summons.beamGeometry,summons.ringGeometry,summons.coreGeometry,v.ribbonGeometry,v.ribbonMaterial,v.moteGeometry,v.moteMaterial,r.geometry,r.material];
 const counts=new Map();for(const resource of [...owned,geometry,material,texture]){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}
 const meshes=[];slot.model.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes[0].geometry,geometry);assert.notEqual(meshes[0].material,material);
 summons.dispose();summons.dispose();
 for(const resource of owned)assert.equal(counts.get(resource),1,'owned resource disposed once');
 for(const resource of [geometry,material,texture])assert.equal(counts.get(resource),0,'asset cache retains ownership');
 assert.equal(slot.aura.disposalCount,1);assert.equal(world.scene.children.length,0);
 geometry.dispose();material.dispose();texture.dispose();
});

test('an impact already presented with a live target keeps fading after that target disappears',async()=>{
 const animal={id:'target',status:'walking'};
 const world={state:{events:[],elapsed:1,time:400,raid:{animals:[animal]}},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 world.state.events.push({type:'SpellActivated',kind:'attack',targetId:animal.id,x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}});
 summons.update();world.state.elapsed=1.25;summons.update();
 const slot=summons.slots[0];assert.equal(slot.impact.visible,true);
 world.state.raid=null;world.state.elapsed=1.3;summons.update();
 assert.equal(slot.impact.visible,true);assert.equal(summons.stats.active,1);
 world.state.elapsed=4;summons.update();assert.equal(summons.stats.active,0);
 assert.ok([slot.group,slot.beam,slot.impact,slot.core,slot.aura,slot.vortex].every(o=>!o.visible));
 summons.dispose();assert.equal(world.scene.children.length,0);
});
