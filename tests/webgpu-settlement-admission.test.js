import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {readFile} from 'node:fs/promises';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('a cancelled center retains its shared progressive package while compiling',async()=>{
 const previousFetch=globalThis.fetch;globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]});let finish,disposed=0;const registry=createWebGpuResourceRegistry(),scene=new THREE.Scene(),root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));const terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);
 const state={culture:'mapungubwe',elapsed:0,villages:[],structures:[{id:'c',kind:'center',culture:'mapungubwe',status:'intact',x:0,z:0,yaw:0,hp:10,maxHp:10}]},renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera:new THREE.PerspectiveCamera()}),view=createWebGpuSettlements({scene,state,residency:{get:()=>terrain},renderer,pipelineAdmission:admission,resourceRegistry:registry,loadProgressiveCenter:async()=>({preview:{scene:root},start(){},tick(){},dispose(){disposed++;}})});
 try{view.sync();for(let i=0;i<10&&!finish;i++)await turn();assert.equal(typeof finish,'function');assert.equal(registry.status().owned.length,1);registry.dispose();view.dispose();assert.equal(registry.status().owned.length,1);assert.equal(disposed,0);finish();await turn();assert.equal(disposed,1);assert.equal(registry.status().owned.length,0);assert.equal(scene.children.length,0);}finally{view.dispose();admission.dispose();registry.dispose();root.children[0].geometry.dispose();root.children[0].material.dispose();terrain.geometry.dispose();terrain.material.dispose();globalThis.fetch=previousFetch;}
});

test('removing and recreating a center cannot publish its stale compiled instance',async()=>{
 const previousFetch=globalThis.fetch;globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]});const scene=new THREE.Scene(),source=new THREE.Group(),terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),jobs=[];source.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);
 const entity={id:'c',kind:'center',culture:'mapungubwe',status:'intact',x:0,z:0,yaw:0,hp:10,maxHp:10},state={culture:'mapungubwe',elapsed:0,villages:[],structures:[entity]},renderer={backend:{isWebGPUBackend:true},compileAsync:group=>new Promise(resolve=>jobs.push({group,resolve}))},admission=createWebGpuPipelineAdmission({renderer,scene,camera:new THREE.PerspectiveCamera()}),view=createWebGpuSettlements({scene,state,residency:{get:()=>terrain},renderer,pipelineAdmission:admission,loadProgressiveCenter:async()=>({preview:{scene:source},start(){},tick(){},dispose(){}})});
 try{view.sync();for(let i=0;i<10&&!jobs.length;i++)await turn();assert.equal(jobs.length,1);const old=jobs[0].group;assert.equal(old,scene.children[0]);assert.equal(old.visible,false);state.structures=[];view.sync();assert.equal(old.parent,null);state.structures=[{...entity,x:2}];view.sync();assert.equal(scene.children.length,1);const replacement=scene.children[0];assert.notEqual(replacement,old);assert.equal(replacement.visible,false);jobs[0].resolve();for(let i=0;i<10&&jobs.length<2;i++)await turn();assert.equal(jobs[1].group,replacement);assert.equal(replacement.visible,false);jobs[1].resolve();await turn();assert.equal(replacement.visible,true);assert.equal(old.parent,null);}finally{view.dispose();admission.dispose();source.children[0].geometry.dispose();source.children[0].material.dispose();terrain.geometry.dispose();terrain.material.dispose();globalThis.fetch=previousFetch;}
});

async function fixture(){
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]});
 const scene=new THREE.Scene(),terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);
 const state={culture:'mapungubwe',elapsed:0,villages:[],structures:[{id:'c1',kind:'center',culture:'mapungubwe',status:'intact',x:0,z:0,yaw:0,hp:10,maxHp:10}]};
 let finish,fail,signal,preparedGroup,started=0,disposed=0;const errors=[];
 const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));
 const pipelineAdmission={prepare(group,options){assert.notEqual(group.children[0],root);assert.equal(group.children[0].children[0].geometry,root.children[0].geometry);preparedGroup=group;signal=options.signal;return new Promise((resolve,reject)=>{finish=resolve;fail=reject;signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}};
 const view=createWebGpuSettlements({scene,state,residency:{get:()=>terrain},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission,onError:error=>errors.push(error.message),loadProgressiveCenter:async()=>({preview:{scene:root},start(){started++;},tick(){},dispose(){disposed++;}})});
 view.sync();for(let i=0;i<10&&!finish;i++)await turn();assert.ok(finish,'center must request admission');
 return {view,scene,state,finish,fail,errors,get preparedGroup(){return preparedGroup;},get signal(){return signal;},get started(){return started;},get disposed(){return disposed;},cleanup(){view.dispose();terrain.geometry.dispose();terrain.material.dispose();root.children[0].geometry.dispose();root.children[0].material.dispose();globalThis.fetch=previousFetch;}};
}

test('a center is published only after its loaded model is admitted',async()=>{
 const f=await fixture();try{assert.equal(f.view.status().centers,1);assert.equal(f.started,1);assert.equal(f.scene.children[0],f.preparedGroup);assert.equal(f.preparedGroup.visible,false);f.finish();await turn();assert.equal(f.view.status().centers,1);assert.equal(f.started,1);assert.equal(f.scene.children.length,1);assert.equal(f.preparedGroup.visible,true);}finally{f.cleanup();}
});

test('closing the scene cancels a pending center without publishing it',async()=>{
 const f=await fixture();try{f.view.dispose();assert.equal(f.signal.aborted,true);await turn();assert.equal(f.view.status().centers,0);assert.equal(f.started,1);assert.equal(f.disposed,1);}finally{f.cleanup();}
});

test('a failed admission reports the error and does not expose the center',async()=>{
 const f=await fixture();try{f.fail(Error('pipeline failed'));await turn();assert.deepEqual(f.errors,['pipeline failed']);assert.equal(f.view.status().centers,0);assert.equal(f.scene.children.length,0);assert.equal(f.started,1);}finally{f.cleanup();}
});

test('a failed catalogue request can be retried for a structure preview',async()=>{
 const previousFetch=globalThis.fetch;let unavailable=true,requests=0;globalThis.fetch=async url=>{if(String(url).includes('villages')){requests++;if(unavailable)throw Error('catalogue offline');}return {ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]};};
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();root.add(new THREE.Mesh(geometry,material));const errors=[],view=createWebGpuSettlements({scene:new THREE.Scene(),state:{culture:'mapungubwe',elapsed:0,villages:[],structures:[]},residency:{get:()=>null},renderer:{backend:{isWebGPUBackend:true}},enableStructurePreviews:true,onError:error=>errors.push(error.message),loadProgressiveCenter:async()=>({preview:{scene:root},start(){},tick(){},dispose(){}})});
 try{await assert.rejects(view.preparePreview('center','mapungubwe'),/catalogue offline/);unavailable=false;await view.preparePreview('center','mapungubwe');assert.equal(requests,2);assert.deepEqual(errors,['catalogue offline']);}finally{view.dispose();geometry.dispose();material.dispose();globalThis.fetch=previousFetch;}
});

