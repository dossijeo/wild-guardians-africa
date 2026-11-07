import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';

const message=(cx,slot)=>{const instances=Array.from({length:20},()=>[]);instances[slot].push({id:'a'});return {payload:{cx,cz:0,instances},revision:1,sequence:1,epoch:'e'};};
test('terrain adapter loads only demanded slots and passes paired identities to the coordinator',async()=>{
 const calls=[],scene=new Scene(),signal=new AbortController().signal,token=kind=>({participant(){return {kind};},abort(){calls.push('abort '+kind);}});let order=0;const result={commit(){},abort(){}};
 const value=await prepareWebGpuTemporalTerrain([message(0,2),message(1,3)],{scene,signal,suppressed:[],validateInstances(){},publicationEpoch:epoch=>'wire:'+epoch,publicationOrder:()=>++order,residency:{prepareRevision(payload,revision,epoch,options){calls.push(['terrain',payload.cx,revision,epoch,options]);return token('terrain');}},biome:{ready:Promise.resolve(true),async requestSlots(slots){calls.push(['slots',slots]);},prepareRevision(payload,revision,metadata,options){calls.push(['biome',payload.cx,revision,metadata,options]);return token('biome');}},coordinator:{async prepareBatch(parts,options){calls.push(['batch',parts,options]);return result;}}});
 assert.equal(value,result);assert.deepEqual(calls[0],['slots',[2,3]]);assert.equal(calls[1][4].publicationOrder,calls[2][4].publicationOrder);assert.equal(calls[3][4].publicationOrder,calls[4][4].publicationOrder);assert.equal(calls[1][4].publicationEpoch,'wire:e');assert.equal(calls[5][1].length,4);assert.equal(calls[5][2].scene,scene);assert.equal(calls[5][2].signal,signal);
});
test('a failed second owner aborts all previously prepared revisions',async()=>{
 const aborted=[],make=id=>({participant(){return {};},abort(){aborted.push(id);}});let n=0;await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(1,0)],{scene:new Scene(),suppressed:[],validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>++n,residency:{prepareRevision(payload){return make('terrain'+payload.cx);}},biome:{ready:Promise.resolve(true),requestSlots:async()=>{},prepareRevision(payload){return payload.cx?null:make('biome0');}},coordinator:{prepareBatch(){throw Error('must not submit');}}}),/unavailable/);assert.deepEqual(aborted,['terrain1','biome0','terrain0']);
});
test('duplicate chunks and aborted resource preparation never reach coordinator',async()=>{
 const controller=new AbortController(),calls=[],options={scene:new Scene(),suppressed:[],signal:controller.signal,validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>1,residency:{prepareRevision(){calls.push('terrain');}},biome:{ready:Promise.resolve(true),async requestSlots(){controller.abort();},prepareRevision(){}},coordinator:{prepareBatch(){calls.push('batch');}}};await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(0,1)],options),/boundary/);await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0)],options),{name:'AbortError'});assert.deepEqual(calls,[]);
});
test('prepared mud joins the terrain participant and is released on stale terrain',async()=>{
 let disposed=0,received;const geometry={dispose(){disposed++;}},options={scene:new Scene(),suppressed:[],validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>1,mudPreparer:{async prepare(){return geometry;}},residency:{prepareRevision(_p,_r,_e,value){received=value.mudGeometry;return null;}},biome:{ready:Promise.resolve(true),async requestSlots(){},prepareRevision(){}},coordinator:{prepareBatch(){throw Error('must not submit');}}};await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0)],options),/stale/);assert.equal(received,geometry);assert.equal(disposed,1);
});

test('identity observer receives exact source payload and distinct publication orders across reuse',async()=>{
 const first=message(0,2),second=message(1,3),seen=[],orders=[],token={participant(){return {};},abort(){}},result={commit(){},abort(){}};let order=0;
 const options={scene:new Scene(),suppressed:[],validateInstances(){},publicationEpoch:epoch=>'render:'+epoch,publicationOrder:()=>++order,onPreparedIdentity(payload,identity){seen.push({payload,identity});},residency:{prepareRevision(_payload,_revision,_epoch,opts){orders.push(opts.publicationOrder);return token;}},biome:{ready:Promise.resolve(true),async requestSlots(){},prepareRevision(){return token;}},coordinator:{async prepareBatch(){return result;}}};
 await prepareWebGpuTemporalTerrain([first,second],options);await prepareWebGpuTemporalTerrain([first],options);
 assert.equal(seen[0].payload,first.payload);assert.equal(seen[1].payload,second.payload);assert.equal(seen[2].payload,first.payload);assert.deepEqual(seen.map(x=>x.identity),[{key:'0,0',epoch:'e',revision:1,sequence:1,publicationOrder:1},{key:'1,0',epoch:'e',revision:1,sequence:1,publicationOrder:2},{key:'0,0',epoch:'e',revision:1,sequence:1,publicationOrder:3}]);assert.deepEqual(orders,[1,2,3]);
});

test('identity observer failure aborts earlier participants and never prepares its failed chunk',async()=>{
 const aborted=[],prepared=[],token=id=>({participant(){return {};},abort(){aborted.push(id);}});let order=0;
 const options={scene:new Scene(),suppressed:[],validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>++order,onPreparedIdentity(payload){if(payload.cx===1)throw Error('identity failed');},residency:{prepareRevision(payload){prepared.push('terrain'+payload.cx);return token('terrain'+payload.cx);}},biome:{ready:Promise.resolve(true),async requestSlots(){},prepareRevision(payload){prepared.push('biome'+payload.cx);return token('biome'+payload.cx);}},coordinator:{prepareBatch(){throw Error('must not submit');}}};
 await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(1,0)],options),/identity failed/);assert.deepEqual(prepared,['terrain0','biome0']);assert.deepEqual(aborted,['biome0','terrain0']);
});

test('cancellation after identity observation aborts prepared owners and prevents later identities',async()=>{
 const controller=new AbortController(),seen=[],aborted=[],token=id=>({participant(){return {};},abort(){aborted.push(id);}});let order=0;
 const options={scene:new Scene(),signal:controller.signal,suppressed:[],validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>++order,onPreparedIdentity(payload){seen.push(payload.cx);},residency:{prepareRevision(payload){return token('terrain'+payload.cx);}},biome:{ready:Promise.resolve(true),async requestSlots(){},prepareRevision(payload){controller.abort();return token('biome'+payload.cx);}},coordinator:{prepareBatch(){throw Error('must not submit');}}};
 await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(1,0)],options),{name:'AbortError'});assert.deepEqual(seen,[0]);assert.deepEqual(aborted,['biome0','terrain0']);
});
