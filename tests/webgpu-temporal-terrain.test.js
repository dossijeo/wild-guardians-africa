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

function identityOptions({onPreparedIdentity,onDiscardIdentity,prepareBatch,signal}={}){
 let next=0;const token={participant(){return {};},abort(){}};
 return {scene:new Scene(),suppressed:[],signal,validateInstances(){},publicationEpoch:epoch=>epoch,publicationOrder:()=>++next,onPreparedIdentity,onDiscardIdentity,residency:{prepareRevision(){return token;}},biome:{ready:Promise.resolve(true),async requestSlots(){},prepareRevision(){return token;}},coordinator:{prepareBatch}};
}

test('discard identifies only the aborted generation when the same payload is prepared twice',async()=>{
 const input=message(0,0),prepared=[],discarded=[],batches=[],options=identityOptions({onPreparedIdentity:(payload,id)=>prepared.push({payload,id}),onDiscardIdentity:(payload,id)=>discarded.push({payload,id}),prepareBatch:async()=>{const batch={aborts:0,abort(){this.aborts++;return true;},commit(){return true;}};batches.push(batch);return batch;}});
 const a=await prepareWebGpuTemporalTerrain([input],options),b=await prepareWebGpuTemporalTerrain([input],options);assert.notEqual(prepared[0].id,prepared[1].id);assert.equal(a.abort(),true);assert.equal(a.abort(),false);assert.deepEqual(discarded,[prepared[0]]);assert.equal(discarded[0].id,prepared[0].id);assert.equal(b.commit(),true);assert.equal(b.abort(),false);assert.deepEqual(discarded,[prepared[0]]);assert.equal(batches[0].aborts,1);assert.equal(batches[1].aborts,0);
});

test('a preparation failure discards identities in reverse order, including a partially failing observer',async()=>{
 const prepared=[],discarded=[],errors=[],options=identityOptions({onPreparedIdentity:(payload,id)=>{prepared.push({payload,id});if(payload.cx===1)throw Error('partial registration');},onDiscardIdentity:(payload,id)=>{discarded.push({payload,id});if(payload.cx===1)throw Error('cleanup failed');},prepareBatch:async()=>{throw Error('must not submit');}});
 await assert.rejects(prepareWebGpuTemporalTerrain([message(0,0),message(1,0)],options),/partial registration/);assert.deepEqual(discarded,[prepared[1],prepared[0]]);assert.equal(discarded[0].id,prepared[1].id);
});

test('aborting after preparation notifies discard once and does not discard committed identities',async()=>{
 const controller=new AbortController(),prepared=[],discarded=[];let aborts=0;const options=identityOptions({signal:controller.signal,onPreparedIdentity:(payload,id)=>prepared.push({payload,id}),onDiscardIdentity:(payload,id)=>discarded.push({payload,id}),prepareBatch:async()=>({abort(){aborts++;return true;},commit(){return true;}})}),handle=await prepareWebGpuTemporalTerrain([message(0,0)],options);controller.abort();assert.equal(aborts,1);assert.deepEqual(discarded,prepared);assert.equal(handle.abort(),false);assert.throws(()=>handle.commit(),/no longer active/);
 const nextController=new AbortController(),next=await prepareWebGpuTemporalTerrain([message(1,0)],{...options,signal:nextController.signal});assert.equal(next.commit(),true);nextController.abort();assert.equal(aborts,1);assert.equal(discarded.length,1);
});

test('commit failure and rejected preparation release identity reservations',async()=>{
 const prepared=[],discarded=[];let aborts=0;const options=identityOptions({onPreparedIdentity:(payload,id)=>prepared.push({payload,id}),onDiscardIdentity:(payload,id)=>discarded.push({payload,id}),prepareBatch:async()=>({abort(){aborts++;return true;},commit(){throw Error('rollback');}})}),handle=await prepareWebGpuTemporalTerrain([message(0,0)],options);assert.throws(()=>handle.commit(),/rollback/);assert.equal(aborts,1);assert.deepEqual(discarded,prepared);assert.equal(handle.abort(),false);
 const refused={...options,prepareBatch:null,coordinator:{async prepareBatch(){throw Error('reservation refused');}}};await assert.rejects(prepareWebGpuTemporalTerrain([message(1,0)],refused),/reservation refused/);assert.equal(discarded.length,2);assert.equal(discarded[1].id,prepared[1].id);
});

