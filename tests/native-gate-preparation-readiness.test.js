import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
const sourcePath=new URL('../src/rendering/webgpu-world-surface.js',import.meta.url);
const source=readFileSync(sourcePath,'utf8');
const a=source.indexOf('  const nativePublicationWaiters='),b=source.indexOf('  const nativeFrameState=',a);
assert(a>=0&&b>a);
const createWaiter=new Function('stream',source.slice(a,b)+'return {wait:waitNativePublication,wake:wakeNativePublications,size:()=>nativePublicationWaiters.size};');

async function fixture(){
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const path=String(url).split('?')[0];if(!path.startsWith('/content/')&&!path.endsWith('.bin'))throw Error('texture intentionally unavailable');return new Response(await readFile(new URL('../public'+path,import.meta.url)));};
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));ground.rotation.x=-Math.PI/2;ground.updateMatrixWorld(true);
 const entity={id:'structure-1000000',kind:'wall',material:'zarzas',gate:true,status:'intact',hp:60,maxHp:60,x:0,z:0,yaw:0,gateOpen:0};
 const state={culture:'mapungubwe',elapsed:10,villages:[],structures:[entity]},scene=new THREE.Scene(),jobs=[],retired=[],errors=[];
 const waiter=createWaiter({status:()=>({sequence:83})}),controller=new AbortController();
 const admission={prepare(){throw Error('unexpected separate admission');},prepareAndPublish(object,{signal},publish){return new Promise((resolve,reject)=>{jobs.push({object,signal,fail:reject,finish(){publish();resolve();}});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});},deferRelease(object,release){retired.push(release);}};
 const view=createWebGpuSettlements({scene,state,residency:{get:()=>ground},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission:admission,enableStructurePreviews:true,onSelectableChange:()=>waiter.wake(),onTextureError:()=>{},onError:error=>{errors.push(error);}});
 try{await view.preparePreview('wall','zarzas');view.sync();await turn();assert.equal(jobs.length,1);
  return {view,state,scene,jobs,waiter,controller,errors,resources:{gates:[{entityId:entity.id}]},close(){controller.abort();view.dispose();for(const release of retired)release();ground.geometry.dispose();ground.material.dispose();globalThis.fetch=previousFetch;}};
 }catch(error){view.dispose();ground.geometry.dispose();ground.material.dispose();globalThis.fetch=previousFetch;throw error;}
}
test('published gate waits for its original wall admission and wakes after the owner is visible',async()=>{
 const f=await fixture();try{
  const root=f.scene.children[0],wall=f.jobs[0].object,geometry=wall.parts[0].mesh.geometry;
  assert.equal(root.visible,false);
  assert.throws(()=>f.view.prepareNativeGateMotors(f.resources,{signal:f.controller.signal,getPickTime:()=>0}),/wall not resident/);
  const ready=f.view.nativeGatePreparationReadiness(f.resources);assert.equal(ready(),false);
  let acquired=false;const wait=f.waiter.wait(83,f.controller.signal,ready).then(()=>{acquired=true;});
  await turn();assert.equal(acquired,false);assert.equal(f.waiter.size(),1);
  f.jobs[0].finish();await wait;
  assert.equal(f.waiter.size(),0);assert.equal(root.visible,true);assert.equal(ready(),true);
  assert.equal(f.scene.children[0],root);assert.equal(root.children[0],wall);assert.equal(wall.parts[0].mesh.geometry,geometry);assert.equal(f.jobs.length,1);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('cancelling the route wait does not cancel or replace the resident gate admission',async()=>{
 const f=await fixture();try{
  const root=f.scene.children[0],ready=f.view.nativeGatePreparationReadiness(f.resources),wait=f.waiter.wait(83,f.controller.signal,ready);
  f.controller.abort();await assert.rejects(wait,{name:'AbortError'});assert.equal(f.waiter.size(),0);assert.equal(f.jobs[0].signal.aborted,false);
  f.jobs[0].finish();await turn();assert.equal(f.scene.children[0],root);assert.equal(root.visible,true);assert.equal(f.jobs.length,1);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('a changed confirmed gate rejects the old waiter before admission',async()=>{
 const f=await fixture();try{
  const ready=f.view.nativeGatePreparationReadiness(f.resources),wait=f.waiter.wait(83,f.controller.signal,ready),rejected=assert.rejects(wait,/owner changed/);
  f.state.structures[0]={...f.state.structures[0],x:1};f.view.sync();await rejected;
  assert.equal(f.waiter.size(),0);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('recreating the same entity cannot satisfy a wait on its retired graphic owner',async()=>{
 const f=await fixture();try{
  const entity=f.state.structures[0],root=f.scene.children[0],ready=f.view.nativeGatePreparationReadiness(f.resources),wait=f.waiter.wait(83,f.controller.signal,ready),rejected=assert.rejects(wait,/owner changed/);
  f.state.structures=[];f.view.sync();f.state.structures=[entity];f.view.sync();await rejected;
  assert.equal(f.waiter.size(),0);assert.notEqual(f.scene.children[0],root);assert.equal(root.parent,null);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('failure of another wall does not reject a gate wait or a route with no gates',async()=>{
 const f=await fixture(),otherController=new AbortController();try{
  const ready=f.view.nativeGatePreparationReadiness(f.resources);let acquired=false;
  const wait=f.waiter.wait(83,f.controller.signal,ready).then(()=>{acquired=true;});
  const other=f.waiter.wait(84,otherController.signal),cancelled=assert.rejects(other,{name:'AbortError'});
  f.state.structures.push({...f.state.structures[0],id:'other-wall',gate:false,x:4});f.view.sync();await turn();assert.equal(f.jobs.length,2);
  f.jobs[1].fail(Error('unrelated wall failed'));await turn();assert.equal(acquired,false);assert.equal(f.waiter.size(),2);assert.equal(f.errors.length,1);
  f.jobs[0].finish();await wait;assert.equal(acquired,true);assert.equal(f.waiter.size(),1);otherController.abort();await cancelled;
 }finally{otherController.abort();f.close();}
});
test('failure of the required wall rejects only its own preparation wait',async()=>{
 const f=await fixture(),otherController=new AbortController();try{
  const ready=f.view.nativeGatePreparationReadiness(f.resources),wait=f.waiter.wait(83,f.controller.signal,ready),rejected=assert.rejects(wait,/required wall failed/);
  const other=f.waiter.wait(84,otherController.signal),cancelled=assert.rejects(other,{name:'AbortError'});
  f.jobs[0].fail(Error('required wall failed'));await rejected;assert.equal(f.waiter.size(),1);assert.equal(f.errors.length,1);
  otherController.abort();await cancelled;assert.equal(f.waiter.size(),0);
  const root=f.scene.children[0];f.view.sync();await turn();assert.equal(f.jobs.length,2);
  f.jobs[1].finish();await turn();assert.equal(f.scene.children[0],root);assert.equal(f.view.nativeGatePreparationReadiness(f.resources)(),true,'a later successful admission clears its owner error');
 }finally{otherController.abort();f.close();}
});
