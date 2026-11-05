import test from 'node:test';
import assert from 'node:assert/strict';
import {canRestoreWorkerOnly,createWorkerNavigationProjection} from '../src/app/worker-navigation-projection.js';
import {WILD_ENGINE_WORLD_VERSION} from '../src/world/wild-engine/world-version.js';

const view=()=>({bounds:[-10,-10,10,10],eye:{x:2,z:3},target:{x:4,z:5}});
test('worker navigation projection holds only camera demand, not spatial authority',()=>{
 const source=view(),nav=createWorkerNavigationProjection(source);source.bounds[0]=999;source.eye.x=999;assert.equal(nav.activeBounds[0],-10);assert.equal(nav.raidView.eye.x,2);assert.equal(nav.field,null);assert.equal(nav.workerProjection,true);assert.equal(nav.path,undefined);
 nav.setActiveBounds([0,1,2,3]);nav.setRaidView({x:5,z:6},{x:7,z:8});assert.deepEqual(nav.raidView,{eye:{x:5,z:6},target:{x:7,z:8}});assert.throws(()=>nav.setRaidView({x:NaN,z:0},{x:0,z:0}),/Invalid/);
});
test('worker-only restore requires a native checkpoint, confirmed camera terrain and complete saved village data',()=>{
 const state={wildEngineWorldVersion:WILD_ENGINE_WORLD_VERSION,workerNativeAuthorityCheckpoint:{navigationView:view()},villages:[{entry:{x:1,z:1},buildings:[{kind:'Casa',footprint:[{}, {}, {}]}]}]},flags={loaded:true,earlyNative:true,earlyGpu:true,noWebgl:true,cameraTerrain:true};
 assert.equal(canRestoreWorkerOnly(state,flags),true);for(const key of Object.keys(flags))assert.equal(canRestoreWorkerOnly(state,{...flags,[key]:false}),false,key);
 assert.equal(canRestoreWorkerOnly({...state,wildEngineWorldVersion:-1},flags),false);assert.equal(canRestoreWorkerOnly({...state,villages:[{buildings:[]}]},flags),false);assert.equal(canRestoreWorkerOnly({...state,villages:[{entry:{},buildings:[{kind:'Casa'}]}]},flags),false);
 const incomplete={...state,villages:[{entry:{},buildings:[{kind:'Casa'}]}]};assert.equal(canRestoreWorkerOnly(incomplete,{...flags,allowFootprintRepair:true}),true);assert.equal(canRestoreWorkerOnly({...state,villages:[{entry:{},buildings:[{kind:'Casa',footprint:[]}]}]},{...flags,allowFootprintRepair:true}),false);
});
