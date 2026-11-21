import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';

for(const paused of [true,false])for(const first of ['advance','view'])test(`actual native admission is an atomic source boundary before ordinary motion observations resume (paused=${paused}, first=${first})`,async()=>{
 const state=nativeIdleStrollGameSave().state;state.pauses=paused?['native-admission-boundary']:[];const f=await nativeProductionAuthority(state,{attach:false,observeWorldMotion:true,compactViewAcks:true,compactPausedAcks:true});
 try{
  const before=f.command({kind:'snapshot'}),old=JSON.parse(before.snapshot);await f.authority.attachNativeIntentControl(f.controlPort,'production-control');await f.authority.attachNativeResourcePreparation(f.resourcePort,'production-resources');
  const end=Date.now()+8000;while(f.authority.nativeIntentProductionStatus().last?.status!=='committed'){if(f.faults.length)throw Error(f.faults.join('\n'));if(Date.now()>end)throw Error('Native admission did not complete');await f.present();}
  assert.equal(f.records[0].kind,'idle-stroll');
  const advance=()=>f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false,captureClockSegments:true}),view=()=>f.command({kind:'setNavigationView',view:{bounds:[-24,-24,24,24],eye:{x:0,z:0},target:{x:0,z:0}}}),publication=first==='advance'?advance():view();assert.equal(publication.unchanged,undefined);const current=JSON.parse(publication.snapshot);
  assert.equal(current.workers[0].nativeRouteAdmission,'native-idle-stroll');assert.equal(Object.hasOwn(publication,'worldMotionTrace'),false,'cannot certify an interval that started after an unpublished native admission');assert.equal(Object.hasOwn(publication,'motionTrace'),false);assert.equal(f.authority.nativeIntentProductionStatus().last.publicationSequence,before.sequence);if(first==='advance')assert(publication.clockSegments);assert.doesNotThrow(()=>validateConfirmedMotion(publication,current,old.elapsed,old));
  const next=advance(),after=JSON.parse(next.snapshot);assert(next.worldMotionTrace);assert.equal(Object.hasOwn(next,'nativeWorldResources'),false);assert.doesNotThrow(()=>validateConfirmedMotion(next,after,current.elapsed,current));assert.equal(paused?after.elapsed===old.elapsed:after.elapsed>old.elapsed,true);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});
