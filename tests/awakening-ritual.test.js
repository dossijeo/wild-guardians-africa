import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {createPlant} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {beginAwakening,revealAwakening,awakeningVisible,ritualVisualTarget,RITUAL} from '../src/rendering/awakening-presentation.js';
import {GuardianSummons} from '../src/rendering/guardian-summons.js';
import * as THREE from 'three';

test('ritual sizing can use historical context without restoring a removed target',()=>{
 const source={id:'plant-1',kind:'plant',species:'maiz',growth:12,x:2,z:3},event={targetId:'plant-1',presentation:{source}};
 assert.strictEqual(ritualVisualTarget(event,null),source);
 const live={id:'plant-1',species:'maiz',growth:15};assert.strictEqual(ritualVisualTarget(event,live),live);
 assert.equal(ritualVisualTarget({targetId:'other',presentation:{source}},null),null);
 assert.equal(ritualVisualTarget({targetId:'plant-1',presentation:{x:2,z:3}},null),null);
});
test('a delayed confirmed ritual sizes its effect without recreating the removed plant',async()=>{
 const samples=[],world={state:{events:[],elapsed:1,time:150,plants:[],structures:[]},scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),nav:{field:{surface:()=>0}},cropBatch:{sample:(species,growth)=>(samples.push({species,growth}),{height:1.25})},assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;summons.plan=()=>({x:0,y:2,z:0});
 world.state.events.push({id:'event-1',type:'BlessingApplied',commandId:'late',targetId:'plant-2',presentation:{x:0,z:0,elapsed:1,source:{id:'plant-2',kind:'plant',species:'maiz',growth:12,x:0,z:0}}});
 summons.update();assert.deepEqual(samples,[{species:'maiz',growth:12}]);assert.equal(summons.slots[0].ritualHeight,1.25);assert.equal(summons.slots[0].ritualTarget,null);assert.equal(world.state.plants.length,0);
 summons.dispose();
});
test('confirmed blessing persists before the pulse, duplicate commands spend nothing, reload reveals it',()=>{
 const s=Game.newGame({seed:712,slotId:'ritual'});s.structures.push({id:'center',kind:'center',status:'intact',hp:100,maxHp:100,x:10,z:10});const p=createPlant('plant-2','maiz',0,0,'center');s.plants.push(p);awakeningState(s).progress=100;
 const before=serialize(s);Game.previewBlessing(s,p.id);assert.equal(serialize(s),before,'preview/cancel is read-only');
 Game.bless(s,'ritual',p.id);beginAwakening(p,s.elapsed);assert.ok(p.blessing);assert.equal(s.awakenings.progress,0);assert.equal(awakeningVisible(p,s.elapsed),false);assert.equal(Game.bless(s,'ritual',p.id),false);assert.equal(s.awakenings.total,1);
 const restored=deserialize(serialize(s));assert.ok(restored.plants[0].blessing);assert.equal(restored.awakenings.progress,0);assert.equal(awakeningVisible(restored.plants[0],restored.elapsed),true);
 assert.equal(awakeningVisible(p,s.elapsed+RITUAL.pulse-.001),false);assert.equal(awakeningVisible(p,s.elapsed+RITUAL.pulse),true);
});
test('single-actor interruption finalizes presentation without mutating the committed target',()=>{
 const p={blessing:{at:10}},s={event:{kind:'awakening'},ritualTarget:p,aura:{clear(){}},group:{},beam:{},impact:{},core:{},vortex:{}};beginAwakening(p,10);const before=JSON.stringify(p);
 GuardianSummons.prototype.hide.call({world:{state:{elapsed:10.5}},ritual:{hide(){}}},s);
 assert.equal(awakeningVisible(p,10.5),true);assert.equal(JSON.stringify(p),before);assert.equal(s.event,null);for(const key of ['group','beam','impact','core','vortex'])assert.equal(s[key].visible,false);
 beginAwakening(p,11);assert.equal(awakeningVisible(p,11),true,'late duplicate event does not hide an already revealed blessing');
});
test('provisional awakening waits for confirmation, reconciles once and cancels cleanly',async()=>{
 const plant=createPlant('plant-2','maiz',0,0,'center'),world={state:{events:[],elapsed:1,time:150,plants:[plant],structures:[]},scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),nav:{field:{surface:()=>0}},cropBatch:{sample:()=>({height:1})},assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;summons.plan=()=>({x:0,y:2,z:0});
 summons.beginProvisionalAwakening('first',plant.id);summons.update();assert.equal(summons.slots[0].event.provisional,true);assert.equal(summons.ritual.preview.visible,true);assert.equal(plant.blessing,undefined);
 summons.rejectProvisional('first');assert.equal(summons.slots[0].event,null);assert.equal(summons.ritual.preview.visible,false);
 summons.beginProvisionalAwakening('second',plant.id);plant.blessing={at:1};world.state.events.push({id:'event-1',type:'BlessingApplied',commandId:'second',targetId:plant.id,presentation:{x:0,z:0,elapsed:1}});summons.update();
 assert.equal(summons.slots[0].event.commandId,'second');assert.equal(summons.slots[0].event.provisional,undefined);assert.equal(summons.ritual.preview.visible,false);assert.equal(awakeningVisible(plant,1),false);
 summons.dispose();assert.equal(world.scene.children.length,0);
});
