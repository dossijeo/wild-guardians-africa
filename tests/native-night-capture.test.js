import test from 'node:test';
import assert from 'node:assert/strict';
import {nightEntryReady,nightEntryUnhit,nightFramePending} from '../tools/capture-native-night-entry.mjs';
import {simulateNativeCampaign} from '../tools/native-campaign-runner.mjs';
import {deserialize} from '../src/persistence/snapshots.js';
test('capture distinguishes the requested night from daytime and other incursions',()=>{
 for(const s of [{day:13,raid:{id:'raid-13-night'}},{day:14,raid:{id:'raid-14-day'}},{day:14,raid:null}])assert.equal(nightEntryReady(s,14),false);
 assert.equal(nightEntryReady({day:14,raid:{id:'raid-14-night'}},14),true);
});
test('capture the unchanged frame spanning spawn instead of observing five seconds too late',()=>{
 const s={day:14,time:415,raid:null,nightPlan:{night:14,at:415.2433377825655}};
 assert.equal(nightFramePending(s,14,5),true);
 assert.equal(nightFramePending(s,14,.1),false);
 for(const change of [{day:13},{time:295},{time:600},{raid:{id:'raid-14-day'}},{nightPlan:{night:13,at:415.24}},{nightPlan:{night:14,at:NaN}}])
  assert.equal(nightFramePending({...s,...change},14,5),false);
});
test('native before-tick observer retains actual pre-update clock and no completed daily row',async()=>{
 let observed;
 const stop=Error('native observer placement test');stop.code='NATIVE_CALIBRATION_STOP';
 await assert.rejects(simulateNativeCampaign({days:1,seed:712,biome:'sabana',culture:'mapungubwe',strategy:'good',
  onBeforeTick:s=>{observed={elapsed:s.elapsed,time:s.time};throw stop;}}),error=>{
   assert.equal(error,stop);const state=deserialize(error.nativeCampaignPartial.state);
   assert.equal(state.elapsed,observed.elapsed);assert.equal(state.time,observed.time);
   assert.equal(state.time,0);assert.equal(state.raid,null);
   assert.equal(error.nativeCampaignPartial.receipts.daily.length,0);return true;
  });
});
test('fresh native null attack IDs are valid but started, applied and empty attacks are rejected',()=>{
 const state=animals=>({day:14,raid:{id:'raid-14-night',animals}});
 assert.equal(nightEntryUnhit(state([{attackId:null,hitApplied:false}]),14),true);
 for(const actors of [[],[{attackId:'attack-1',hitApplied:false}],[{attackId:null,hitApplied:true}]])assert.equal(nightEntryUnhit(state(actors),14),false);
});