test('reentrant abort during a committed notification preserves the reservation',async()=>{
 const controller=new AbortController(),prepared=[],discarded=[];let aborts=0;const options=identityOptions({signal:controller.signal,onPreparedIdentity:(payload,id)=>prepared.push({payload,id}),onDiscardIdentity:(payload,id)=>discarded.push({payload,id}),prepareBatch:async()=>({abort(){aborts++;return false;},commit(){controller.abort();return true;}})}),handle=await prepareWebGpuTemporalTerrain([message(0,0)],options);
 assert.equal(handle.commit(),true);assert.equal(aborts,1);assert.equal(discarded.length,0);assert.equal(handle.abort(),false);assert.equal(prepared.length,1);
});

test('reentrant abort before a failed commit discards once after rollback',async()=>{
 const controller=new AbortController(),prepared=[],discarded=[];let aborts=0;const options=identityOptions({signal:controller.signal,onPreparedIdentity:(payload,id)=>prepared.push({payload,id}),onDiscardIdentity:(payload,id)=>discarded.push({payload,id}),prepareBatch:async()=>({abort(){aborts++;return true;},commit(){controller.abort();throw Error('rolled back');}})}),handle=await prepareWebGpuTemporalTerrain([message(0,0)],options);
 assert.throws(()=>handle.commit(),/rolled back/);assert.deepEqual(discarded,prepared);assert.equal(aborts,2);assert.equal(handle.abort(),false);
});

test('a commit returning false discards its identity exactly once',async()=>{
 const prepared=[],discarded=[],options=identityOptions({onPreparedIdentity:(payload,id)=>prepared.push({payload,id}),onDiscardIdentity:(payload,id)=>discarded.push({payload,id}),prepareBatch:async()=>({abort(){return true;},commit(){return false;}})}),handle=await prepareWebGpuTemporalTerrain([message(0,0)],options);assert.equal(handle.commit(),false);assert.deepEqual(discarded,prepared);assert.equal(handle.abort(),false);
});

test('real terrain and biome commit keeps identity when cancellation arrives from a committed publication',async()=>{
 const THREE=await import('three'),{readFile}=await import('node:fs/promises'),{readFileSync}=await import('node:fs'),{createSpatialWorld}=await import('../src/world/wild-engine/spatial-world.js'),{createChunkPublicationCoordinator}=await import('../src/rendering/webgpu-chunk-publication.js'),{createWebGpuTerrainResidency}=await import('../src/rendering/webgpu-terrain-residency.js'),{createWebGpuBiomeProps}=await import('../src/rendering/webgpu-biome-props.js');
 const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),native=createSpatialWorld(wasm);native.generate(712,0,0,'savanna');const payload=native.chunkPayload();payload.instances=Array.from({length:20},()=>[]);
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),controller=new AbortController(),prepared=[],discarded=[],published=[],admission={async prepareManyAndPublish(){throw Error('unexpected one-sided publication');},async prepareTicket(){return {valid:()=>true,validAfterAttach:()=>true};},prepare(){},deferRelease(_object,release){release();}},coordinator=createChunkPublicationCoordinator({admission}),terrain=createWebGpuTerrainResidency({scene,material,waterMaterial:material,pipelineAdmission:admission,coordinator,onPublished(key,identity){published.push({key,identity});controller.abort();}}),pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8')),biome=createWebGpuBiomeProps({scene,state:{biome:'sabana',suppressed:[]},biomePack:pack,initialSlots:[],pipelineAdmission:admission,coordinator,byteLoader:async url=>{const bytes=await readFile(new URL('../public'+url,import.meta.url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},imageLoader:async()=>({close(){}})});
 try{const batch=await prepareWebGpuTemporalTerrain([{payload,sequence:2,revision:1,epoch:'e'}],{signal:controller.signal,scene,residency:terrain,biome,coordinator,publicationEpoch:epoch=>'visual:'+epoch,publicationOrder:()=>1,validateInstances(){},suppressed:[],onPreparedIdentity:(value,id)=>prepared.push({value,id}),onDiscardIdentity:(value,id)=>discarded.push({value,id})});assert.equal(batch.commit(),true);assert.equal(controller.signal.aborted,true);assert.equal(terrain.revisionAt(0,0).revision,1);assert.equal(published.length,1);assert.equal(published[0].identity.publicationOrder,prepared[0].id.publicationOrder);assert.deepEqual(discarded,[]);assert.equal(batch.abort(),false);}finally{biome.dispose();terrain.dispose();coordinator.dispose();material.dispose();}
});
