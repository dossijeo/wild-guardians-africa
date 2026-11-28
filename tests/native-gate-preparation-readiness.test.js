import {spatialStructureBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
import {uniform} from 'three/tsl';
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

async function fixture({ruined=false}={}){
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const path=String(url).split('?')[0];if(!path.startsWith('/content/')&&!path.endsWith('.bin'))throw Error('texture intentionally unavailable');return new Response(await readFile(new URL('../public'+path,import.meta.url)));};
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));ground.rotation.x=-Math.PI/2;ground.updateMatrixWorld(true);
 const entity={id:'structure-1000000',kind:'wall',material:'zarzas',gate:!ruined,status:ruined?'ruined':'intact',hp:ruined?0:60,maxHp:60,x:0,z:0,yaw:0,gateOpen:0};
 const state={culture:'mapungubwe',elapsed:10,villages:[],structures:[entity]},scene=new THREE.Scene(),jobs=[],retired=[],errors=[];
 const waiter=createWaiter({status:()=>({sequence:83})}),controller=new AbortController();
 const admission={prepare(){throw Error('unexpected separate admission');},prepareAndPublish(object,{signal},publish){return new Promise((resolve,reject)=>{jobs.push({object,signal,fail:reject,finish(){publish();resolve();}});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});},deferRelease(object,release){retired.push(release);}};
 const view=createWebGpuSettlements({scene,state,residency:{get:()=>ground},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission:admission,...(ruined?{confirmedClock:{node:uniform(10)},getPresentationTime:()=>state.elapsed}:{}),enableStructurePreviews:true,onSelectableChange:()=>waiter.wake(),onTextureError:()=>{},onError:error=>{errors.push(error);}});
 try{await view.preparePreview('wall','zarzas');view.sync();await turn();assert.equal(jobs.length,1);
  return {view,state,scene,jobs,retired,waiter,controller,errors,resources:{gates:[{entityId:entity.id}]},close(){controller.abort();view.dispose();for(const release of retired)release();ground.geometry.dispose();ground.material.dispose();globalThis.fetch=previousFetch;}};
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

{
function data(f){const source=f.state.structures[0],entity={...source,hp:source.maxHp,status:'intact',collapseRemaining:0};const shape=spatialStructureBarriers(entity)[0];
 const template={kind:'native-barrier-addition-reference',version:1,sourceControlSequence:1,worldBoundary:{version:1,authorityEpoch:'ruin',nativeSession:1,ticket:2,effectiveTime:10},additions:[{entityId:entity.id,...Object.fromEntries(['x','z','halfX','halfZ','yaw'].map(k=>[k,Math.fround(shape[k])])),passMask:0}]};
 return {entity,template,proof:{kind:'native-barrier-addition-attestation',version:1,preparedReference:template,reference:{...template,worldBoundary:{...template.worldBoundary,ticket:3,effectiveTime:10.6}},nativeIds:[71]}};
}
test('resident Settlement reconciles the acquired Repair on the original root after a held READY',async()=>{
 const f=await fixture({ruined:true});try{f.jobs[0].finish();await turn();const root=f.scene.children[0],ruin=f.jobs[0].object,original=ruin.parts[0].mesh.geometry,{entity,template,proof}=data(f);
  const [p]=await f.view.prepareNativeWallAdditions([entity],{signal:f.controller.signal,template});assert(p.valid());assert.equal(root.children.length,2);assert(ruin.visible);assert.equal(p.object.visible,false);
  f.state.elapsed=10.6;f.view.sync();assert(p.valid());assert.equal(f.jobs.length,1);assert.equal(ruin.parts[0].mesh.geometry,original);
  p.acceptNativeBarrierBinding(proof);p.activate();p.attach();const final=p.finalize();final.retire();final.notify();assert.equal(root.parent,f.scene);
  Object.assign(f.state.structures[0],entity,{wallPresentation:{from:0,to:1,at:10.6}});f.view.sync();assert.equal(f.scene.children[0],root);assert.equal(p.object.parts.length,4);assert(p.object.nativeGpuRepair.current());assert.equal(f.jobs.length,1);
  f.state.elapsed=10.8;f.view.sync();assert(p.object.nativeGpuRepair.current());assert.equal(f.jobs.length,1);
  f.state.elapsed=11.1;f.view.sync();await turn();assert.equal(f.jobs.length,2);assert.equal(f.jobs[1].object.parts.length,1);f.jobs[1].finish();await turn();assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
for(const change of ['abort','recreated-source','moved-source','foreign-receipt','aliased-geometry'])test(`resident Repair rejects ${change} without disposing the live ruin`,async()=>{
 const f=await fixture({ruined:true});try{f.jobs[0].finish();await turn();const ruin=f.jobs[0].object,geometry=ruin.parts[0].mesh.geometry,{entity,template,proof}=data(f);let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  const [p]=await f.view.prepareNativeWallAdditions([entity],{signal:f.controller.signal,template});
  if(change==='aliased-geometry')p.object.parts[0].mesh.geometry=geometry;
  if(change==='abort')f.controller.abort();else if(change==='recreated-source')f.state.structures[0]={...f.state.structures[0]};else if(change==='moved-source')f.state.structures[0].x+=1;
  if(change==='foreign-receipt'){assert.throws(()=>p.acceptNativeBarrierBinding({...proof,nativeIds:[0]}));assert(p.valid());}else{assert.equal(p.valid(),false);assert.throws(()=>p.acceptNativeBarrierBinding(proof));}
  p.cancel();for(const release of f.retired.splice(0))release();assert.equal(disposed,0);assert.equal(ruin.parts[0].mesh.geometry,geometry);assert(ruin.visible);assert.equal(p.object.parent,null);assert.equal(f.jobs.length,1);
 }finally{f.close();}
});

}
