import {build} from 'esbuild';
import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeIdleCycleGameFixture} from '../tests/helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from '../tests/helpers/native-production-authority.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {savedNativeAuthorityOptions,validateNativeAuthorityCheckpoint} from '../src/simulation/native-authority-checkpoint.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {rational} from '../src/simulation/money.js';
const wasm=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const session=(state,bootstrap)=>createSpatialGameSession(wasm,state,{loaded:()=>new Map(),onData(){},nativeBootstrap:bootstrap});
const capture=s=>({version:2,spatialState:s.core.snapshot(),wallOwners:s.captureWallOwners()});


// Same native Worker packaging as authority-worker-incremental-wire.test.js.
// Only URL loading and Worker transport are adapted for Node; authority is real.
async function restoreThroughWorker(options){
 const plugin={name:'native-wall-worker-inputs',setup(builder){
  builder.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm-url',namespace:'test-url'}));
  builder.onLoad({filter:/.*/,namespace:'test-url'},()=>({contents:'export default "wild-engine.wasm"',loader:'js'}));
 }};
 const bundle=await build({entryPoints:[resolve('src/simulation/simulation-authority-worker.js')],bundle:true,write:false,platform:'node',format:'iife',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});
 const wasmPath=resolve(process.env.QA_BARRIER_WASM??'src/world/wild-engine/spatial-savanna.wasm');
 const shim=`const {parentPort}=require('node:worker_threads');const {readFileSync}=require('node:fs');globalThis.self=globalThis;globalThis.crypto=require('node:crypto').webcrypto;globalThis.fetch=async()=>new Response(readFileSync(${JSON.stringify(wasmPath)}));globalThis.postMessage=value=>parentPort.postMessage(value);globalThis.close=()=>parentPort.close();\n${bundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`;
 const workerFactory=()=>{const thread=new Worker(shim,{eval:true}),wrapper={postMessage:(value,transfer)=>thread.postMessage(value,transfer),terminate:()=>thread.terminate()};thread.on('message',data=>wrapper.onmessage?.({data}));thread.on('error',error=>wrapper.onerror?.({message:error.message}));return wrapper;};
 return createSimulationAuthorityClient({...options,session:'wall-bootstrap-worker',nativeAuthorityCheckpoints:true,workerFactory});
}

function reordered(){
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false}),state=structuredClone(fixture.state);fixture.close();
 const wall=state.structures.find(w=>w.kind==='wall'&&!w.gate&&w.status==='intact');assert(wall);
 const saved={...wall};Object.assign(wall,{status:'ruined',hp:0});const s=session(state);
 Object.assign(wall,saved);s.syncState(state);return {s,state,wall,bootstrap:capture(s)};
}

test('explicit wall owners restore the appended identity and later retire only that owner',()=>{
 const f=reordered();let restored;
 try{
  const exact=structuredClone(f.bootstrap),oldId=f.s.wallBarrierIds(f.wall.id)[0];assert.equal(oldId,exact.spatialState.barriers.at(-1).id);
  restored=session(f.state,exact);assert.deepEqual(restored.core.snapshot(),exact.spatialState);assert.deepEqual(restored.captureWallOwners(),exact.wallOwners);assert.deepEqual(restored.wallBarrierIds(f.wall.id),[oldId]);
  const before=restored.core.snapshot();restored.syncState(f.state);assert.deepEqual(restored.core.snapshot(),before,'unchanged sync must not allocate');
  const removed=structuredClone(f.state);removed.structures.find(w=>w.id===f.wall.id).status='ruined';restored.syncState(removed);
  assert.deepEqual(restored.core.snapshot().barriers,before.barriers.filter(row=>row.id!==oldId));assert.equal(restored.core.snapshot().nextBarrierId,before.nextBarrierId);
  restored.syncState(f.state);assert.deepEqual(restored.wallBarrierIds(f.wall.id),[before.nextBarrierId]);
  assert.equal(restored.restoreBootstrap,undefined,'no hot restoration API');
 }finally{restored?.dispose();f.s.dispose();}
});

