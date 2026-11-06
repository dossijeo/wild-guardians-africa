import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';

function fixture(){
 const calls=[],errors=[];let valid=true;const admission={prepareManyAndPublish(){throw Error('unexpected');},async prepareTicket(){return {valid:()=>valid};}},coordinator=createChunkPublicationCoordinator({admission,onError:error=>errors.push(error.message)});
 function part(key,side,extra={}){const controller=new AbortController(),name=key+':'+side;return {key,side,epoch:'e',revision:1,publicationOrder:1,object:new Group(),signal:controller.signal,activate(){calls.push('activate '+name);return true;},attach(){calls.push('attach '+name);},rollback(){calls.push('rollback '+name);},finalize(){calls.push('finalize '+name);return {retire:()=>calls.push('retire '+name),notify:()=>calls.push('notify '+name)};},rollbackFinalized(){calls.push('undo '+name);},cancel(){calls.push('cancel '+name);},...extra};}
 return {coordinator,calls,errors,part,invalidate(){valid=false;}};
}
test('batch prepares all chunks before ordered publication and notifications',async()=>{
 const f=fixture(),parts=['0,0','1,0'].flatMap(key=>['terrain','biome'].map(side=>f.part(key,side))),batch=await f.coordinator.prepareBatch(parts);assert.deepEqual(f.calls,[]);assert.equal(batch.commit(),true);assert.deepEqual(f.calls.map(call=>call.split(' ')[0]),['activate','activate','activate','activate','attach','attach','attach','attach','finalize','finalize','finalize','finalize','retire','retire','retire','retire','notify','notify','notify','notify']);assert.deepEqual(f.errors,[]);f.coordinator.dispose();
});
test('batch rolls back all finalizations and attachments before cancelling on failure',async()=>{
 const f=fixture(),parts=['0,0','1,0'].flatMap(key=>['terrain','biome'].map(side=>f.part(key,side)));parts[3].finalize=()=>{f.calls.push('failed finalize');throw Error('failed');};const batch=await f.coordinator.prepareBatch(parts);assert.throws(()=>batch.commit(),/failed/);assert.equal(f.calls.some(call=>call.startsWith('notify')),false);assert.deepEqual(f.calls.filter(call=>call.startsWith('undo ')),['undo 1,0:biome','undo 1,0:terrain','undo 0,0:biome','undo 0,0:terrain']);assert.deepEqual(f.calls.filter(call=>call.startsWith('rollback ')),['rollback 1,0:biome','rollback 1,0:terrain','rollback 0,0:biome','rollback 0,0:terrain']);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,4);f.coordinator.dispose();
});
test('newer offer cancels a prepared batch without publishing it',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),batch=await f.coordinator.prepareBatch(parts),next=f.part('0,0','terrain',{revision:2,publicationOrder:2,onError(){}});f.coordinator.offer(next);assert.throws(()=>batch.commit(),/stale/);assert.deepEqual(f.calls,['cancel 0,0:biome','cancel 0,0:terrain']);f.coordinator.dispose();
});
test('stale admission tickets cancel all participants before activation',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),batch=await f.coordinator.prepareBatch(parts);f.invalidate();assert.throws(()=>batch.commit(),/stale/);assert.deepEqual(f.calls,['cancel 0,0:biome','cancel 0,0:terrain']);f.coordinator.dispose();
});
test('a ticket invalidated during attachment rolls back before notifications',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side));parts[0].attach=()=>{f.calls.push('attach terrain');f.invalidate();};const batch=await f.coordinator.prepareBatch(parts);assert.throws(()=>batch.commit(),/stale/);assert.ok(f.calls.includes('rollback 0,0:terrain'));assert.equal(f.calls.some(call=>call.startsWith('notify')),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,2);f.coordinator.dispose();
});
