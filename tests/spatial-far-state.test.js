import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {captureSpatialFarState,restoreSpatialFarState,validateSpatialFarState} from '../src/world/wild-engine/spatial-far-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

const module=new WebAssembly.Module(readFileSync(process.env.WILD_ENGINE_FAR_VISUAL_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const available=WebAssembly.Module.exports(module).some(entry=>entry.name==='spatial_far_query_chunk');
const slots=Array.from({length:20},(_,i)=>i);
function assertSameQueries(authority,replica,label){
 for(const [cx,cz] of [[0,0],[1,0],[-3,2],[2,2]])assert.deepEqual(
  replica.queryFarVisualChunk(cx,cz,{slots}).instances,
  authority.queryFarVisualChunk(cx,cz,{slots}).instances,`${label} ${cx},${cz}`);
}

test('compact far replica matches all biome variants, resident and nonresident chunks', {skip:!available},()=>{
 const cases=[['savanna',{}],['desert',{}],['grand_river',{}],['volcanoes',{}],['canyons',{}],['mangrove',{}],['mangrove',{mangroveChannels:true}],['mangrove',{mangroveNetwork:true}]];
 for(const [biome,options] of cases){
  const authority=createSpatialWorld(module),replica=createSpatialWorld(module);
  authority.generate(712,0,0,biome,options);authority.addChunk(1,0);authority.selectChunk(0,0);
  authority.addBarrier(2,2,1,1,0);authority.buildNavigation(.28,true);
  const before=authority.snapshot(),resident=authority.captureResidentChunks(),selected=authority.currentChunk(),revision=authority.farVisualRevision();
  const captured=captureSpatialFarState(authority);
  assert.equal(captured.revision,revision);assert.equal('barriers' in captured,false);assert.equal('polygons' in captured,false);
  assert.equal(restoreSpatialFarState(replica,captured),revision);
  assertSameQueries(authority,replica,biome+JSON.stringify(options));
  assert.deepEqual(authority.snapshot(),before);assert.deepEqual(authority.captureResidentChunks(),resident);assert.deepEqual(authority.currentChunk(),selected);assert.equal(authority.farVisualRevision(),revision);
 }
});

test('fresh snapshots preserve removals and settlements; replacements clear old derived state', {skip:!available},()=>{
 const authority=createSpatialWorld(module),replica=createSpatialWorld(module);authority.generate(123,0,0,'mangrove',{mangroveNetwork:true});authority.addChunk(1,0);
 const first=captureSpatialFarState(authority);restoreSpatialFarState(replica,first);
 let removed=null;
 for(const [cx,cz] of [[0,0],[1,0],[-3,2],[2,2]]){removed=authority.queryFarVisualChunk(cx,cz,{slots}).instances.flat().find(Boolean);if(removed)break;}
 assert.ok(removed);const [,group,gx,gz]=removed.id.split(':');assert.equal(authority.removeProp({group:+group,gx:+gx,gz:+gz}),1);
 authority.applySettlements([{x:96,z:96,hx:10,hz:8,waterFalloff:2}]);
 const next=captureSpatialFarState(authority);assert.ok(next.revision>first.revision);assert.equal(next.removedProps.length,1);assert.equal(next.terrain.version,2);assert.equal(next.terrain.settlements[0].waterFalloff,2);restoreSpatialFarState(replica,next);assertSameQueries(authority,replica,'modified');
 assert.equal(first.removedProps.length,0);assert.equal(first.terrain.settlements.length,0);
 authority.generate(991,0,0,'savanna');restoreSpatialFarState(replica,captureSpatialFarState(authority));assertSameQueries(authority,replica,'new seed');assert.equal(replica.snapshot().removedProps.length,0);
});

test('far snapshot validation rejects malformed data before touching the replica',()=>{
 const good={version:1,revision:4,terrain:{version:1,seed:123,biome:'savanna',settlements:[]},removedProps:[]};
 assert.equal(validateSpatialFarState(good),good);
 for(const bad of [{...good,revision:0},{...good,version:2},{...good,terrain:{...good.terrain,seed:-1}},{...good,removedProps:[{group:7,gx:1,gz:1}]},{...good,removedProps:[{group:0,gx:1,gz:1},{group:0,gx:1,gz:1}]}]){
  let calls=0;assert.throws(()=>restoreSpatialFarState({restoreState(){calls++;}},bad),TypeError);assert.equal(calls,0);
 }
});

test('compact replicas preserve real raid visual output and authoritative simulation results', {skip:!available},()=>{
 for(const fixture of ['sabana712-d6-native-multi-reservation.json.gz','manglares-123-d10-raid-state.json.gz']){
  const snapshot=gunzipSync(readFileSync(new URL('./fixtures/'+fixture,import.meta.url))).toString();
  const authority=createSimulationAuthority(module,snapshot,['0,0','1,0']),control=createSimulationAuthority(module,snapshot,['0,0','1,0']),replica=createSpatialWorld(module);
  try{
   const captured=authority.captureFarVisualState();restoreSpatialFarState(replica,captured.snapshot);
   for(let cz=-4;cz<=4;cz++)for(let cx=-4;cx<=4;cx++){
    const expected=authority.queryFarVisualChunk({cx,cz,slots,expectedSequence:0,expectedRevision:captured.revision});
    assert.deepEqual(replica.queryFarVisualChunk(cx,cz,{slots}).instances,expected.instances,`${fixture} ${cx},${cz}`);
   }
   const command={kind:'snapshot',sequence:1},actual=authority.execute(command),expected=control.execute(command);
   assert.equal(actual.snapshot,expected.snapshot);assert.deepEqual(actual.events,expected.events);assert.deepEqual(actual.residency,expected.residency);
   const after=authority.captureFarVisualState();assert.equal(after.sequence,1);assert.equal(after.elapsed,actual.elapsed);assert.equal(after.revision,after.snapshot.revision);assert.deepEqual(after.snapshot,captured.snapshot);
   if(fixture.startsWith('sabana')){
    const advance={kind:'advance',sequence:2,seconds:.001,nightFastForward:false},advanced=authority.execute(advance),baseline=control.execute(advance),current=authority.captureFarVisualState();
    assert.equal(advanced.snapshot,baseline.snapshot);assert.deepEqual(advanced.events,baseline.events);assert.equal(current.sequence,2);assert.equal(current.elapsed,advanced.elapsed);assert.ok(current.elapsed>after.elapsed);assert.equal(current.revision,current.snapshot.revision);
   }
  }finally{authority.dispose();control.dispose();}
 }
});

test('far revision covers procedural input mutations but ignores pure navigation and residency', {skip:!available},()=>{
 const core=createSpatialWorld(module);core.generate(712,0,0,'savanna');
 const changed=fn=>{const before=core.farVisualRevision();fn();assert.ok(core.farVisualRevision()>before);};
 const unchanged=fn=>{const before=core.farVisualRevision();fn();assert.equal(core.farVisualRevision(),before);};
 unchanged(()=>{core.addChunk(1,0);core.removeChunk(1,0);core.addBarrier(2,2,1,1,0);core.addPolygon([{x:5,z:5},{x:8,z:5},{x:8,z:8}]);});
 changed(()=>core.addSettlement(96,96,10,8));
 changed(()=>core.setSettlement(48,48,10,8));
 changed(()=>core.applySettlements([{x:48,z:48,hx:10,hz:8,waterFalloff:2}],{replace:true}));
 changed(()=>core.applySettlements([],{replace:true}));
 unchanged(()=>core.applySettlements([],{replace:true}));
 const item=core.queryFarVisualChunk(0,0,{slots}).instances.flat().find(Boolean);assert.ok(item);const [,group,gx,gz]=item.id.split(':');
 changed(()=>assert.equal(core.removeProp({group:+group,gx:+gx,gz:+gz}),1));
 unchanged(()=>assert.equal(core.removeProp({group:+group,gx:+gx,gz:+gz}),0));
 const removed=captureSpatialFarState(core).removedProps;
 unchanged(()=>core.restoreRemovedProps(removed));
 changed(()=>core.restoreRemovedProps([]));
 changed(()=>core.restoreRemovedProps(removed));
 changed(()=>core.generate(123,0,0,'mangrove',{mangroveNetwork:true}));
});
