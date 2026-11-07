import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('a physical or reconciling animal reuses its downloaded running bake after it becomes safe',async()=>{
 const animal={id:'a',species:'hyena',status:'retreating'},state={raid:{animals:[animal]}},calls=[],errors=[];let physical=true,reconciling=false,finishReconciliation=false;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedRunBank:{async get(){calls.push('load');return {meta:{species:'hyena',clip:'Running'}};}},onBakedWalkError:(_,error)=>errors.push(error),createAnimal:()=>({root:new Group(),update(){this.root.visible=true;if(finishReconciliation)reconciling=false;},isPhysical:()=>physical,isReconciling:()=>reconciling,installBakedRun:async(bake,{isCurrent})=>{assert.equal(isCurrent(),true);assert.equal(bake.meta.clip,'Running');calls.push('install');return true;},dispose(){}})});
 try{roster.sync();await turn();await turn();assert.deepEqual(calls,['load']);for(let i=0;i<3;i++){roster.sync();await turn();}assert.deepEqual(calls,['load']);assert.deepEqual(errors,[]);
  physical=false;reconciling=true;roster.sync();await turn();assert.deepEqual(calls,['load']);finishReconciliation=true;roster.tick(1);await turn();await turn();assert.deepEqual(calls,['load','install']);assert.deepEqual(errors,[]);roster.sync();await turn();assert.deepEqual(calls,['load','install']);
 }finally{roster.dispose();}
});

test('a running bake cancelled during admission cannot publish a stale physical pose',async()=>{
 const animal={id:'a',species:'lion',status:'entering'},state={raid:{animals:[animal]}},calls=[];let physical=false,finish;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedRunBank:{async get(){calls.push('load');return {};}},createAnimal:()=>({root:new Group(),update(){this.root.visible=true;},isPhysical:()=>physical,installBakedRun(_bake,{isCurrent}){calls.push('prepare');return new Promise((resolve,reject)=>{finish=()=>isCurrent()?resolve(true):reject(new DOMException('cancelled','AbortError'));});},dispose(){}})});
 try{roster.sync();await turn();await turn();assert.deepEqual(calls,['load','prepare']);physical=true;finish();await turn();roster.sync();await turn();assert.deepEqual(calls,['load','prepare']);physical=false;roster.sync();await turn();assert.deepEqual(calls,['load','prepare','prepare']);finish();await turn();assert.deepEqual(calls,['load','prepare','prepare']);}finally{roster.dispose();}
});

test('a deferred attack is retried only when the same confirmed attack is safe',async()=>{
 const animal={id:'a',species:'hyena',status:'attacking',animation:'Attack',attackId:'attack-1'},state={raid:{animals:[animal]}},calls=[],errors=[];let physical=true,reconciling=false;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedAttackBank:{async get(_species,name){calls.push('load:'+name);return {name};}},onBakedWalkError:(_,error)=>errors.push(error),createAnimal:()=>({root:new Group(),update(){this.root.visible=true;},isPhysical:()=>physical,isReconciling:()=>reconciling,installBakedAttack:async(bake,{isCurrent})=>{assert.equal(isCurrent(),true);calls.push('install:'+bake.name);return true;},dispose(){}})});
 try{roster.sync();await turn();await turn();assert.deepEqual(calls,['load:Attack']);for(let i=0;i<3;i++){roster.sync();await turn();}assert.deepEqual(calls,['load:Attack']);physical=false;reconciling=true;roster.sync();await turn();assert.deepEqual(calls,['load:Attack']);reconciling=false;roster.sync();await turn();await turn();assert.deepEqual(calls,['load:Attack','load:Attack','install:Attack']);assert.deepEqual(errors,[]);}finally{roster.dispose();}
});

test('an attack superseded during GPU admission cannot publish the old action',async()=>{
 const animal={id:'a',species:'lion',status:'attacking',animation:'Bite',attackId:'attack-1'},state={raid:{animals:[animal]}},calls=[];let finish;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedAttackBank:{async get(_species,name){return {name};}},createAnimal:()=>({root:new Group(),update(){this.root.visible=true;},installBakedAttack(bake,{isCurrent}){calls.push('prepare:'+bake.name);return new Promise((resolve,reject)=>{finish=()=>isCurrent()?resolve(true):reject(new DOMException('cancelled','AbortError'));});},dispose(){}})});
 try{roster.sync();await turn();await turn();assert.deepEqual(calls,['prepare:Bite']);animal.attackId='attack-2';animal.animation='Swipe';roster.sync();finish();await turn();await turn();assert.deepEqual(calls,['prepare:Bite','prepare:Swipe']);finish();await turn();assert.deepEqual(calls,['prepare:Bite','prepare:Swipe']);}finally{roster.dispose();}
});
