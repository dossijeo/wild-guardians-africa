import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';

const message=(cx,slot)=>{const instances=Array.from({length:20},()=>[]);instances[slot].push({id:'a'});return {payload:{cx,cz:0,instances},revision:1,sequence:1,epoch:'e'};};
test('terrain adapter loads only demanded slots and passes paired identities to the coordinator',async()=>{
 const calls=[],scene=new Scene(),signal=new AbortController().signal,token=kind=>({participant(){return {kind};},abort(){calls.push('abort '+kind);}});let order=0;const result={commit(){},abort(){}};
 const value=await prepareWebGpuTemporalTerrain([message(0,2),message(1,3)],{scene,signal,validateInstances(){},publicationEpoch:epoch=>'wire:'+epoch,publicationOrder:()=>++order,residency:{prepareRevision(payload,revision,epoch,options){calls.push(['terrain',payload.cx,revision,epoch,options]);return token('terrain');}},biome:{ready:Promise.resolve(true),async requestSlots(slots){calls.push(['slots',slots]);},prepareRevision(payload,revision,metadata,options){calls.push(['biome',payload.cx,revision,metadata,options]);return token('biome');}},coordinator:{async prepareBatch(parts,options){calls.push(['batch',parts,options]);return result;}}});
 assert.equal(value,result);assert.deepEqual(calls[0],['slots',[2,3]]);assert.equal(calls[1][4].publicationOrder,calls[2][4].publicationOrder);assert.equal(calls[3][4].publicationOrder,calls[4][4].publicationOrder);assert.equal(calls[1][4].publicationEpoch,'wire:e');assert.equal(calls[5][1].length,4);assert.equal(calls[5][2].scene,scene);assert.equal(calls[5][2].signal,signal);
});
test('a failed second owner aborts all previously prepared revisions',async()=>{
 const aborted=[],make=id=>({participant(){return {};},abort(){aborted.push(id);}});let n=0;await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(1,0)],{scene:new Scene(),validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>++n,residency:{prepareRevision(payload){return make('terrain'+payload.cx);}},biome:{ready:Promise.resolve(true),requestSlots:async()=>{},prepareRevision(payload){return payload.cx?null:make('biome0');}},coordinator:{prepareBatch(){throw Error('must not submit');}}}),/unavailable/);assert.deepEqual(aborted,['terrain1','biome0','terrain0']);
});
test('duplicate chunks and aborted resource preparation never reach coordinator',async()=>{
 const controller=new AbortController(),calls=[],options={scene:new Scene(),signal:controller.signal,validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>1,residency:{prepareRevision(){calls.push('terrain');}},biome:{ready:Promise.resolve(true),async requestSlots(){controller.abort();},prepareRevision(){}},coordinator:{prepareBatch(){calls.push('batch');}}};await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(0,1)],options),/boundary/);await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0)],options),{name:'AbortError'});assert.deepEqual(calls,[]);
});
