import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {createWebGpuAnimalBank} from '../src/rendering/webgpu-animal-bank.js';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('selectable generation observes rig admission, removal and provisional impact',async()=>{
 const animal={id:'a',species:'hyena',status:'walking',x:0,z:0},state={elapsed:1,raid:{animals:[animal]}},bank={tick(){},dispose(){}},changes=[],roster=createWebGpuAnimalRoster({scene:{},residency:{get:()=>null},state,renderer:{},assetBank:bank,onSelectableChange:()=>changes.push('change'),createAnimal:async()=>({update(){},dispose(){}})});
 roster.sync();await flush();assert.equal(changes.length,1);assert.equal(roster.beginImpact({kind:'castAttack',id:'attack',targetId:'a',x:0,z:0}),true);assert.equal(changes.length,2);roster.resolveImpact('attack',false);assert.equal(changes.length,3);state.raid.animals=[];roster.sync();assert.equal(changes.length,4);roster.dispose();
});
test('shares geometry and material per species while actor roots are independent',async()=>{
 let loads=0,disposed=0;const geometry=new BoxGeometry(),material=new MeshBasicMaterial(),source=new Group();source.add(new Mesh(geometry,material));const bank=createWebGpuAnimalBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>{loads++;return {scene:source,clips:[],dispose(){disposed++;geometry.dispose();material.dispose();}};}});
 const [a,b]=await Promise.all([bank.acquire('hyena'),bank.acquire('hyena')]);assert.equal(loads,1);assert.notEqual(a.model,b.model);assert.equal(a.model.children[0].geometry,b.model.children[0].geometry);assert.equal(a.model.children[0].material,b.model.children[0].material);assert.equal(bank.status().species[0].refs,2);a.release();a.release();assert.equal(bank.status().species[0].refs,1);b.release();assert.equal(disposed,1);assert.equal(bank.status().species.length,0);bank.dispose();assert.equal(disposed,1);
});
test('reconciles appearances, updates and removal and discards late loads',async()=>{
 const state={raid:{animals:[{id:'a',species:'hyena',status:'entering'}]}},pending=new Map(),disposed=[],updates=[],bank={tick(){},dispose(){this.closed=true;}},roster=createWebGpuAnimalRoster({scene:{},residency:{},state,renderer:{},assetBank:bank,createAnimal:({actorId})=>new Promise(resolve=>pending.set(actorId,resolve))});
 roster.sync();await flush();state.raid.animals=[];roster.sync();pending.get('a')({update(){updates.push('a');},dispose(){disposed.push('a');}});await flush();assert.deepEqual(disposed,['a']);assert.equal(roster.status().count,0);
 state.raid.animals=[{id:'b',species:'hyena',status:'entering'}];roster.sync();await flush();pending.get('b')({update(){updates.push('b');},dispose(){disposed.push('b');}});await flush();assert.equal(roster.status().ready,1);roster.sync();assert.deepEqual(updates,['b','b']);state.raid.animals[0].status='gone';roster.sync();assert.deepEqual(disposed,['a','b']);roster.dispose();assert.equal(bank.closed,true);
});
test('disposal during a shared load releases the late resource without publishing a model',async()=>{
 let resolve,disposed=0;const wait=new Promise(r=>{resolve=r;}),bank=createWebGpuAnimalBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:()=>wait});const pending=bank.acquire('buffalo');bank.dispose();resolve({scene:new Group(),clips:[],dispose(){disposed++;}});await assert.rejects(pending,{name:'AbortError'});assert.equal(disposed,1);
});
test('late-loading actor receives the latest confirmed physical pose and releases it',async()=>{
 const state={raid:{animals:[{id:'a',species:'hyena',status:'entering'}]}},bank={tick(){},dispose(){}},values=[];let resolve;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{},state,renderer:{},assetBank:bank,createAnimal:({getPose})=>new Promise(done=>{resolve=()=>done({update(){values.push(getPose());},validatePose(pose){if(pose.bad)throw Error('bad rig');},dispose(){}});})});
 roster.sync();await flush();const first={actorId:'a',active:true},latest={actorId:'a',active:true,revision:2};roster.setPoses(new Map([['a',first]]));roster.setPoses(new Map([['a',latest]]));resolve();await flush();assert.equal(values.at(-1),latest);assert.throws(()=>roster.validatePoses(new Map([['a',{bad:true}]])),/bad rig/);roster.setPoses(new Map());roster.sync();assert.equal(values.at(-1),null);roster.dispose();
});
test('provisional attack is visual only, rejects cleanly and yields to confirmed physics',async()=>{
 const animal={id:'a',species:'hyena',status:'walking',x:2,z:3,radius:.7},state={elapsed:10,raid:{animals:[animal]}},before=JSON.stringify(state),bank={tick(){},dispose(){}};let hooks,updates=0;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{get:()=>null},state,assetBank:bank,createAnimal:args=>{hooks=args;return {update(){updates++;if(hooks.getPose())hooks.onPhysical();},dispose(){}};}});roster.sync();await flush();
 const command={kind:'castAttack',id:'one',targetId:'a',selection:{origin:{x:0,y:1,z:0},contact:{x:2,y:1,z:3}}};assert.equal(roster.beginImpact(command),true);assert.equal(roster.beginImpact(command),false);assert.equal(roster.status().provisionalImpacts,1);assert.equal(JSON.stringify(state),before);
 roster.resolveImpact('one',false);assert.equal(roster.status().provisionalImpacts,0);assert.ok(updates>=2);assert.equal(JSON.stringify(state),before);
 assert.equal(roster.beginImpact({...command,id:'two'}),true);roster.resolveImpact('two',true);assert.equal(roster.status().provisionalImpacts,1);roster.setPoses(new Map([['a',{actorId:'a',active:true}]]));roster.sync();assert.equal(roster.status().provisionalImpacts,0);assert.equal(JSON.stringify(state),before);
 roster.setPoses(new Map());animal.magicDown={phase:'falling'};assert.equal(roster.beginImpact({...command,id:'three'}),false);roster.dispose();
});
test('delayed impacts remain pending until rejection, physics, actor removal or disposal',async()=>{
 const animal={id:'a',species:'hyena',status:'walking',x:2,z:3,radius:.7},state={elapsed:10,raid:{animals:[animal]}},bank={tick(){},dispose(){}},roster=createWebGpuAnimalRoster({scene:{},residency:{get:()=>null},state,assetBank:bank,createAnimal:()=>({update(){},dispose(){}})});
 roster.sync();await flush();const command={kind:'castAttack',id:'delayed',targetId:'a',selection:{origin:{x:0,y:1,z:0},contact:{x:2,y:1,z:3}}};assert.equal(roster.beginImpact(command),true);roster.tick(performance.now()+20000);assert.equal(roster.status().provisionalImpacts,1);assert.equal(roster.beginImpact({...command,id:'duplicate'}),false);roster.resolveImpact('delayed',false);assert.equal(roster.status().provisionalImpacts,0);
 assert.equal(roster.beginImpact({...command,id:'removed'}),true);state.raid.animals=[];roster.sync();assert.equal(roster.status().provisionalImpacts,0);roster.dispose();
});
