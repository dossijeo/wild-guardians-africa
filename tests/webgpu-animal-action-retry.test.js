import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

for(const mode of ['failure','cancel','unpublished'])test(`concurrent Walk and Run ${mode} cannot recursively resubmit each other`,async()=>{
 const entity={id:'a',species:'hyena',status:'entering'},state={raid:{animals:[entity]}},attempts={Walk:0,Run:0},loads={Walk:0,Run:0},errors=[];
 const install=kind=>async()=>{attempts[kind]++;if(attempts[kind]>1)return true;if(mode==='unpublished')return false;throw mode==='cancel'?new DOMException('superseded','AbortError'):Error('invalid clip');};
 const roster=createWebGpuAnimalRoster({scene:new Group(),residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{async get(){loads.Walk++;return {};}},bakedRunBank:{async get(){loads.Run++;return {};}},onBakedWalkError:(_,error)=>errors.push(error),createAnimal:async()=>({root:new Group(),update(){this.root.visible=true;},installBakedWalk:install('Walk'),installBakedRun:install('Run'),dispose(){}})});
 try{roster.sync();await flush();await flush();assert.deepEqual(attempts,{Walk:1,Run:1});assert.equal(errors.length,mode==='failure'?2:0);roster.sync();await flush();await flush();assert.deepEqual(attempts,mode==='failure'?{Walk:1,Run:1}:{Walk:2,Run:2});if(mode==='failure'){entity.status='retreating';roster.sync();await flush();await flush();assert.deepEqual(attempts,{Walk:2,Run:2});}else assert.deepEqual(loads,{Walk:1,Run:1},'cancelled candidates reuse their loaded clips');}finally{roster.dispose();}
});

for(const mode of ['failure','cancel','unpublished'])test(`Attack ${mode} is bounded by confirmed action and admission generation`,async()=>{
 const entity={id:'a',species:'hyena',status:'attacking',attackId:'first',animation:'Bite'},state={raid:{animals:[entity]}};let attempts=0;const errors=[];
 const roster=createWebGpuAnimalRoster({scene:new Group(),residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedAttackBank:{get:async()=>({})},onBakedWalkError:(_,error)=>errors.push(error),createAnimal:async()=>({root:new Group(),update(){this.root.visible=true;},async installBakedAttack(){if(++attempts>1)return true;if(mode==='unpublished')return false;throw mode==='cancel'?new DOMException('superseded','AbortError'):Error('invalid clip');},dispose(){}})});
 try{roster.sync();await flush();await flush();assert.equal(attempts,1);assert.equal(errors.length,mode==='failure'?1:0);roster.sync();await flush();assert.equal(attempts,mode==='failure'?1:2);if(mode==='failure'){entity.attackId='second';roster.sync();await flush();assert.equal(attempts,2);}}finally{roster.dispose();}
});

test('cancelled walk download waits for a new publication and cannot resurrect a removed actor',async()=>{
 const entity={id:'a',species:'hyena',status:'walking'},state={raid:{animals:[entity]}};let loads=0,finish,installs=0;
 const roster=createWebGpuAnimalRoster({scene:new Group(),residency:{},state,assetBank:{tick(){},dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get(){if(++loads===1)return Promise.reject(new DOMException('superseded','AbortError'));return new Promise(resolve=>{finish=resolve;});}},onBakedWalkError:()=>assert.fail('cancellation is not a content error'),createAnimal:async()=>({root:new Group(),update(){this.root.visible=true;},async installBakedWalk(){installs++;return true;},dispose(){}})});
 try{roster.sync();await flush();await flush();assert.equal(loads,1);roster.sync();await flush();assert.equal(loads,2);state.raid.animals=[];roster.sync();finish({});await flush();assert.equal(installs,0);assert.equal(roster.status().ready,0);}finally{roster.dispose();}
});
