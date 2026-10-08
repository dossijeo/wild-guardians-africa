import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCropCapacity} from '../src/rendering/initial-crop-capacity.js';
import {farmHomeFocus} from '../src/rendering/farm-focus.js';
const plant=(x,z,alive=true)=>({x,z,alive});
const state=plants=>({plants,structures:[],villages:[{x:10,z:20}]});
test('empty and small farms preserve original minimum; exact visibility boundary is excluded',()=>{assert.equal(initialCropCapacity(state([])),128);const s=state(Array.from({length:128},()=>plant(10,20)));s.plants.push(plant(150,20),plant(10,160),plant(10,20,false));assert.equal(initialCropCapacity(s),128);s.plants.push(plant(149.999,20));assert.equal(initialCropCapacity(s),256);});
test('historical distant/dead plants do not inflate a dense restoration batch',()=>{const s=state([...Array.from({length:1257},()=>plant(10,20)),...Array.from({length:20000},()=>plant(1000,1000)),...Array.from({length:3000},()=>plant(10,20,false))]);const before=JSON.stringify(s);assert.equal(initialCropCapacity(s),2048);assert.equal(JSON.stringify(s),before);const focus=farmHomeFocus(s);const visible=s.plants.filter(p=>p.alive&&Math.hypot(p.x-focus.x,p.z-focus.z)<140);assert.equal(initialCropCapacity(s),2**Math.ceil(Math.log2(visible.length)));});
test('uses the same operational work center as final focusFarm, with village fallback',()=>{const s=state(Array.from({length:130},()=>plant(1000,1000)));s.structures=[{kind:'center',x:1000,z:1000,status:'intact'}];assert.equal(initialCropCapacity(s),256);s.structures[0].status='destroyed';assert.equal(initialCropCapacity(s),128);});

test('first real scene sync keeps an appropriately prepared dense batch instead of disposing it',async()=>{
 const {WorldScene}=await import('../src/rendering/scene.js'),{Scene,Group,DirectionalLight,Vector3}=await import('three');
 const s=state([...Array.from({length:1257},()=>plant(10,20)),...Array.from({length:2000},()=>plant(1000,1000)),plant(10,20,false)]);Object.assign(s,{elapsed:0,time:0,crates:[],workers:[],spells:[]});s.villages[0].id='v';
 let updated;const batch={capacity:initialCropCapacity(s),dispose(){throw Error('Prepared batch disposed');},update(plants){updated=plants;}};
 const world={state:s,cropModels:[],cropBatch:batch,controls:{target:new Vector3(10,0,20)},objects:new Map([['v',new Group()]]),scene:new Scene(),mixers:new Map(),nav:{field:{surface:()=>0}},pack:{profile:{bg:'#aaaaaa'}},renderer:{setClearColor(){}},destructionPass:{},sun:new DirectionalLight(),ambient:{},prepareUpcomingAnimalRigs(){}};
 WorldScene.prototype.sync.call(world,0);assert.equal(world.cropBatch,batch);assert.equal(batch.capacity,2048);assert.equal(updated.length,1257);assert.ok(updated.every(p=>p.alive&&Math.hypot(p.x-10,p.z-20)<140));
});
