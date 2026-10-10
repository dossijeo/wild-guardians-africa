import test from 'node:test';
import assert from 'node:assert/strict';
import {observeRepairQueue,classifyRepairTransition,repairContinuationBoundary} from '../tools/horde-repair-continuation-observation.mjs';
test('Daylight boundary is a pending outcome, never completion or next-day permission',()=>{
 const s={day:21,time:299.75,pauses:[],result:null};assert.equal(repairContinuationBoundary(s).status,'pending');s.time=300;assert.equal(repairContinuationBoundary(s).status,'daylight-ended-repair-pending');s.time=300.25;assert.equal(repairContinuationBoundary(s).status,'incomplete');s.time=0;s.day=22;assert.equal(repairContinuationBoundary(s).status,'incomplete');s.day=21;s.pauses=['hiring'];assert.equal(repairContinuationBoundary(s).status,'blocking-pause');s.pauses=[];s.result='defeat';assert.equal(repairContinuationBoundary(s).status,'native-result');
});
test('FIFO rank uses created then ID and preserves state, sequence is not seconds',()=>{
 const s={day:21,time:299,elapsed:12000,raid:null,tasks:[{id:'z',created:100,kind:'initial'},{id:'repair',created:100,kind:'repair',centerId:'center',workerId:null},{id:'a',created:100,kind:'water'},{id:'older',created:99,kind:'harvest'}],workers:[{id:'w1',profile:'olderFemale',status:'idle',taskId:null,centerId:'center',contractDay:21},{id:'w2',profile:'olderFemale',status:'idle',taskId:null,centerId:'center',contractDay:20},{id:'w3',profile:'olderMale',status:'idle',taskId:null,centerId:'center',contractDay:21},{id:'w4',profile:'olderFemale',status:'acting',taskId:'older',centerId:'center',contractDay:21}]};
 const before=JSON.stringify(s),r=observeRepairQueue(s,'repair');assert.equal(r.fifoRank,2);assert.deepEqual(r.precedingKinds,{harvest:1,water:1});assert.equal(r.task.createdSequence,100);assert.equal(r.availability.expired,1);assert.equal(r.availability.shiftEnded,1);assert.equal(r.availability.reservationCandidatesBeforeRoute,1);assert.equal(JSON.stringify(s),before);
 s.time=300;assert.equal(observeRepairQueue(s,'repair').availability.reservationCandidatesBeforeRoute,0);
});
test('Missing task is not completion and unrelated receipt cannot establish it',()=>{
 const before={taskExists:true},after={taskExists:false},unrelated={id:'e1',type:'RepairApplied',repair:{taskId:'another',paidCoins:50}};
 assert.equal(classifyRepairTransition('r',before,after,[]).status,'disappeared-unexplained');assert.equal(classifyRepairTransition('r',before,after,[unrelated]).status,'disappeared-unexplained');assert.equal(classifyRepairTransition('r',{taskExists:false},after,[]).status,'incomplete');
});
test('Only matching native repair receipt denotes completion, conflict/duplicates reject',()=>{
 const e={id:'paid',type:'RepairApplied',repair:{taskId:'r',paymentId:'repair:r',paidCoins:174}},copy=JSON.stringify(e);assert.equal(classifyRepairTransition('r',{taskExists:true},{taskExists:false},[e]).status,'completed');assert.equal(classifyRepairTransition('r',{taskExists:true},{taskExists:true},[e]).status,'incomplete');assert.equal(classifyRepairTransition('r',{taskExists:true},{taskExists:false},[e,e]).status,'incomplete');assert.equal(JSON.stringify(e),copy);
});
test('Native raid onset plus actual disappearance is distinct from paid completion',()=>{
 const event={id:'raid-event',type:'RaidSpawned',raidId:'native-raid'};const r=classifyRepairTransition('r',{taskExists:true},{taskExists:false},[event]);assert.equal(r.status,'removed-at-native-raid-onset');assert.deepEqual(r.eventIds,['raid-event']);assert.equal(r.raidId,'native-raid');assert.equal(r.repair,undefined);assert.equal(classifyRepairTransition('r',{taskExists:true},{taskExists:true},[event]).status,'pending');
});
