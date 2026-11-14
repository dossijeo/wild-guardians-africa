import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

const candidate=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
test('rebuilt standalone engine preserves the existing export kinds and function arity',
 {skip:!candidate&&'Select a rebuilt spatial WASM'},()=>{
 const binaries=[new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url),candidate];
 const modules=binaries.map(path=>new WebAssembly.Module(readFileSync(path)));
 const imports={env:{emscripten_notify_memory_growth(){}}};
 const instances=modules.map(module=>new WebAssembly.Instance(module,imports).exports);
 const actualExports=new Map(WebAssembly.Module.exports(modules[1]).map(entry=>[entry.name,entry.kind]));
 for(const {name,kind} of WebAssembly.Module.exports(modules[0])){
  assert.equal(actualExports.get(name),kind,`export ${name}`);
  if(kind==='function')assert.equal(instances[1][name].length,instances[0][name].length,`arity of ${name}`);
 }
});
test('rebuilt standalone world preserves terrain and wall-route decisions',
 {skip:!candidate&&'Select a rebuilt spatial WASM'},()=>{
 const binaries=[new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url),candidate];
 const run=path=>{
  const module=new WebAssembly.Module(readFileSync(path)),results=[];
  for(const biome of ['savanna','mangrove','canyons']){
   const world=createSpatialWorld(module);world.generate(712,0,0,biome);
   const terrain=world.chunkPayload();
   world.setSettlement(0,0,7,6);world.buildNavigationProfile(0,1.1,false);
   const outside={x:12,z:0},inside={x:0,z:0};
   const before=world.connected(outside,inside);
   const walls=[[-6,0,.5,6],[6,0,.5,6],[0,-6,6.5,.5],[0,6,6.5,.5]]
    .map(([x,z,hx,hz])=>world.addWall(x,z,hx,hz));
   const sealed=world.connected(outside,inside),closedRoute=world.route(outside,inside);
   world.removeWall(walls[1]);
   results.push({terrain,before,walls,sealed,closedRoute,
    reopened:world.connected(outside,inside),route:world.route(outside,inside)});
  }
  return results;
 };
 assert.deepEqual(run(binaries[1]),run(binaries[0]));
});

test('rebuilt engine preserves confirmed state and events during a real raid',
 {skip:!candidate&&'Select a rebuilt spatial WASM'},async()=>{
 const baseline=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const rebuilt=new WebAssembly.Module(readFileSync(candidate));
 const opening=await createSpatialCampaignOpening({seed:716,biome:'sabana',culture:'suajili',slotId:'wasm-build-compat'});
 opening.state.time=400;opening.state.elapsed=400;opening.state.initialPreparation=false;
 opening.state.nightPlan={at:400,done:false,group:['warthog']};
 const snapshot=serialize(opening.state),keys=[...opening.loaded.keys()];
 const a=createSimulationAuthority(baseline,snapshot,keys),b=createSimulationAuthority(rebuilt,snapshot,keys);
 try{
  let sawRaid=false;
  for(let sequence=1;sequence<=30;sequence++){
   const command={kind:'advance',sequence,seconds:.05,nightFastForward:true};
   const expected=a.execute(command),actual=b.execute(command);
   assert.equal(actual.snapshot,expected.snapshot,`snapshot at command ${sequence}`);
   assert.deepEqual(actual.events,expected.events,`events at command ${sequence}`);
   sawRaid||=!!JSON.parse(actual.snapshot).raid?.animals?.length;
  }
  assert(sawRaid,'comparison reached a real raid');
 }finally{a.dispose();b.dispose();opening.session.dispose();}
});

test('a raid checkpoint can be restored across the versioned and rebuilt engines',
 {skip:!candidate&&'Select a rebuilt spatial WASM'},async()=>{
 const baseline=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const rebuilt=new WebAssembly.Module(readFileSync(candidate));
 const opening=await createSpatialCampaignOpening({seed:716,biome:'sabana',culture:'suajili',slotId:'wasm-build-checkpoint'});
 opening.state.time=400;opening.state.elapsed=400;opening.state.initialPreparation=false;
 opening.state.nightPlan={at:400,done:false,group:['warthog']};
 const snapshot=serialize(opening.state),keys=[...opening.loaded.keys()];
 const original=createSimulationAuthority(baseline,snapshot,keys),candidateRun=createSimulationAuthority(rebuilt,snapshot,keys);
 const restored=[];
 try{
  for(let sequence=1;sequence<=40;sequence++){
   const command={kind:'advance',sequence,seconds:.05,nightFastForward:true},expected=original.execute(command),actual=candidateRun.execute(command);
   assert.equal(actual.snapshot,expected.snapshot,`before save at command ${sequence}`);
   assert.deepEqual(actual.events,expected.events,`events before save at command ${sequence}`);
  }
  const saveCommand={kind:'snapshot',sequence:41,nativeAuthorityCheckpoint:true};
  const expectedSave=original.execute(saveCommand),actualSave=candidateRun.execute(saveCommand);
  assert.ok(JSON.parse(expectedSave.snapshot).raid?.animals?.length,'checkpoint includes an active raid');
  assert.equal(actualSave.snapshot,expectedSave.snapshot);
  assert.deepEqual(actualSave.raidWaitBindings,expectedSave.raidWaitBindings);
  assert.deepEqual(actualSave.nativeAuthorityCheckpoint,expectedSave.nativeAuthorityCheckpoint);
  // Restore the baseline checkpoint into both implementations and check the
  // reconstructed native world before allowing either to advance.
  for(const module of [baseline,rebuilt]){
   const checkpoint=expectedSave.nativeAuthorityCheckpoint;
   const authority=createSimulationAuthority(module,expectedSave.snapshot,checkpoint.chunkKeys,{raidWaitBindings:expectedSave.raidWaitBindings,navigationView:checkpoint.navigationView});
   restored.push(authority);assert.equal(authority.verifyNativeBootstrap(checkpoint),true);
  }
  for(let sequence=1;sequence<=40;sequence++){
   const command={kind:'advance',sequence,seconds:.05,nightFastForward:true},expected=restored[0].execute(command),actual=restored[1].execute(command);
   assert.equal(actual.snapshot,expected.snapshot,`after restore at command ${sequence}`);
   assert.deepEqual(actual.events,expected.events,`events after restore at command ${sequence}`);
   const uninterrupted=original.execute({...command,sequence:41+sequence});
   assert.equal(actual.snapshot,uninterrupted.snapshot,`restored state versus uninterrupted run at command ${sequence}`);
   assert.deepEqual(actual.events,uninterrupted.events,`restored events versus uninterrupted run at command ${sequence}`);
  }
 }finally{for(const authority of restored)authority.dispose();original.dispose();candidateRun.dispose();opening.session.dispose();}
});