test('legacy exact reconstruction stays exact and unique legacy reordering restores every saved ID',()=>{
 const f=reordered();let restored,plain;
 try{
  const legacy={version:1,spatialState:f.bootstrap.spatialState};restored=session(f.state,legacy);assert.deepEqual(restored.core.snapshot(),legacy.spatialState);assert.deepEqual(restored.captureWallOwners(),f.bootstrap.wallOwners);
  plain=session(f.state);const exact={version:1,spatialState:plain.core.snapshot()},again=session(f.state,exact);try{assert.deepEqual(again.core.snapshot(),exact.spatialState);}finally{again.dispose();}
 }finally{plain?.dispose();restored?.dispose();f.s.dispose();}
});

test('bootstrap rejects missing, duplicated, swapped or unauthorized proxy identities and non-wall differences',()=>{
 const f=reordered();
 try{
  const mutations=[
   x=>x.wallOwners.pop(),
   x=>x.wallOwners.push(structuredClone(x.wallOwners[0])),
   x=>x.wallOwners[0].ids[0]=x.wallOwners[1].ids[0],
   x=>x.wallOwners[0].entityId='structure-999999999',
   x=>{const a=x.wallOwners[0],b=x.wallOwners[1];[a.ids,b.ids]=[b.ids,a.ids];},
   x=>x.spatialState.barriers[0].halfX+=.125,
   x=>x.spatialState.barriers[0].passMask^=1,
   x=>x.spatialState.seed++,
   x=>x.spatialState.polygons[0].points[0].x+=.125,
   x=>x.spatialState.nextBarrierId=1,
  ];
  for(const mutate of mutations){const bad=structuredClone(f.bootstrap);mutate(bad);assert.throws(()=>session(f.state,bad));assert.deepEqual(f.s.core.snapshot(),f.bootstrap.spatialState);}
  const badGame=structuredClone(f.state);badGame.structures.find(w=>w.id===f.wall.id).status='ruined';assert.throws(()=>session(badGame,f.bootstrap));
 }finally{f.s.dispose();}
});

test('legacy duplicate shapes cannot guess owners, but explicit v2 retains identical owners separately',()=>{
 const f=reordered();let source,restored;
 try{
  const state=structuredClone(f.state),wall=state.structures.find(w=>w.id===f.wall.id);state.structures.push({...wall,id:'structure-999999999'});
  source=session(state);const bootstrap=capture(source);
  // Force a different allocation order while preserving two identical shapes.
  const moved=state.structures.find(w=>w.id===f.wall.id);moved.status='ruined';source.syncState(state);moved.status='intact';source.syncState(state);
  const expected=capture(source);assert.notDeepEqual(expected.spatialState,bootstrap.spatialState);
  assert.throws(()=>session(state,{version:1,spatialState:expected.spatialState}),/Ambiguous legacy/);
  restored=session(state,expected);assert.deepEqual(restored.core.snapshot(),expected.spatialState);assert.deepEqual(restored.captureWallOwners(),expected.wallOwners);
 }finally{restored?.dispose();source?.dispose();f.s.dispose();}
});

test('gate proxy order and masks remain exact and a borrowed core cannot be bootstrapped',()=>{
 const f=reordered();let source,restored;
 try{
  const state=structuredClone(f.state),wall=state.structures.find(w=>w.id===f.wall.id);Object.assign(wall,{gate:true,material:'zarzas',yaw:0,baseScaleX:1});
  source=session(state);const expected=capture(source),owner=expected.wallOwners.find(r=>r.entityId===wall.id);assert.equal(owner.ids.length,3);
  restored=session(state,expected);assert.deepEqual(restored.wallBarrierIds(wall.id),owner.ids);
  const bad=structuredClone(expected),ids=bad.wallOwners.find(r=>r.entityId===wall.id).ids;[ids[0],ids[1]]=[ids[1],ids[0]];
  assert.throws(()=>session(state,bad),/mismatch/);
  assert.throws(()=>createSpatialGameSession(wasm,state,{core:source.core,loaded:()=>new Map(),onData(){},nativeBootstrap:expected}),/new unpublished core/);
  assert.deepEqual(source.core.snapshot(),expected.spatialState);
 }finally{restored?.dispose();source?.dispose();f.s.dispose();}
});

