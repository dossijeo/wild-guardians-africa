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
  assert.equal(summons.slots[0],slot);assert.equal(summons.slots.filter(s=>s.group.visible).length,1);assert.equal(summons.stats.active,1);assert.equal(slot.event,event);assert.equal(slot.group.position.x,i+2);world.state.elapsed+=.1;
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


test('a replacement summon preserves the old projectile and contact without retaining a second Guardian',async()=>{
 const world={state:{events:[],elapsed:1,time:400},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 const attack={type:'SpellActivated',kind:'attack',x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}};world.state.events.push(attack);summons.update();
 world.state.elapsed=1.1;const growth={type:'SpellActivated',kind:'growth',x:10,z:0,presentation:{origin:{x:12,y:1,z:0},contact:{x:10,y:1,z:0},elapsed:1.1}};world.state.events.push(growth);summons.update();
 const slot=summons.slots[0],pool=summons.attackEchoes;assert.equal(slot.event,growth);assert.equal(slot.group.position.x,12);assert.equal(summons.slots.filter(s=>s.group.visible).length,1);assert.equal(pool.stats.active,1);
 world.state.elapsed=1.2;summons.update();const matrix=new THREE.Matrix4(),point=new THREE.Vector3();pool.meshes.core.getMatrixAt(0,matrix);point.setFromMatrixPosition(matrix);assert.ok(Math.abs(point.x-1.2)<.001);assert.equal(pool.meshes.ring.count,0);
 world.state.elapsed=1.24;summons.update();assert.equal(pool.meshes.ring.count,1);pool.meshes.ring.getMatrixAt(0,matrix);point.setFromMatrixPosition(matrix);assert.ok(point.distanceTo(new THREE.Vector3(0,1,0))<.001);
 world.state.elapsed=1.6;summons.update();assert.equal(pool.stats.active,0);assert.ok(pool.draws.every(m=>!m.visible));assert.equal(slot.event,growth);
 world.state.elapsed=.5;summons.update();assert.equal(slot.event,null);summons.dispose();assert.equal(world.scene.children.length,0);
});


test('removing an Attack target before contact cancels the active summon without a ghost impact',async()=>{
 for(const removal of ['missing','gone']){
  const animal={id:'target',status:'walking'};
  const world={state:{events:[],elapsed:1,time:400,raid:{animals:[animal]}},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
  const summons=new GuardianSummons(world);await summons.ready;
  world.state.events.push({type:'SpellActivated',kind:'attack',targetId:animal.id,x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:1}});
  summons.update();world.state.elapsed=1.2;summons.update();assert.equal(summons.slots[0].beam.visible,true);
  if(removal==='missing')world.state.raid=null;else animal.status='gone';
  world.state.elapsed=1.21;summons.update();assert.equal(summons.stats.active,0,removal);
  assert.ok([summons.slots[0].group,summons.slots[0].beam,summons.slots[0].impact,summons.slots[0].core,summons.slots[0].aura,summons.slots[0].vortex].every(o=>!o.visible));
  world.state.elapsed=1.3;summons.update();assert.equal(summons.stats.active,0);assert.equal(summons.stats.retainedAttacks,0);summons.dispose();assert.equal(world.scene.children.length,0);
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
 assert.equal(retained,1);assert.equal(updated,1);
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
