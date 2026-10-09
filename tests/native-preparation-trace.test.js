import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BufferGeometry,BufferAttribute,MeshBasicMaterial,Vector4} from 'three';
import {observeNativePreparation,beginNativePreparationTrace,nativePreparationTraceStage,withNativePreparationDrawTrace,endNativePreparationTrace,nativePreparationDrawScope,observeNativePreparationDraw} from '../tools/experiments/native-preparation-trace.js';

function fixture(){
 const events=[],root=new Group(),geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(9),3));geometry.setIndex([0,1,2]);
 const material=new MeshBasicMaterial(),seam=new Mesh(geometry,material);seam.userData.farGroundSeam=true;root.add(seam);
 let propertyReads=0;const renderer={properties:{get(value){assert.equal(value,material);propertyReads++;return {currentProgram:{id:17,cacheKey:'actual-selected-program'}};}},getViewport:v=>v.copy(new Vector4(0,0,0,0)),getScissor:v=>v.copy(new Vector4(0,0,0,0)),getScissorTest:()=>true,getRenderTarget:()=>null,autoClear:false,outputColorSpace:'srgb',toneMapping:0,shadowMap:{enabled:true,autoUpdate:false,needsUpdate:false}};
 const observer=observeNativePreparation(renderer,event=>events.push(event));
 return {events,root,seam,material,geometry,renderer,observer,reads:()=>propertyReads,draw:()=>observeNativePreparationDraw(renderer,seam,material,geometry,5),dispose(){observer.dispose();geometry.dispose();material.dispose();}};
}

test('absent observer touches neither root nor renderer resource properties',()=>{
 const renderer={},hostile=new Proxy({},{get(){throw Error('Unexpected inspection');}});
 assert.equal(beginNativePreparationTrace(renderer,hostile,0),null);assert.equal(nativePreparationDrawScope(renderer),null);observeNativePreparationDraw(renderer,hostile,hostile,hostile);
});
test('draw marker is synchronous, nested-safe and restored even when draw throws',async()=>{
 const h=fixture(),a=beginNativePreparationTrace(h.renderer,h.root,3),b=beginNativePreparationTrace(h.renderer,h.seam,3);
 withNativePreparationDrawTrace(a,()=>{assert.equal(nativePreparationDrawScope(h.renderer).id,a.request.id);assert.throws(()=>withNativePreparationDrawTrace(b,()=>{assert.equal(nativePreparationDrawScope(h.renderer).id,b.request.id);throw Error('draw fault');}),/draw fault/);assert.equal(nativePreparationDrawScope(h.renderer).id,a.request.id);});
 assert.equal(nativePreparationDrawScope(h.renderer),null);
 await withNativePreparationDrawTrace(a,async()=>{await Promise.resolve();assert.equal(nativePreparationDrawScope(h.renderer),null);});
 endNativePreparationTrace(a);endNativePreparationTrace(b);h.dispose();
});
test('first ordinary seam draw links exact owned request, status, program and version identities once',()=>{
 const h=fixture(),request=beginNativePreparationTrace(h.renderer,h.root,5);
 withNativePreparationDrawTrace(request,()=>{h.draw();h.draw();});assert.equal(h.reads(),1);nativePreparationTraceStage(request,'ready');endNativePreparationTrace(request);h.draw();h.draw();assert.equal(h.reads(),2);
 const warm=h.events.find(e=>e.phase==='prepared-object'),ordinary=h.events.find(e=>e.phase==='ordinary-object');
 assert.equal(warm.request.id,ordinary.request.id);assert.equal(warm.request.status,'pending');assert.equal(ordinary.request.status,'ready');assert.equal(ordinary.object.uuid,h.seam.uuid);assert.equal(ordinary.request.epoch,5);assert.equal(ordinary.observedEpoch,5);assert.deepEqual(warm.resource,ordinary.resource);assert.equal(warm.resource.position.bytes,36);assert.deepEqual(ordinary.program,{id:17,cacheKey:'actual-selected-program'});assert.deepEqual(ordinary.output.viewport,[0,0,0,0]);assert.equal(ordinary.ownership,'previous-observed-owned-request');
 const second=beginNativePreparationTrace(h.renderer,h.root,5);h.geometry.attributes.position.needsUpdate=true;withNativePreparationDrawTrace(second,h.draw);nativePreparationTraceStage(second,'ready');endNativePreparationTrace(second);h.draw();
 const next=h.events.filter(e=>e.phase==='ordinary-object').at(-1);assert.notEqual(next.request.id,ordinary.request.id);assert.equal(next.resource.position.version,1);assert.equal(next.resource.uuid,ordinary.resource.uuid);h.dispose();
});
test('collateral seam draws do not create a false owned request or repeat ordinary witness',()=>{
 const h=fixture(),unrelated=new Group(),other=beginNativePreparationTrace(h.renderer,unrelated,0);withNativePreparationDrawTrace(other,h.draw);h.draw();assert.equal(h.events.some(e=>e.phase==='ordinary-object'),false);
 const owned=beginNativePreparationTrace(h.renderer,h.root,0);withNativePreparationDrawTrace(owned,h.draw);nativePreparationTraceStage(owned,'ready');endNativePreparationTrace(owned);h.draw();
 withNativePreparationDrawTrace(other,h.draw);h.draw();assert.equal(h.events.filter(e=>e.phase==='ordinary-object').length,1);endNativePreparationTrace(other);h.dispose();
});
test('closed subscription cannot resurrect scope or deliver late events into a new owner',()=>{
 const h=fixture(),old=beginNativePreparationTrace(h.renderer,h.root,0),newEvents=[];let fresh;
 withNativePreparationDrawTrace(old,()=>{h.observer.dispose();assert.equal(nativePreparationDrawScope(h.renderer),null);fresh=observeNativePreparation(h.renderer,e=>newEvents.push(e));});
 nativePreparationTraceStage(old,'ready');h.observer.dispose();assert.equal(newEvents.length,0);assert.equal(nativePreparationDrawScope(h.renderer),null);
 const request=beginNativePreparationTrace(h.renderer,h.root,1);withNativePreparationDrawTrace(request,h.draw);nativePreparationTraceStage(request,'cancelled',{reason:'context-changed'});endNativePreparationTrace(request);assert.equal(newEvents.at(-1).request.status,'cancelled');assert.equal(newEvents.at(-1).request.epoch,1);fresh.dispose();h.dispose();
});
test('observer failures are explicit diagnostics and do not change draw or readiness execution',()=>{
 const renderer={},observer=observeNativePreparation(renderer,()=>{throw Error('observer failed');}),request=beginNativePreparationTrace(renderer,new Group(),0);let draws=0;
 withNativePreparationDrawTrace(request,()=>draws++);nativePreparationTraceStage(request,'ready');assert.equal(draws,1);assert.equal(request.request.status,'ready');assert.equal(nativePreparationDrawScope(renderer),null);assert.equal(observer.errors.length,4);endNativePreparationTrace(request);observer.dispose();
});
