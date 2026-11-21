import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BoxGeometry} from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

for(const kind of ['worker','animal'])test(`${kind} waits for visible terrain before binding historical motion to the admitted rig`,async()=>{
 const scene=new Scene(),clock=createConfirmedHistoricalClock({initialElapsed:1}),root=new Group(),geometry=new BoxGeometry(),material=new MeshBasicNodeMaterial(),mesh=new Mesh(geometry,material),errors=[];root.add(mesh);root.visible=false;scene.add(root);let terrain=false,bindings=0;
 const entity={id:'a',status:'walking',x:2,z:3,profile:'youngMale',species:'hyena'},state={workers:kind==='worker'?[entity]:[],raid:{animals:kind==='animal'?[entity]:[]}},actor={root,installBakedWalk:async()=>true,update(){root.visible=terrain;if(terrain)root.position.set(2,4,3);},dispose(){root.removeFromParent();}};
 const common={scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true},library:{fromMaterial:value=>value.clone()}},assetBank:{tick(){},dispose(){}},bakedWalkBank:{get:async()=>({})},pipelineAdmission:{prepare:async()=>{},async prepareAndPublish(_root,_options,publish){if(_options.materialAlternatives)bindings++;publish();}},experimentalHistoricalMotion:{actorIds:['a'],clock},onBakedWalkError:(_,error)=>errors.push(error),onError:error=>errors.push(error)};
 const roster=kind==='worker'?createWebGpuWorkerRoster({...common,createWorker:async()=>actor}):createWebGpuAnimalRoster({...common,createAnimal:async()=>actor});
 try{roster.sync();await flush();await flush();assert.equal(roster.get('a'),actor);assert.equal(root.visible,false);assert.equal(mesh.material,material);assert.equal(bindings,0);assert.deepEqual(errors,[]);terrain=true;roster.sync();await flush();await flush();assert.equal(root.visible,true);assert.equal(roster.get('a'),actor);assert.notEqual(mesh.material,material);assert.deepEqual(root.position.toArray(),[2,4,3]);assert.equal(bindings,1);assert.deepEqual(errors,[]);}finally{roster.dispose();clock.dispose();geometry.dispose();material.dispose();}
});
