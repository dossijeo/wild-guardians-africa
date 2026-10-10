import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewArea12Report} from '../tools/review-area12-report.mjs';

test('retained review counts owned walls by state without counting centres or unrelated walls',()=>{
 const report={defense:{built:{ids:['a','b','c','d']},currentOwnedOperational:0,currentOwnedRuined:4},observedActivity:{unoccupiedFraction:.12},meaningfulObservedActivity:{unoccupiedFraction:.27,creditedPaidRestoringRequests:1},raidFacts:[{type:'StructureHit'}]};
 const state={completedNights:6,result:null,structures:[{id:'a',kind:'wall',status:'intact'},{id:'b',kind:'wall',status:'ruined'},{id:'c',kind:'wall',status:'collapsing'},{id:'d',kind:'center',status:'intact'},{id:'unowned',kind:'wall',status:'intact'}]};
 const original=JSON.stringify({report,state}),result=reviewArea12Report(report,state);
 assert.equal(result.ownedWallCount,3);assert.equal(result.ownedIntactWalls,1);assert.equal(result.ownedRuinedWalls,1);
 assert.equal(result.meaningfulActivityBelow25,false);assert.equal(result.rawUnoccupiedFraction,.12);assert.equal(result.paidRestoringRepairOrders,1);
 assert.equal(result.diagnosticWarnings.length,2);assert.equal(JSON.stringify({report,state}),original);
});
test('missing meaningful evidence stays unknown rather than accepting raw idle time',()=>{
 const result=reviewArea12Report({observedActivity:{unoccupiedFraction:.01}}, {structures:[]});
 assert.equal(result.meaningfulActivityBelow25,null);assert.equal(result.meaningfulUnoccupiedFraction,null);assert.equal(result.diagnosticWarnings.length,1);
});
test('the accepted activity threshold remains strictly below 25 percent',()=>{
 for(const [fraction,expected] of [[.2033,true],[.2499,true],[.25,false],[.26,false],[NaN,null]]){
  assert.equal(reviewArea12Report({meaningfulObservedActivity:{unoccupiedFraction:fraction}}, {structures:[]}).meaningfulActivityBelow25,expected);
 }
});