test('center preview admits the actual instance and cancels stale preparation',async()=>{
 const previousFetch=globalThis.fetch;globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]});
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();root.add(new THREE.Mesh(geometry,material));const terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);const scene=new THREE.Scene(),requests=[];
 const pipelineAdmission={prepare(){throw Error('non-atomic admission used');},prepareAndPublish(group,{signal},publish){return new Promise(resolve=>requests.push({group,signal,resolve:()=>{publish();resolve();}}));}},view=createWebGpuSettlements({scene,state:{culture:'mapungubwe',elapsed:0,villages:[],structures:[]},residency:{get:()=>terrain},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission,enableStructurePreviews:true,loadProgressiveCenter:async()=>({preview:{scene:root},start(){},tick(){},dispose(){}})});
 try{await view.preparePreview('center','mapungubwe');assert.equal(requests.length,0);assert.equal(view.beginPreview({id:'p',kind:'center',culture:'mapungubwe',x:0,z:0}),true);assert.equal(view.status().provisional,1);assert.equal(scene.children.length,1);const first=scene.children[0];assert.equal(first.visible,false);await turn();assert.equal(requests[0].group,first);assert.equal(first.children[0].children[0].material.transparent,true);view.rejectPreview('p');assert.equal(requests[0].signal.aborted,true);assert.equal(scene.children.length,0);requests[0].resolve();await turn();assert.equal(first.parent,null);assert.equal(first.visible,false);assert.equal(view.beginPreview({id:'q',kind:'center',culture:'mapungubwe',x:0,z:0}),true);const second=scene.children[0];assert.equal(second.visible,false);await turn();assert.equal(requests[1].group,second);requests[1].resolve();await turn();assert.equal(second.visible,true);view.rejectPreview('q');assert.equal(scene.children.length,0);
 }finally{view.dispose();terrain.geometry.dispose();terrain.material.dispose();geometry.dispose();material.dispose();globalThis.fetch=previousFetch;}
});

test('wall preview admits its real instanced mesh and defers disposal after cancellation',async()=>{
 const previousFetch=globalThis.fetch;globalThis.fetch=async url=>{const path=String(url).split('?')[0];if(!path.startsWith('/content/')&&!path.endsWith('.bin'))throw Error('texture intentionally unavailable');return new Response(await readFile('public'+path));};
 const terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);const scene=new THREE.Scene(),requests=[],releases=[];
 const pipelineAdmission={prepare(){throw Error('non-atomic admission used');},prepareAndPublish(group,{signal},publish){return new Promise(resolve=>requests.push({group,signal,resolve:()=>{publish();resolve();}}));},deferRelease(object,release){releases.push({object,release});}};
 const view=createWebGpuSettlements({scene,state:{culture:'mapungubwe',elapsed:0,villages:[],structures:[]},residency:{get:()=>terrain},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission,enableStructurePreviews:true,onTextureError:()=>{}});
 try{await view.preparePreview('wall','zarzas');assert.equal(requests.length,0);assert.equal(view.beginPreview({id:'wall-preview',kind:'wall',material:'zarzas',x:0,z:0}),true);assert.equal(view.status().provisional,1);const wall=scene.children[0];assert.equal(wall.isInstancedMesh,true);assert.equal(wall.visible,false);await turn();assert.equal(requests[0].group,wall);view.rejectPreview('wall-preview');assert.equal(requests[0].signal.aborted,true);assert.equal(wall.parent,null);assert.equal(releases.length,1);assert.equal(releases[0].object,wall);requests[0].resolve();await turn();assert.equal(wall.visible,false);releases[0].release();
 }finally{view.dispose();terrain.geometry.dispose();terrain.material.dispose();globalThis.fetch=previousFetch;}
});
