import test from 'node:test';
import assert from 'node:assert/strict';
import {repairActivity} from '../tools/area12-repair-activity.mjs';
test('repair activity is credited at request only after paid HP restore; autonomous duration never becomes actions',()=>{
 const decisions=[{actions:1,centerRepairRequests:1,reason:'active',daylightSeconds:1},{actions:0,reason:'budget',daylightSeconds:60}],requests=[{taskId:'t',decisionIndex:0}];
 const none=repairActivity(decisions,requests,[]);assert.equal(none.unoccupiedSeconds,61);assert.equal(none.creditedPaidRestoringRequests,0);
 const complete=repairActivity(decisions,requests,[{taskId:'t',paidCoins:1,previousHp:90,restoredHp:100}]);assert.equal(complete.unoccupiedSeconds,60);assert.equal(complete.creditedPaidRestoringRequests,1);
 const zero=repairActivity(decisions,requests,[{taskId:'t',paidCoins:0,previousHp:90,restoredHp:100},{taskId:'other',paidCoins:5,previousHp:100,restoredHp:100}]);assert.equal(zero.unoccupiedSeconds,61);
 assert.deepEqual(decisions[0],{actions:1,centerRepairRequests:1,reason:'active',daylightSeconds:1});
});
test('wall request omitted from raw actions can be credited after its native paid restore',()=>{
 const r=repairActivity([{actions:0,reason:'budget',daylightSeconds:1}],[{taskId:'wall',decisionIndex:0}],[{taskId:'wall',paidCoins:1,previousHp:50,restoredHp:100}]);assert.equal(r.unoccupiedSeconds,0);
});
