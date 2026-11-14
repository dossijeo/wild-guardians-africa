import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Scene} from 'three';
import {deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {prepareWebGpuTemporalCheckpoint} from '../src/rendering/webgpu-temporal-terrain.js';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';

function fixture({result=true}={}){
 const state=deserialize(gunzipSync(readFileSync(new URL('./fixtures/manglares-123-d10-raid-state.json.gz',import.meta.url))).toString());state.suppressed=[];
 const boundary={version:1,authorityEpoch:'native/1',nativeSession:1,ticket:2,effectiveTime:state.elapsed-1},payload={authority:'spatial-wasm',cx:0,cz:0,instances:Array.from({length:20},()=>[]),
  terrain:{positions:new Float32Array(49*49*3),colors:new Float32Array(49*49*3),indices:new Uint16Array(48*48*6)}},
  message={session:'s',sequence:1,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),terrainCheckpoint:{sequence:1,chunks:[payload],nativeWorldBoundary:boundary,terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]}}};
 let aborted=0,commits=0;const token={participant:()=>({}),abort(){}},options={session:'s',scene:new Scene(),residency:{size:0,prepareRevision:()=>token},
  biome:{status:()=>({chunks:0}),ready:Promise.resolve(true),requestSlots:async()=>{},prepareRevision:()=>token},coordinator:{async prepareBatch(){return {commit(){commits++;return result;},abort(){aborted++;return true;}};}},
  publicationEpoch:e=>e,publicationOrder:()=>1,validateInstances(){}};
 return {state,payload,boundary,message,options,get commits(){return commits;},get aborted(){return aborted;}};
}

test('a native checkpoint exposes its immutable world identity only after explicit prepared admission',async()=>{
 const f=fixture(),prepared=await prepareWebGpuTemporalCheckpoint(f.message,f.options);
 assert.equal(prepared.nativeWorldBoundary,null);assert.equal(f.commits,0);assert.equal(prepared.commit(),true);assert.deepEqual(prepared.nativeWorldBoundary,f.boundary);assert(Object.isFrozen(prepared.nativeWorldBoundary));
 f.boundary.ticket=99;assert.equal(prepared.nativeWorldBoundary.ticket,2);assert.equal(prepared.abort(),false);assert.equal(f.aborted,0);
});

test('cancelled and refused checkpoints cannot lend their native identity to a frame',async()=>{
 const f=fixture(),cancelled=await prepareWebGpuTemporalCheckpoint(f.message,f.options);cancelled.abort();assert.equal(cancelled.nativeWorldBoundary,null);assert.equal(f.commits,0);assert.equal(f.aborted,1);
 for(const result of [false,null]){const refused=fixture({result}),prepared=await prepareWebGpuTemporalCheckpoint(refused.message,refused.options);assert.equal(prepared.commit(),result);assert.equal(prepared.nativeWorldBoundary,null);assert.equal(refused.aborted,1);}
});

test('a changed or malformed checkpoint identity aborts preparation instead of retagging resources',async()=>{
 for(const change of [{ticket:3},{authorityEpoch:'foreign'},{version:2}]){
  const f=fixture(),prepared=await prepareWebGpuTemporalCheckpoint(f.message,f.options);Object.assign(f.boundary,change);
  assert.throws(()=>prepared.commit(),/stale|Invalid native world/);assert.equal(f.commits,0);assert.equal(f.aborted,1);assert.equal(prepared.nativeWorldBoundary,null);
 }
});

test('a native checkpoint rejects a world from the future and canonical props hidden by a stale JS suppression view',async()=>{
 const future=fixture();future.boundary.effectiveTime=future.state.elapsed+1;await assert.rejects(prepareWebGpuTemporalCheckpoint(future.message,future.options),/ahead/);assert.equal(future.commits,0);
 const hidden=fixture();hidden.state.suppressed=['tree'];hidden.payload.instances[0].push({id:'tree'});hidden.message.snapshot=serializeConfirmedState(hidden.state);
 await assert.rejects(prepareWebGpuTemporalCheckpoint(hidden.message,hidden.options),/hides canonical props/);assert.equal(hidden.commits,0);
});

test('legacy checkpoints preserve their existing suppression behavior and do not manufacture native identity',async()=>{
 const f=fixture();delete f.message.terrainCheckpoint.nativeWorldBoundary;f.state.suppressed=['tree'];f.payload.instances[0].push({id:'tree'});f.message.snapshot=serializeConfirmedState(f.state);
 const prepared=await prepareWebGpuTemporalCheckpoint(f.message,f.options);assert.equal(prepared.commit(),true);assert.equal(prepared.nativeWorldBoundary,null);
});

test('the recovery journal preserves the authority checkpoint identity without aliasing later publications',()=>{
 const f=fixture(),journal=createPresentationRecoveryJournal();try{
  journal.begin(1);journal.confirm(1);f.message.sequence=2;f.message.terrainCheckpoint.sequence=2;journal.append(f.message,false);const result=journal.snapshot();assert.deepEqual(result.entries[0].publication.terrainCheckpoint.nativeWorldBoundary,f.boundary);
  f.boundary.ticket=99;assert.equal(journal.snapshot().entries[0].publication.terrainCheckpoint.nativeWorldBoundary.ticket,2);
 }finally{journal.dispose();}
});
