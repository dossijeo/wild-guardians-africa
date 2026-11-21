import test from 'node:test';
import assert from 'node:assert/strict';
import {pausedAuthorityQuiescent} from '../src/simulation/paused-authority-quiescence.js';
import {createWorkerGameRuntime} from '../src/simulation/worker-game-runtime.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {serialize} from '../src/persistence/snapshots.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,pump=turn){const end=Date.now()+8000;while(!predicate()){if(Date.now()>end)throw Error('Native paused publication fixture timed out');await pump();await turn();}}

test('a paused certificate requires explicit absence of asynchronous native ownership',()=>{
 const base={enabled:true,hasSnapshot:true,game:{pauses:['menu'],day:2},physics:null,trackMicroIncome:false,nav:{},resident:{missing:[]},terrainGeneration:3,reportedTerrainGeneration:3};
 assert.equal(pausedAuthorityQuiescent({...base,hasNativeProduction:false}),true);
 for(const hasNativeProduction of [true,null,{},1])assert.equal(pausedAuthorityQuiescent({...base,hasNativeProduction}),false);
});

test('a live native owner cannot certify quiet before ports attach or while its producer is held',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{attach:false,compactPausedAcks:true});
 try{let p=f.command({kind:'pause',reason:'menu'});for(const key of p.residency.missing)p=f.command({kind:'addChunk',key});
  p=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');assert.equal(p.pausedQuiescent,undefined);assert.equal(p.unchanged,undefined);
  const receipt=await f.authority.quiesceNativeIntentProduction();p=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');assert.equal(p.pausedQuiescent,undefined);assert.equal(p.unchanged,undefined);f.authority.resumeNativeIntentProduction(receipt);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

for(const [compactPausedAcks,captureClockSegments] of [[true,false],[true,true],[false,false]])test(`ordinary paused runtime publishes an asynchronous native commit without requesting another snapshot (compact=${compactPausedAcks},clockSegments=${captureClockSegments})`,async t=>{
 let release;const gate=new Promise(resolve=>{release=resolve;}),saved=nativeIdleStrollGameSave();
 const f=await nativeProductionAuthority(saved.state,{attach:false,compactPausedAcks,onReady:()=>gate}),visible=deserializeConfirmedState(serialize(saved.state)),receiver=createConfirmedStateReceiver(visible,'paused-native'),commands=[],publications=[],errors=[],timers=new Map();let now=0,timerId=0,closed=false;
 const client={ready:Promise.resolve(),submit(command){if(closed)throw Error('Fixture authority client closed');const request={...command};commands.push(request);return {accepted:true,result:Promise.resolve().then(()=>{const p=f.command(request);request.sequence=p.sequence;publications.push({sequence:p.sequence,kind:request.kind,certificate:p.pausedQuiescent===true,unchanged:p.unchanged===true,elapsed:p.elapsed,marker:p.snapshot?JSON.parse(p.snapshot).workers[0].nativeRouteAdmission:null});return {...p,session:'paused-native'};})};},dispose(){closed=true;f.authority.dispose();}};
 const runtime=createWorkerGameRuntime({client,world:{createConfirmedReceiver:()=>receiver},session:'paused-native',now:()=>now,schedule:fn=>{timers.set(++timerId,fn);return timerId;},cancel:id=>timers.delete(id),onError:e=>errors.push(String(e)),captureClockSegments});
 const idle=()=>!runtime.status().busy&&runtime.status().queued===0;
 async function tick(){assert.equal(timers.size,1);const [id,callback]=timers.entries().next().value;timers.delete(id);now+=50;callback();await until(idle);}
 try{
  await runtime.start();await runtime.submit({kind:'pause',reason:'menu'});await until(idle);const elapsed=visible.elapsed;
  assert.deepEqual(visible.pauses,['menu']);assert.equal(visible.workers[0].nativeRouteAdmission,'pending-stroll-resources');
  await f.authority.attachNativeIntentControl(f.controlPort,'production-control');await f.authority.attachNativeResourcePreparation(f.resourcePort,'production-resources');await until(()=>f.records[0]?.packet,()=>f.present());
  const holding=f.authority.quiesceNativeIntentProduction();holding.catch(()=>{});release();await until(()=>f.records[0].committed,()=>f.present());const receipt=await holding;await f.authority.flushNativeResourcePreparation();
  assert.equal(visible.workers[0].nativeRouteAdmission,'pending-stroll-resources','no publication was injected by preparation or its commit');const before=commands.length;
  await tick();await tick();await tick();
  t.diagnostic(JSON.stringify({compactPausedAcks,captureClockSegments,before,after:commands.length,publications,visibleMarker:visible.workers[0].nativeRouteAdmission}));
  assert.equal(visible.workers[0].nativeRouteAdmission,'native-idle-stroll');assert.equal(visible.elapsed,elapsed);assert.equal(runtime.status().pausedQuiescent,undefined);assert.deepEqual(commands.slice(before).map(c=>c.kind),['advance','advance','advance']);assert.equal(commands.filter(c=>c.kind==='snapshot').length,1);assert.deepEqual(commands.map(c=>c.sequence),commands.map((_,i)=>i+1));assert.equal(f.records[0].resources.bodyId,1);assert.equal(f.records.length,1);assert.deepEqual(errors,[]);assert.deepEqual(f.faults,[]);f.authority.resumeNativeIntentProduction(receipt);
 }finally{release();runtime.dispose();await f.close();}
});
