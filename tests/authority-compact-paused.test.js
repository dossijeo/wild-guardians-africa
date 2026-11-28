import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('compact paused advances preserve authority and ordered receiver state',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'paused-compact'}),snapshot=serialize(opening.state),keys=[...opening.loaded.keys()];
 const a=createSimulationAuthority(module,snapshot,keys),b=createSimulationAuthority(module,snapshot,keys,{compactPausedAcks:true}),visible=deserializeConfirmedState(snapshot),receiver=createConfirmedStateReceiver(visible,'s');let seq=0,fullBytes=0,compactBytes=0;
 try{
  function step(command,compact=false){const x=a.execute({...command,sequence:++seq}),y=b.execute({...command,sequence:seq});assert.deepEqual(y.events,x.events);assert.equal(y.elapsed,x.elapsed);assert.deepEqual(y.pauses,x.pauses);assert.equal(y.terrainChanged,x.terrainChanged);assert.equal(y.unchanged===true,compact);fullBytes+=(x.snapshot?.length??0)*2;compactBytes+=(y.snapshot?.length??0)*2;if(compact){assert.equal(y.pausedAdvance,true);assert.deepEqual(receiver.acceptUnchanged({...y,session:'s'}),{accepted:true,sequence:seq});}else{assert.equal(y.snapshot,x.snapshot);assert.deepEqual(receiver.accept({...y,session:'s'}),{accepted:true,sequence:seq});}return y;}
  step({kind:'snapshot'});step({kind:'pause',reason:'menu'});const base=step({kind:'microIncome',enabled:true}),journal=createPresentationRecoveryJournal();journal.begin(seq);journal.confirm(seq);
  for(let i=0;i<205;i++){const result=step({kind:'advance',seconds:.05,steps:2,nightFastForward:true},true);journal.append(result,true,{backgroundView:true});}
  const replay=journal.snapshot().entries;assert.equal(replay.length,1);const restored=deserializeConfirmedState(base.snapshot),recovery=createConfirmedStateReceiver(restored,'s',{initialSequence:base.sequence});assert.equal(recovery.acceptUnchanged({...replay[0].publication,session:'s'},{firstSequence:replay[0].firstSequence}).accepted,true);assert.equal(recovery.status().sequence,seq);
  step({kind:'snapshot'});step({kind:'resume',reason:'menu'});step({kind:'advance',seconds:.05,nightFastForward:true});step({kind:'snapshot'});
  assert.ok(compactBytes<fullBytes/4);assert.equal(receiver.status().sequence,seq);
 }finally{a.dispose();b.dispose();opening.session.dispose();}
});

test('motion tracking keeps paused advances on the full snapshot path',async()=>{
 const opening=await createSpatialCampaignOpening({seed:713,biome:'sabana',culture:'suajili',slotId:'paused-track'}),a=createSimulationAuthority(module,serialize(opening.state),[...opening.loaded.keys()],{compactPausedAcks:true});
 try{a.execute({kind:'snapshot',sequence:1});a.execute({kind:'pause',reason:'menu',sequence:2});a.execute({kind:'trackPathMotion',actorId:null,world:true,sequence:3});const result=a.execute({kind:'advance',seconds:.05,nightFastForward:true,sequence:4});assert.equal(result.unchanged,undefined);assert.equal(typeof result.snapshot,'string');assert.ok(result.worldMotionTrace);}
 finally{a.dispose();opening.session.dispose();}
});

test('authority certifies a paused world with motion tracking without changing the snapshot',async()=>{const opening=await createSpatialCampaignOpening({seed:715,biome:'sabana',culture:'suajili',slotId:'paused-certificate'}),snapshot=serialize(opening.state),keys=[...opening.loaded.keys()],a=createSimulationAuthority(module,snapshot,keys,{compactPausedAcks:true,observeWorldMotion:true}),b=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true});try{for(const command of [{kind:'snapshot',sequence:1},{kind:'pause',reason:'menu',sequence:2},{kind:'advance',seconds:.05,nightFastForward:true,captureClockSegments:true,sequence:3}]){const x=a.execute(command),y=b.execute(command);assert.equal(x.snapshot,y.snapshot);assert.deepEqual(x.events,y.events);assert.equal(x.pausedQuiescent,command.sequence>1?true:undefined);assert.equal(y.pausedQuiescent,undefined);}}finally{a.dispose();b.dispose();opening.session.dispose();}});

test('paused advances preserve explicit visual checkpoints and recovery renewal',async()=>{
 const opening=await createSpatialCampaignOpening({seed:714,biome:'sabana',culture:'suajili',slotId:'paused-checkpoint'}),keys=[...opening.loaded.keys()],a=createSimulationAuthority(module,serialize(opening.state),keys,{compactPausedAcks:true});
 try{
  a.execute({kind:'snapshot',sequence:1});a.execute({kind:'pause',reason:'menu',sequence:2});
  for(const [sequence,recoveryOnly] of [[3,false],[4,true]]){
   const result=a.execute({kind:'advance',seconds:.05,nightFastForward:true,sequence,visualTerrain:true,...(recoveryOnly?{visualRecoveryOnly:true}:{})});
   assert.equal(result.unchanged,undefined);assert.equal(typeof result.snapshot,'string');assert.equal(result.terrainCheckpoint.sequence,sequence);assert.equal(result.terrainCheckpoint.recoveryOnly,recoveryOnly?true:undefined);assert.deepEqual(result.terrainCheckpoint.chunks.map(c=>`${c.cx},${c.cz}`),keys);
  }
  const quiet=a.execute({kind:'advance',seconds:.05,nightFastForward:true,sequence:5});assert.equal(quiet.pausedAdvance,true);
 }finally{a.dispose();opening.session.dispose();}
});
