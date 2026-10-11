import test from 'node:test';
import assert from 'node:assert/strict';
import {nightEntryReady,nightEntryUnhit} from '../tools/capture-native-night-entry.mjs';
test('capture distinguishes the requested night from daytime and other incursions',()=>{
 for(const s of [{day:13,raid:{id:'raid-13-night'}},{day:14,raid:{id:'raid-14-day'}},{day:14,raid:null}])assert.equal(nightEntryReady(s,14),false);
 assert.equal(nightEntryReady({day:14,raid:{id:'raid-14-night'}},14),true);
});
test('fresh native null attack IDs are valid but started, applied and empty attacks are rejected',()=>{
 const state=animals=>({day:14,raid:{id:'raid-14-night',animals}});
 assert.equal(nightEntryUnhit(state([{attackId:null,hitApplied:false}]),14),true);
 for(const actors of [[],[{attackId:'attack-1',hitApplied:false}],[{attackId:null,hitApplied:true}]])assert.equal(nightEntryUnhit(state(actors),14),false);
});