test('ordinary acquired Repair saves v2 inside its curve and cold authority verifies complete topology without another payment',async()=>{
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false}),state=structuredClone(fixture.state),wall=state.structures.find(w=>w.kind==='wall'&&w.status==='intact'&&!w.gate&&w.material==='zarzas');
 Object.assign(wall,fixture.point(1,4),{hp:0,status:'ruined',collapseRemaining:0});state.ledger.balance=rational(100000);let f,restored,worker;
 try{
  f=await nativeProductionAuthority(state,{chunkKeys:Array.from({length:12},(_,i)=>`${i%4-1},${Math.floor(i/4)-1}`)});await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));assert.equal(f.command({kind:'requestRepair',id:'bootstrap-repair',targetId:wall.id}).value,true);
  for(let i=0;i<350&&!f.records.some(r=>r.kind==='barrier-addition'&&r.committed);i++){f.advance();await f.present();}
  assert(f.records.some(r=>r.kind==='barrier-addition'&&r.committed),JSON.stringify(f.authority.nativeIntentProductionStatus()));f.advance(.1);await f.present();f.command({kind:'pause',reason:'tutorial-action'});
  const result=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}),saved=prepareWorkerCheckpoint(result,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});assert.equal(saved.saved,true);
  const cp=saved.state.workerNativeAuthorityCheckpoint;assert.equal(cp.version,2);validateNativeAuthorityCheckpoint(cp);
  const wallState=saved.state.structures.find(w=>w.id===wall.id),age=saved.state.elapsed-wallState.wallPresentation.at;assert(age>0&&age<.48,`curve age ${age}`);
  const options=savedNativeAuthorityOptions(JSON.stringify(saved.state));restored=createSimulationAuthority(wasm,options.snapshot,options.chunkKeys,options);assert.equal(restored.verifyNativeBootstrap(options.nativeBootstrap),true);
  const next=restored.execute({kind:'snapshot',sequence:1,nativeAuthorityCheckpoint:true});assert.deepEqual(next.nativeAuthorityCheckpoint.spatialState,cp.spatialState);assert.deepEqual(next.nativeAuthorityCheckpoint.wallOwners,cp.wallOwners);
  const projected=JSON.parse(next.snapshot);assert.deepEqual(projected.structures.find(w=>w.id===wall.id).wallPresentation,wallState.wallPresentation);assert.deepEqual(projected.ledger,saved.state.ledger);assert.equal(projected.elapsed,saved.state.elapsed);
  worker=await restoreThroughWorker(options);await worker.ready;
  const workerResult=await worker.submit({kind:'snapshot',nativeAuthorityCheckpoint:true}).result;
  assert.deepEqual(workerResult.nativeAuthorityCheckpoint.spatialState,cp.spatialState);assert.deepEqual(workerResult.nativeAuthorityCheckpoint.wallOwners,cp.wallOwners);
  const workerState=JSON.parse(workerResult.snapshot);assert.deepEqual(workerState.ledger,saved.state.ledger);assert.deepEqual(workerState.structures.find(w=>w.id===wall.id).wallPresentation,wallState.wallPresentation);assert.equal(workerState.elapsed,saved.state.elapsed);
  const bad=structuredClone(options.nativeBootstrap);bad.spatialState.barriers[0].id++;assert.throws(()=>restored.verifyNativeBootstrap(bad),/mismatch/);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{worker?.dispose();restored?.dispose();await f?.close();fixture.close();}
});
